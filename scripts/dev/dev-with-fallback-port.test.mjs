import { strict as assert } from "node:assert";
import { EventEmitter } from "node:events";
import http from "node:http";
import { describe, it } from "node:test";

import {
  chooseAvailablePort,
  openUrlInBrowser,
  parsePortArgs,
  runDevServer,
  waitForServerReady,
} from "./dev-with-fallback-port.mjs";

describe("dev-with-fallback-port", () => {
  it("keeps browser opening opt-in and passes through unrelated arguments", () => {
    assert.deepEqual(parsePortArgs(["--port", "3010", "--open-browser", "--", "--verbose"]), {
      preferredPort: 3010,
      passthrough: ["--", "--verbose"],
      openBrowser: true,
    });
    assert.equal(parsePortArgs([]).openBrowser, false);
  });

  it("keeps port 3000 when free and falls back when it is occupied", async () => {
    assert.equal(
      await chooseAvailablePort(3000, {
        isPortFreeImpl: async (port) => port === 3000,
      }),
      3000,
    );
    assert.equal(
      await chooseAvailablePort(3000, {
        isPortFreeImpl: async (port) => port === 3001,
      }),
      3001,
    );
  });

  it("passes the selected fallback port to Next and the browser", async () => {
    let child;
    let spawnCall;
    let openedUrl;
    const spawnImpl = (command, args, options) => {
      child = new EventEmitter();
      child.kill = () => {};
      spawnCall = { command, args, options };
      setTimeout(() => child.emit("exit", 0, null), 20);
      return child;
    };

    const result = await runDevServer(["--open-browser", "--port", "3000"], {
      env: { NODE_ENV: "development", PORT: "3000" },
      choosePortImpl: async () => 3001,
      spawnImpl,
      waitForServerReadyImpl: async (port) => {
        assert.equal(port, 3001);
        await new Promise((resolveResult) => setTimeout(resolveResult, 1));
        return { statusCode: 200 };
      },
      nextBinPath: "next",
      openUrlInBrowserImpl: async (url) => {
        openedUrl = url;
        return { browser: "chrome" };
      },
    });

    assert.equal(result.exitCode, 0);
    assert.equal(spawnCall.args[5], "3001");
    assert.equal(spawnCall.options.env.PORT, "3001");
    assert.equal(openedUrl, "http://localhost:3001");
  });

  it("waits for an HTTP connection before reporting readiness", async () => {
    const server = http.createServer((_request, response) => {
      response.writeHead(200);
      response.end("ready");
    });
    await new Promise((resolveResult) => server.listen(0, "127.0.0.1", resolveResult));
    const address = server.address();
    assert.ok(address && typeof address === "object");

    const ready = await waitForServerReady(address.port, {
      host: "127.0.0.1",
      timeoutMs: 1_000,
      retryDelayMs: 10,
    });
    assert.equal(ready.statusCode, 200);
    await new Promise((resolveResult, rejectResult) => server.close((error) => (error ? rejectResult(error) : resolveResult())));
  });

  it("cancels the readiness probe when requested", async () => {
    const controller = new AbortController();
    const pending = waitForServerReady(39_999, {
      host: "127.0.0.1",
      timeoutMs: 10_000,
      retryDelayMs: 10,
      signal: controller.signal,
    });
    controller.abort();
    await assert.rejects(pending, /Attente de readiness annulée/);
  });

  it("opens Chrome once when an executable is available", async () => {
    const calls = [];
    const spawnImpl = (command, args) => {
      calls.push({ command, args });
      const child = new EventEmitter();
      child.unref = () => {};
      queueMicrotask(() => child.emit("spawn"));
      return child;
    };

    const result = await openUrlInBrowser("http://localhost:3010", {
      platform: "win32",
      env: { CMM_DEV_CHROME_PATH: "C:\\Chrome\\chrome.exe" },
      accessImpl: async () => {},
      spawnImpl,
    });

    assert.deepEqual(result, { browser: "chrome", path: "C:\\Chrome\\chrome.exe" });
    assert.deepEqual(calls, [{ command: "C:\\Chrome\\chrome.exe", args: ["http://localhost:3010"] }]);
  });

  it("falls back to the Windows default browser when Chrome is unavailable", async () => {
    const calls = [];
    const spawnImpl = (command, args) => {
      calls.push({ command, args });
      const child = new EventEmitter();
      child.unref = () => {};
      queueMicrotask(() => child.emit("spawn"));
      return child;
    };

    const result = await openUrlInBrowser("http://localhost:3011", {
      platform: "win32",
      env: { CMM_DEV_CHROME_PATH: "C:\\Missing\\chrome.exe" },
      accessImpl: async () => {
        throw new Error("missing");
      },
      spawnImpl,
    });

    assert.deepEqual(result, { browser: "default" });
    assert.deepEqual(calls, [
      { command: "cmd.exe", args: ["/d", "/c", "start", "", "http://localhost:3011"] },
    ]);
  });

  it("does not open a browser when Next exits before readiness", async () => {
    let browserOpenCount = 0;
    const spawnImpl = () => {
      const child = new EventEmitter();
      child.kill = () => {};
      queueMicrotask(() => child.emit("exit", 1, null));
      return child;
    };

    const result = await runDevServer(["--open-browser"], {
      env: { NODE_ENV: "development", PORT: "3000" },
      choosePortImpl: async () => 3000,
      spawnImpl,
      waitForServerReadyImpl: () => new Promise(() => {}),
      nextBinPath: "next",
      openUrlInBrowserImpl: async () => {
        browserOpenCount += 1;
        return { browser: "chrome" };
      },
    });

    assert.equal(result.exitCode, 1);
    assert.equal(browserOpenCount, 0);
  });
});
