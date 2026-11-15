import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { rewriteRestoreTargetConfig } from "./prepare-supabase-restore-target.mjs";

const canonicalConfig = await readFile(new URL("../../apps/web/supabase/config.toml", import.meta.url), "utf8");

test("target configuration is derived from canonical Supabase config with isolated ports", () => {
  const target = rewriteRestoreTargetConfig(canonicalConfig, { projectId: "cmm-test-target", portOffset: 100 });
  assert.match(target, /project_id = "cmm-test-target"/);
  assert.match(target, /port = 54422/);
  assert.match(target, /shadow_port = 54420/);
  assert.match(target, /smtp_port = 54425/);
  assert.match(target, /pop3_port = 54426/);
  assert.match(target, /inspector_port = 54803/);
  assert.match(target, /\[db\.migrations\][\s\S]*?enabled = false/);
  assert.match(target, /\[db\.seed\][\s\S]*?enabled = false/);
  assert.match(target, /\[api\][\s\S]*?enabled = true/);
});
