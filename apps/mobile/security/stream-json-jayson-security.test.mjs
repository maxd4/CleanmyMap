import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const mobileRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(mobileRoot, "../..");
const vendorRoot = path.join(mobileRoot, "vendor/stream-json");

test("keeps jayson on the bounded CommonJS compatibility surface", () => {
  const rootPackage = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
  );
  assert.equal(rootPackage.overrides["stream-json"], undefined);
  assert.deepEqual(rootPackage.overrides["jayson@4.3.0"], {
    "stream-json": "file:apps/mobile/vendor/stream-json",
  });
  assert.doesNotThrow(() => require("jayson"));

  for (const request of [
    "stream-json/streamers/StreamValues",
    "stream-json/utils/Verifier",
  ]) {
    assert.equal(
      require.resolve(request, { paths: [mobileRoot] }),
      path.join(vendorRoot, `${request.slice("stream-json/".length)}.js`),
    );
  }
});

test("performs a minimal streaming JSON-RPC exchange through jayson", async () => {
  const jayson = require("jayson");
  const server = new jayson.Server({
    add: (args, callback) => callback(null, args[0] + args[1]),
  });
  const request = JSON.stringify({
    jsonrpc: "2.0",
    method: "add",
    params: [2, 3],
    id: 1,
  });

  const response = await new Promise((resolve, reject) => {
    jayson.Utils.parseStream(
      Readable.from([request]),
      {},
      (error, parsedRequest) => {
        if (error) {
          reject(error);
          return;
        }
        server.call(parsedRequest, (callError, result) => {
          if (callError) reject(callError);
          else resolve(result);
        });
      },
    );
  });

  assert.deepEqual(response, { jsonrpc: "2.0", id: 1, result: 5 });
});

test("does not ship the excluded vulnerable path-filter modules", () => {
  for (const moduleName of ["pick", "ignore", "filter", "replace"]) {
    assert.equal(
      fs.existsSync(path.join(vendorRoot, "filters", `${moduleName}.js`)),
      false,
      `${moduleName} must not be present in the local package`,
    );
    assert.throws(
      () => require.resolve(`stream-json/filters/${moduleName}`, { paths: [mobileRoot] }),
      /Cannot find module/,
    );
  }
});
