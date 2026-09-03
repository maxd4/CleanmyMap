import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";
import { access, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const webDir = resolve(repoRoot, "apps/web");
const turbopackCacheDirs = [
  resolve(webDir, ".next/cache/turbopack"),
  resolve(webDir, ".next/dev/cache/turbopack"),
];
const require = createRequire(import.meta.url);
const defaultHost = process.env.DEV_HOST ?? "localhost";

export function parsePortArgs(argv) {
  const passthrough = [];
  let preferredPort = Number(process.env.PORT ?? 3000);
  let openBrowser = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--open-browser") {
      openBrowser = true;
      continue;
    }

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
      throw new Error("[dev] Webpack is disabled in this repository. Remove --webpack and use Turbopack.");
    }

    if (arg === "--turbopack" || arg === "--turbo") {
      continue;
    }

    passthrough.push(arg);
  }

  return { preferredPort, passthrough, openBrowser };
}

export function isPortFree(port, host = defaultHost) {
  return new Promise((resolveResult) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolveResult(false));
    server.listen({ port, host }, () => {
      server.close(() => resolveResult(true));
    });
  });
}

export async function chooseAvailablePort(
  preferredPort,
  {
    strictPort = false,
    host = defaultHost,
    maxFallbackPorts = 20,
    isPortFreeImpl = (port) => isPortFree(port, host),
  } = {},
) {
  if (strictPort && !(await isPortFreeImpl(preferredPort))) {
    throw new Error(
      `[dev] Le port ${preferredPort} est déjà utilisé. Arrête l'ancien serveur ou lance 'npm run dev:clean'. Pour forcer un échec au lieu d'un port de secours, utilise 'npm run dev:strict'.`,
    );
  }

  for (let offset = 0; offset < maxFallbackPorts; offset += 1) {
    const chosenPort = preferredPort + offset;
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFreeImpl(chosenPort)) {
      return chosenPort;
    }
  }

  throw new Error(
    `[dev] Aucun port libre trouvé à partir de ${preferredPort}. Libère un port ou lance avec PORT=XXXX.`,
  );
}

export function waitForServerReady(
  port,
  { host = defaultHost, timeoutMs = 60_000, retryDelayMs = 250 } = {},
) {
  return new Promise((resolveResult, rejectResult) => {
    const deadline = Date.now() + timeoutMs;
    let retryTimer = null;
    let settled = false;

    const finish = (error, result) => {
      if (settled) {
        return;
      }
      settled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      if (error) {
        rejectResult(error);
      } else {
        resolveResult(result);
      }
    };

    const attempt = () => {
      if (settled) {
        return;
      }
      if (Date.now() >= deadline) {
        finish(new Error(`[dev] Le serveur n'est pas prêt après ${timeoutMs} ms.`));
        return;
      }

      const request = http.get(
        { hostname: host, path: "/", port, method: "GET" },
        (response) => {
          response.resume();
          finish(null, { statusCode: response.statusCode ?? 0 });
        },
      );
      request.setTimeout(Math.min(1_000, timeoutMs), () => request.destroy());
      request.once("error", () => {
        if (!settled) {
          retryTimer = setTimeout(attempt, retryDelayMs);
        }
      });
    };

    attempt();
  });
}

export function getChromeCandidates(env = process.env, platform = process.platform) {
  if (platform !== "win32") {
    return [];
  }

  return [
    env.CMM_DEV_CHROME_PATH,
    env.CHROME_PATH,
    env.LOCALAPPDATA && join(env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
    env.ProgramFiles && join(env.ProgramFiles, "Google/Chrome/Application/chrome.exe"),
    env["ProgramFiles(x86)"] && join(env["ProgramFiles(x86)"], "Google/Chrome/Application/chrome.exe"),
  ].filter((candidate, index, candidates) => candidate && candidates.indexOf(candidate) === index);
}

async function findExistingPath(candidates, accessImpl = access) {
  for (const candidate of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await accessImpl(candidate);
      return candidate;
    } catch {
      // Try the next standard Chrome installation path.
    }
  }
  return null;
}

function spawnDetached(command, args, spawnImpl) {
  return new Promise((resolveResult, rejectResult) => {
    let child;
    try {
      child = spawnImpl(command, args, {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
    } catch (error) {
      rejectResult(error);
      return;
    }

    child.once("error", rejectResult);
    child.once("spawn", () => {
      child.unref();
      resolveResult();
    });
  });
}

export async function openUrlInBrowser(
  url,
  {
    platform = process.platform,
    env = process.env,
    accessImpl = access,
    spawnImpl = spawn,
  } = {},
) {
  if (platform === "win32") {
    const chromePath = await findExistingPath(getChromeCandidates(env, platform), accessImpl);
    if (chromePath) {
      try {
        await spawnDetached(chromePath, [url], spawnImpl);
        return { browser: "chrome", path: chromePath };
      } catch {
        // Fall through to the Windows default browser when Chrome cannot start.
      }
    }

    await spawnDetached("cmd.exe", ["/d", "/c", "start", "", url], spawnImpl);
    return { browser: "default" };
  }

  const command = platform === "darwin" ? "open" : "xdg-open";
  await spawnDetached(command, [url], spawnImpl);
  return { browser: "default" };
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

function exitCodeForChild(result) {
  if (result.error) {
    return 1;
  }
  if (result.signal) {
    return result.signal === "SIGINT" ? 130 : result.signal === "SIGTERM" ? 143 : 1;
  }
  return result.code ?? 0;
}

export async function runDevServer(
  argv = process.argv.slice(2),
  {
    env = process.env,
    choosePortImpl = chooseAvailablePort,
    spawnImpl = spawn,
    waitForServerReadyImpl = waitForServerReady,
    openUrlInBrowserImpl = openUrlInBrowser,
    nextBinPath = null,
  } = {},
) {
  const host = env.DEV_HOST ?? defaultHost;
  const strictPort = env.DEV_STRICT_PORT === "1";
  const requestedBundler = env.DEV_BUNDLER?.toLowerCase();
  if (requestedBundler === "webpack") {
    throw new Error("[dev] Webpack est désactivé dans ce dépôt. Utilise le flux Turbopack par défaut.");
  }

  const { preferredPort, passthrough, openBrowser } = parsePortArgs(argv);
  if (env.DEV_CLEAR_TURBOPACK_CACHE === "1") {
    await clearTurbopackCache();
  }

  const chosenPort = await choosePortImpl(preferredPort, {
    strictPort,
    host,
  });

  if (!strictPort && chosenPort !== preferredPort) {
    console.warn(
      [
        `[dev] Le port ${preferredPort} est occupé.`,
        `[dev] Démarrage sur http://${host}:${chosenPort} au lieu de ${preferredPort}.`,
        `[dev] Si tu veux empêcher toute bascule automatique, lance 'npm run dev:strict'.`,
        `[dev] Si tu veux libérer le port, arrête l'ancien serveur ou lance 'npm run dev:clean'.`,
      ].join("\n"),
    );
  }

  const url = `http://${host}:${chosenPort}`;
  console.log(`[dev] Next.js démarre sur ${url}`);
  const nextBin = nextBinPath ?? require.resolve("next/dist/bin/next", { paths: [webDir] });

  const child = spawnImpl(
    process.execPath,
    [nextBin, "dev", "-H", host, "-p", String(chosenPort), "--turbopack", ...passthrough],
    {
      cwd: webDir,
      env: {
        ...env,
        HOSTNAME: host,
        PORT: String(chosenPort),
      },
      stdio: "inherit",
    },
  );

  let forwardedSignal = null;
  const forwardSignal = (signal) => {
    forwardedSignal = signal;
    child.kill(signal);
  };
  const onSigint = () => forwardSignal("SIGINT");
  const onSigterm = () => forwardSignal("SIGTERM");
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);
  const cleanupSignals = () => {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
  };

  const childExit = new Promise((resolveResult) => {
    child.once("error", (error) => resolveResult({ error }));
    child.once("exit", (code, signal) => resolveResult({ code, signal }));
  });

  if (openBrowser) {
    try {
      await Promise.race([
        waitForServerReadyImpl(chosenPort, { host }),
        childExit.then((result) => {
          throw new Error(
            `[dev] Next.js a quitté avant d'être prêt (code=${result.code ?? "n/a"}, signal=${result.signal ?? "n/a"}).`,
          );
        }),
      ]);

      try {
        const opened = await openUrlInBrowserImpl(url);
        console.log(`[dev] Navigateur ouvert (${opened.browser}) sur ${url}`);
      } catch (error) {
        console.error(
          `[dev] Impossible d'ouvrir le navigateur sur ${url}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.message.includes("n'est pas prêt")) {
        child.kill("SIGTERM");
      }
      const result = await childExit;
      cleanupSignals();
      return { exitCode: Math.max(1, exitCodeForChild(result)) };
    }
  }

  const result = await childExit;
  cleanupSignals();
  if (forwardedSignal && result.signal === null) {
    return { exitCode: forwardedSignal === "SIGINT" ? 130 : 143 };
  }
  return { exitCode: exitCodeForChild(result) };
}

const isMainModule = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMainModule) {
  try {
    const result = await runDevServer();
    process.exitCode = result.exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
