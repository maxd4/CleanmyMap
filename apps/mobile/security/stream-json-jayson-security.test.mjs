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
