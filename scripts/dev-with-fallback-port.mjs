import net from "node:net";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const webDir = resolve(repoRoot, "apps/web");
const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next", { paths: [webDir] });
const preferredHost = process.env.DEV_HOST ?? "localhost";

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

const { preferredPort, passthrough } = parsePortArgs(process.argv.slice(2));

let chosenPort = preferredPort;
for (; chosenPort < preferredPort + 20; chosenPort += 1) {
  // eslint-disable-next-line no-await-in-loop
  if (await isPortFree(chosenPort)) {
    break;
  }
}

if (chosenPort >= preferredPort + 20) {
  console.error(
    `[dev] Aucun port libre trouvé à partir de ${preferredPort}. Libère un port ou lance avec PORT=XXXX.`,
  );
  process.exit(1);
}

console.log(`[dev] Next.js démarre sur http://${preferredHost}:${chosenPort}`);

const child = spawn(
  process.execPath,
  [nextBin, "dev", "-H", preferredHost, "-p", String(chosenPort), ...passthrough],
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
  child.kill(signal);
}

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
