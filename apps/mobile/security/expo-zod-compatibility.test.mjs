import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(mobileRoot, "..", "..");
const cliPackageRoot = path.join(repositoryRoot, "node_modules/@expo/cli");
const cliRequire = createRequire(path.join(cliPackageRoot, "package.json"));

test("loads the fixed Zod release through the scoped Expo CLI override", () => {
  const zodPackage = JSON.parse(
    fs.readFileSync(path.join(cliPackageRoot, "node_modules/zod/package.json"), "utf8"),
  );
  assert.equal(zodPackage.version, "4.6.6");

  const { z } = cliRequire("zod");
  const schema = z.object({
    kind: z.enum(["stdio", "websocket"]),
    port: z.number().min(1).optional(),
    enabled: z.boolean(),
    endpoint: z.union([z.string().url(), z.literal("stdio")]),
    tags: z.string().array(),
  });

  const valid = {
    kind: "websocket",
    port: 8787,
    enabled: true,
    endpoint: "https://localhost:8787/mcp",
    tags: ["expo", "mcp"],
  };
  assert.deepEqual(schema.parse(valid), valid);
  assert.throws(() => schema.parse({ ...valid, endpoint: "not-a-url" }));
});
