import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";
import path from "node:path";
import process from "node:process";

describe("agent skill mirror governance", () => {
  it("checks every governed Codex skill mirror", () => {
    const script = path.join(process.cwd(), "scripts", "check-agent-skill-mirrors.mjs");
    const output = execFileSync(process.execPath, [script], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    assert.match(output, /14 mirrored skills/);
    assert.match(output, /canonical \.agents\/skills/);
    assert.match(output, /mirror \.codex\/skills/);
  });
});
