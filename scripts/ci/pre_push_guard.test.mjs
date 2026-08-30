import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const GUARD_PATH = join(REPO_ROOT, "scripts", "ci", "pre_push_guard.ps1");
const GUARD_SOURCE = readFileSync(GUARD_PATH, "utf8");

function writeExecutableStub(binRoot, name) {
  writeFileSync(join(binRoot, `${name}.cmd`), "@echo off\r\nexit /b 0\r\n");
}

function runGuardWithVercelLinks(links) {
  const testRoot = mkdtempSync(join(tmpdir(), "cleanmymap-pre-push-guard-"));
  const scriptsRoot = join(testRoot, "scripts", "ci");
  const binRoot = join(testRoot, "bin");

  mkdirSync(scriptsRoot, { recursive: true });
  mkdirSync(binRoot, { recursive: true });
  writeFileSync(join(scriptsRoot, "pre_push_guard.ps1"), GUARD_SOURCE);
  writeExecutableStub(binRoot, "npm");
  writeExecutableStub(binRoot, "npx");

  for (const relativePath of links) {
    const projectFile = join(testRoot, relativePath);
    mkdirSync(join(projectFile, ".."), { recursive: true });
    writeFileSync(projectFile, "{}\n");
  }

  try {
    const result = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", join(scriptsRoot, "pre_push_guard.ps1")],
      {
        cwd: testRoot,
        encoding: "utf8",
        env: { ...process.env, PATH: `${binRoot};${process.env.PATH ?? ""}` },
        windowsHide: true,
        maxBuffer: 2 * 1024 * 1024,
      },
    );

    return {
      status: result.status,
      output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    };
  } finally {
    rmSync(testRoot, { recursive: true, force: true });
  }
}

test("pre-push guard handles zero, one, and two Vercel project links", () => {
  const cases = [
    {
      links: [],
      expected: ["No Vercel project link detected; skipping vercel build."],
      absent: ["Vercel project link detected:"],
    },
    {
      links: [".vercel/project.json"],
      expected: ["Vercel project link detected:", "- .vercel/project.json"],
      absent: ["- apps/web/.vercel/project.json"],
    },
    {
      links: [".vercel/project.json", "apps/web/.vercel/project.json"],
      expected: [
        "Vercel project link detected:",
        "- .vercel/project.json",
        "- apps/web/.vercel/project.json",
      ],
      absent: [],
    },
  ];

  for (const { links, expected, absent } of cases) {
    const result = runGuardWithVercelLinks(links);
    assert.equal(result.status, 0, `links=${links.length}\n${result.output}`);
    assert.match(result.output, /Pre-push guardrail passed\./);
    for (const expectedText of expected) assert.match(result.output, new RegExp(expectedText.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")));
    for (const absentText of absent) assert.doesNotMatch(result.output, new RegExp(absentText.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")));
    assert.doesNotMatch(result.output, /Property .*Count.* cannot be found|Count.*does not exist/i);
  }
});
