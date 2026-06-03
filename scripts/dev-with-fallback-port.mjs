import net from "node:net";
import { spawn } from "node:child_process";
import { access, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const webDir = resolve(repoRoot, "apps/web");
const turbopackCacheDirs = [
  resolve(webDir, ".next/cache/turbopack"),
  resolve(webDir, ".next/dev/cache/turbopack"),
];
const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next", { paths: [webDir] });
const preferredHost = process.env.DEV_HOST ?? "localhost";
const strictPort = process.env.DEV_STRICT_PORT === "1";
const requestedBundler = process.env.DEV_BUNDLER?.toLowerCase();

if (requestedBundler === "webpack") {
  console.error("[dev] Webpack is disabled in this repository. Use the default Turbopack flow.");
  process.exit(1);
}

function parsePortArgs(argv) {
  const passthrough = [];
  let preferredPort = Number(process.env.PORT ?? 3000);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "-p" || arg === "--port") {
      const nextValue = argv[index + 1];
      if (nextValue && /^\d+$/.test(nextValue)) {
        preferredPort = Number(nextValue);
        index += 1;
      }
      continue;
    }

    if (arg.startsWith("--port=")) {
      const value = Number(arg.split("=", 2)[1]);
      if (Number.isFinite(value) && value > 0) {
        preferredPort = value;
      }
      continue;
    }

    if (arg === "--webpack") {
      console.error("[dev] Webpack is disabled in this repository. Remove --webpack and use Turbopack.");
      process.exit(1);
    }

    if (arg === "--turbopack" || arg === "--turbo") {
      continue;
    }

    passthrough.push(arg);
  }

  return { preferredPort, passthrough };
}

function isPortFree(port) {
  return new Promise((resolveResult) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolveResult(false));
    server.listen({ port, host: preferredHost }, () => {
      server.close(() => resolveResult(true));
    });
  });
}

async function clearTurbopackCache() {
  let clearedAny = false;

  for (const cacheDir of turbopackCacheDirs) {
    try {
      await access(cacheDir);
    } catch {
      continue;
    }

    await rm(cacheDir, { recursive: true, force: true });
    clearedAny = true;
  }

  if (clearedAny) {
    console.log("[dev] Turbopack cache purged for a clean start.");
  }
}

const { preferredPort, passthrough } = parsePortArgs(process.argv.slice(2));
let forwardedSignal = null;

if (process.env.DEV_CLEAR_TURBOPACK_CACHE === "1") {
  await clearTurbopackCache();
}

if (strictPort && !(await isPortFree(preferredPort))) {
  console.error(
    `[dev] Le port ${preferredPort} est déjà utilisé. Arrête l'ancien serveur ou lance 'npm run dev:clean'. Pour forcer un échec au lieu d'un port de secours, utilise 'npm run dev:strict'.`,
  );
  process.exit(1);
}

let chosenPort = preferredPort;
if (!strictPort) {
  for (; chosenPort < preferredPort + 20; chosenPort += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(chosenPort)) {
      break;
    }
  }
}

if (!strictPort && chosenPort >= preferredPort + 20) {
  console.error(
    `[dev] Aucun port libre trouvé à partir de ${preferredPort}. Libère un port ou lance avec PORT=XXXX.`,
  );
  process.exit(1);
}

if (!strictPort && chosenPort !== preferredPort) {
  console.warn(
    [
      `[dev] Le port ${preferredPort} est occupé.`,
      `[dev] Démarrage sur http://${preferredHost}:${chosenPort} au lieu de ${preferredPort}.`,
      `[dev] Si tu veux empêcher toute bascule automatique, lance 'npm run dev:strict'.`,
      `[dev] Si tu veux libérer le port, arrête l'ancien serveur ou lance 'npm run dev:clean'.`,
    ].join("\n"),
  );
}

console.log(`[dev] Next.js démarre sur http://${preferredHost}:${chosenPort}`);

const child = spawn(
  process.execPath,
  [nextBin, "dev", "-H", preferredHost, "-p", String(chosenPort), "--turbopack", ...passthrough],
  {
    cwd: webDir,
    env: {
      ...process.env,
      HOSTNAME: preferredHost,
      PORT: String(chosenPort),
    },
    stdio: "inherit",
  },
);

function forwardSignal(signal) {
  forwardedSignal = signal;
  child.kill(signal);
}

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    const signalExitCode = signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 1;
    process.exit(forwardedSignal ? signalExitCode : 1);
    return;
  }

  process.exit(code ?? 0);
});
