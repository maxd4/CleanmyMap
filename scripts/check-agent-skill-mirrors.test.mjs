import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { describe, it } from "node:test";
import os from "node:os";
import path from "node:path";
import process from "node:process";

function createValidFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-agent-skills-"));
  const canonical = path.join(root, ".agents", "skills", "cleanmymap-repo");
  const mirror = path.join(root, ".codex", "skills", "cleanmymap-repo");
  fs.mkdirSync(canonical, { recursive: true });
  fs.mkdirSync(mirror, { recursive: true });
  fs.writeFileSync(path.join(canonical, "SKILL.md"), "---\nname: fixture\ndescription: fixture\n---\n");
  fs.copyFileSync(path.join(canonical, "SKILL.md"), path.join(mirror, "SKILL.md"));
  return root;
}

function runCheck(script, cwd) {
  try {
    return {
      status: 0,
      output: execFileSync(process.execPath, [script], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    return {
      status: error.status ?? 1,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

describe("agent skill mirror governance", () => {
  it("checks every governed Codex skill mirror", () => {
    const script = path.join(process.cwd(), "scripts", "check-agent-skill-mirrors.mjs");
    const fixture = createValidFixture();

    try {
      const result = runCheck(script, fixture);

      assert.equal(result.status, 0);
      assert.match(result.output, /1 mirrored skills/);
      assert.match(result.output, /canonical \.agents\/skills/);
      assert.match(result.output, /mirror \.codex\/skills/);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("rejects an untracked nested vendor skill directory", () => {
    const script = path.join(process.cwd(), "scripts", "check-agent-skill-mirrors.mjs");
    const fixture = createValidFixture();
    const nestedSkill = path.join(fixture, "apps", "web", ".agents", "skills", "vendor");
    fs.mkdirSync(nestedSkill, { recursive: true });
    fs.writeFileSync(path.join(nestedSkill, "SKILL.md"), "vendor fixture\n");

    try {
      const result = runCheck(script, fixture);

      assert.notEqual(result.status, 0);
      assert.match(result.output, /apps\/web\/\.agents: nested agent skill directory/);
      assert.match(result.output, /reinstall with `npx skills add <package> --global`/);
      assert.match(result.output, /%USERPROFILE%\\\.agents\\skills/);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("rejects an untracked nested skills lock file", () => {
    const script = path.join(process.cwd(), "scripts", "check-agent-skill-mirrors.mjs");
    const fixture = createValidFixture();
    const nestedApp = path.join(fixture, "apps", "web");
    fs.mkdirSync(nestedApp, { recursive: true });
    fs.writeFileSync(path.join(nestedApp, "skills-lock.json"), "{}\n");

    try {
      const result = runCheck(script, fixture);

      assert.notEqual(result.status, 0);
      assert.match(result.output, /apps\/web\/skills-lock\.json: skills-lock\.json inside the checkout/);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });
});
