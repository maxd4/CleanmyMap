import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { PassThrough } from "node:stream";
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

const writeChunk = (stream, chunk) =>
  new Promise((resolve, reject) => {
    stream.write(chunk, (error) => (error ? reject(error) : resolve()));
  });

const nextTurn = () => new Promise((resolve) => setImmediate(resolve));

const waitFor = async (predicate, message) => {
  const deadline = Date.now() + 1000;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(message);
    await nextTurn();
  }
};

const collectStreamValues = async (chunks, options = {}) => {
  const StreamValues = require("stream-json/streamers/StreamValues");
  const parser = StreamValues.withParser(options);
  const values = [];
  parser.on("data", (item) => values.push(item.value));
  const finished = new Promise((resolve, reject) => {
    parser.once("error", reject);
    parser.once("end", () => resolve(values));
  });

  for (const chunk of chunks) await writeChunk(parser, chunk);
  parser.end();
  return finished;
};

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

test("preserves JSON __proto__ keys as own properties without prototype pollution", async () => {
  const payload =
    '{"__proto__":{"polluted":"root"},"nested":{"__proto__":{"polluted":"nested"},"count":2},"items":[{"__proto__":{"polluted":"array"}}]}';
  const expected = JSON.parse(payload);
  const actual = (await collectStreamValues([
    payload.slice(0, 32),
    payload.slice(32, 79),
    payload.slice(79),
  ]))[0];

  assert.deepEqual(actual, expected);
  assert.equal(Object.getPrototypeOf(actual), Object.prototype);
  assert.equal(Object.getPrototypeOf(actual.nested), Object.prototype);
  assert.equal(Object.getPrototypeOf(actual.items), Array.prototype);
  assert.equal(Object.getPrototypeOf(actual.items[0]), Object.prototype);
  assert.equal(Object.hasOwn(actual, "__proto__"), true);
  assert.equal(Object.hasOwn(actual.nested, "__proto__"), true);
  assert.equal(Object.hasOwn(actual.items[0], "__proto__"), true);
  assert.equal(Object.getOwnPropertyDescriptor(actual, "__proto__").enumerable, true);
  assert.equal(Object.getOwnPropertyDescriptor(actual, "__proto__").writable, true);
  assert.equal(Object.getOwnPropertyDescriptor(actual, "__proto__").configurable, true);
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
});

test("preserves primitive values while streaming multiple JSON values", async () => {
  const values = await collectStreamValues(["null true 42 \"text\""]);

  assert.deepEqual(values, [null, true, 42, "text"]);
});

test("keeps the secure property path when StreamValues uses a reviver", async () => {
  const payload = '{"__proto__":{"flag":true},"nested":{"count":2}}';
  const seenKeys = [];
  const reviver = (key, value) => {
    seenKeys.push(key);
    return key === "count" ? value * 2 : value;
  };
  const expected = JSON.parse(payload, reviver);
  const actual = (await collectStreamValues([payload], { reviver }))[0];

  assert.deepEqual(actual, expected);
  assert.ok(seenKeys.includes("__proto__"));
  assert.equal(actual.nested.count, 4);
  assert.equal(Object.hasOwn(actual, "__proto__"), true);
  assert.equal(Object.getPrototypeOf(actual), Object.prototype);
  assert.equal(Object.prototype.flag, undefined);
});

test("performs a minimal streaming JSON-RPC exchange through jayson", async () => {
  const jayson = require("jayson");
  const server = new jayson.Server({
    add: (args, callback) => callback(null, args[0] + args[1]),
  });
  const firstRequest = JSON.stringify({
    jsonrpc: "2.0",
    method: "add",
    params: [2, 3],
    id: 1,
  });
  const secondRequest = JSON.stringify({
    jsonrpc: "2.0",
    method: "add",
    params: [4, 5],
    id: 2,
  });
  const input = new PassThrough();
  const responses = [];
  let streamError;

  jayson.Utils.parseStream(input, {}, (error, parsedRequest) => {
    if (error) {
      streamError = error;
      return;
    }
    server.call(parsedRequest, (callError, result) => {
      if (callError) streamError = callError;
      else responses.push(result);
    });
  });

  await writeChunk(input, firstRequest);
  await nextTurn();
  assert.equal(input.readableEnded, false);
  assert.equal(streamError, undefined);
  assert.deepEqual(responses, [{ jsonrpc: "2.0", id: 1, result: 5 }]);

  await writeChunk(input, secondRequest);
  await nextTurn();
  assert.equal(input.readableEnded, false);
  assert.equal(streamError, undefined);
  assert.deepEqual(responses, [
    { jsonrpc: "2.0", id: 1, result: 5 },
    { jsonrpc: "2.0", id: 2, result: 9 },
  ]);

  input.end();
  await nextTurn();
  assert.equal(streamError, undefined);
});

test("jayson emits a complete request before an open PassThrough reaches EOF", async () => {
  const jayson = require("jayson");
  const input = new PassThrough();
  const callbacks = [];

  jayson.Utils.parseStream(input, {}, (error, parsedRequest) => {
    callbacks.push({ error, parsedRequest });
  });

  input.write(JSON.stringify({ jsonrpc: "2.0", method: "ping", id: 10 }));
  await waitFor(
    () => callbacks.length === 1,
    "parseStream did not emit the complete request before EOF",
  );

  assert.equal(input.readableEnded, false);
  assert.equal(callbacks[0].error, null);
  assert.deepEqual(callbacks[0].parsedRequest, {
    jsonrpc: "2.0",
    method: "ping",
    id: 10,
  });
  input.destroy();
});

test("jayson emits successive requests in order on the same open stream", async () => {
  const jayson = require("jayson");
  const input = new PassThrough();
  const callbacks = [];

  jayson.Utils.parseStream(input, {}, (error, parsedRequest) => {
    callbacks.push({ error, parsedRequest });
  });

  input.write(JSON.stringify({ jsonrpc: "2.0", method: "first", id: 1 }));
  await waitFor(() => callbacks.length === 1, "first request was not emitted");
  assert.equal(input.readableEnded, false);

  input.write(JSON.stringify({ jsonrpc: "2.0", method: "second", id: 2 }));
  await waitFor(() => callbacks.length === 2, "second request was not emitted");

  assert.deepEqual(
    callbacks.map(({ error, parsedRequest }) => ({ error, parsedRequest })),
    [
      {
        error: null,
        parsedRequest: { jsonrpc: "2.0", method: "first", id: 1 },
      },
      {
        error: null,
        parsedRequest: { jsonrpc: "2.0", method: "second", id: 2 },
      },
    ],
  );
  assert.equal(input.readableEnded, false);
  input.destroy();
});

test("jayson waits for a fragmented request and emits it before EOF", async () => {
  const jayson = require("jayson");
  const input = new PassThrough();
  const callbacks = [];

  jayson.Utils.parseStream(input, {}, (error, parsedRequest) => {
    callbacks.push({ error, parsedRequest });
  });

  input.write('{"jsonrpc":"2.0","method":"add","params":[');
  await nextTurn();
  assert.equal(callbacks.length, 0);

  input.write('2,3],"id":3}');
  await waitFor(
    () => callbacks.length === 1,
    "fragmented request was not emitted after its final chunk",
  );

  assert.equal(input.readableEnded, false);
  assert.equal(callbacks[0].error, null);
  assert.deepEqual(callbacks[0].parsedRequest, {
    jsonrpc: "2.0",
    method: "add",
    params: [2, 3],
    id: 3,
  });
  input.destroy();
});

test("jayson reports malformed JSON through the parseStream error callback", async () => {
  const jayson = require("jayson");
  const input = new PassThrough();
  const callbacks = [];

  jayson.Utils.parseStream(input, {}, (error, parsedRequest) => {
    callbacks.push({ error, parsedRequest });
  });

  input.write('{"jsonrpc":"2.0","method":]');
  await waitFor(
    () => callbacks.length === 1,
    "malformed JSON did not reach the parseStream error callback",
  );

  assert.equal(input.readableEnded, false);
  assert.ok(callbacks[0].error instanceof Error);
  assert.equal(callbacks[0].parsedRequest, undefined);
  input.destroy();
});

test("keeps StreamValues and Verifier incremental on an open stream", async () => {
  const StreamValues = require("stream-json/streamers/StreamValues");
  const Verifier = require("stream-json/utils/Verifier");
  const parser = StreamValues.withParser();
  const values = [];
  parser.on("data", (item) => values.push(item.value));

  await writeChunk(parser, '{"first":1}');
  await nextTurn();
  assert.deepEqual(values, [{ first: 1 }]);

  await writeChunk(parser, '{"second":2}');
  await nextTurn();
  assert.deepEqual(values, [{ first: 1 }, { second: 2 }]);

  await writeChunk(parser, '{"fragment":');
  await nextTurn();
  assert.deepEqual(values, [{ first: 1 }, { second: 2 }]);

  await writeChunk(parser, '{"nested":true}}');
  await nextTurn();
  assert.deepEqual(values, [
    { first: 1 },
    { second: 2 },
    { fragment: { nested: true } },
  ]);

  const verifier = new Verifier({ jsonStreaming: true });
  await writeChunk(verifier, '{"partial":');
  await writeChunk(verifier, 'true}');
  const verifierFinished = once(verifier, "finish");
  verifier.end();
  await verifierFinished;

  const parserFinished = once(parser, "end");
  parser.end();
  await parserFinished;
});

test("propagates invalid JSON through the incremental StreamValues pipeline", async () => {
  const StreamValues = require("stream-json/streamers/StreamValues");
  const parser = StreamValues.withParser();
  const values = [];
  let parserError;

  parser.on("data", (item) => values.push(item.value));
  parser.on("error", (error) => {
    parserError = error;
  });

  parser.write('{"valid":');
  await nextTurn();
  assert.deepEqual(values, []);

  parser.write("]");
  await waitFor(
    () => parserError instanceof Error,
    "invalid JSON did not propagate through the incremental parser",
  );

  assert.match(parserError.message, /parse|JSON|expected|unexpected/i);
  assert.deepEqual(values, []);
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

test("does not resolve JSONC components covered by the non-applicable advisory", () => {
  for (const moduleName of [
    "jsonc-parser",
    "json-source-map",
    "stream-json/jsonc/parser.js",
    "stream-json/jsonc/verifier.js",
  ]) {
    assert.throws(
      () => require.resolve(moduleName, { paths: [mobileRoot] }),
      /Cannot find module/,
      `${moduleName} must not be resolvable from the mobile package`,
    );
  }

  for (const moduleName of ["parser.js", "verifier.js"]) {
    assert.equal(
      fs.existsSync(path.join(vendorRoot, "jsonc", moduleName)),
      false,
      `jsonc/${moduleName} must not be present in the local package`,
    );
  }
});
