import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const packagePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../vendor/image-size/dist/index.js",
);
const mobileRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("routes both Metro copies to the hardened local package", () => {
  const metroPaths = [
    require.resolve("metro/package.json", {
      paths: [
        path.dirname(
          require.resolve("@expo/metro/package.json", { paths: [mobileRoot] }),
        ),
      ],
    }),
    require.resolve("metro/package.json", {
      paths: [
        path.dirname(
          require.resolve("@react-native/community-cli-plugin/package.json", {
            paths: [mobileRoot],
          }),
        ),
      ],
    }),
  ];

  for (const metroPackagePath of metroPaths) {
    assert.equal(
      require.resolve("image-size/package.json", {
        paths: [path.dirname(metroPackagePath)],
      }),
      path.join(mobileRoot, "vendor/image-size/package.json"),
    );
  }
});

function assertRejectsWithoutHanging(input, message) {
  const script = [
    'const imageSize = require(process.argv[1]);',
    'const input = Buffer.from(process.argv[2], "hex");',
    'try { imageSize(input); } catch { process.exit(0); }',
    'process.exit(1);',
  ].join(" ");
  const result = spawnSync(
    process.execPath,
    ["-e", script, packagePath, Buffer.from(input).toString("hex")],
    { encoding: "utf8", timeout: 1000 },
  );

  assert.equal(result.error, undefined, message);
  assert.equal(result.status, 0, message);
}

test("rejects a zero-length ICNS entry without blocking the event loop", () => {
  const input = Buffer.alloc(16);
  input.write("icns", 0, "ascii");
  input.writeUInt32BE(16, 4);
  input.write("ic07", 8, "ascii");
  input.writeUInt32BE(0, 12);

  assertRejectsWithoutHanging(input, "malformed ICNS input must be rejected");
});

test("rejects a zero-sized JXL box without blocking the event loop", () => {
  const input = Buffer.alloc(24);
  input.writeUInt32BE(0, 0);
  input.write("JXL ", 4, "ascii");
  input.writeUInt32BE(16, 8);
  input.write("ftyp", 12, "ascii");
  input.write("jxl ", 16, "ascii");

  assertRejectsWithoutHanging(input, "malformed JXL input must be rejected");
});

test("keeps valid ICNS dimension detection", () => {
  const input = Buffer.alloc(20);
  input.write("icns", 0, "ascii");
  input.writeUInt32BE(20, 4);
  input.write("ic07", 8, "ascii");
  input.writeUInt32BE(12, 12);

  const imageSize = require(packagePath);
  assert.deepEqual(imageSize(input), { width: 128, height: 128, type: "ic07" });
});
