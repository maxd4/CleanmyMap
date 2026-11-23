import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { disableSupabaseMigrationsAndSeed, setSupabaseSectionEnabled } from "./supabase-config.mjs";

const canonicalConfig = await readFile(new URL("../../apps/web/supabase/config.toml", import.meta.url), "utf8");

test("isolated bootstrap config disables only application migrations and seed", () => {
  const bootstrap = disableSupabaseMigrationsAndSeed(canonicalConfig);
  assert.match(bootstrap, /\[db\.migrations\][\s\S]*?enabled = false/u);
  assert.match(bootstrap, /\[db\.seed\][\s\S]*?enabled = false/u);
  assert.match(bootstrap, /\[api\][\s\S]*?enabled = true/u);
  assert.match(bootstrap, /^project_id = "web"$/mu);
});

test("database initialization can be restored by the canonical reset configuration", () => {
  const bootstrap = disableSupabaseMigrationsAndSeed(canonicalConfig);
  const resetConfig = setSupabaseSectionEnabled(
    setSupabaseSectionEnabled(bootstrap, "db.migrations", true),
    "db.seed",
    true,
  );
  assert.equal(resetConfig, canonicalConfig);
});

test("bootstrap config fails closed for missing, duplicate or malformed section flags", () => {
  assert.throws(() => setSupabaseSectionEnabled("[db]\n", "db.migrations", false), /exactly one/u);
  assert.throws(() => setSupabaseSectionEnabled("[db.migrations]\nenabled = true\nenabled = true\n", "db.migrations", false), /exactly one enabled flag/u);
  assert.throws(() => setSupabaseSectionEnabled("[db.migrations]\n", "db.migrations", false), /exactly one enabled flag/u);
});
