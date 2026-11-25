import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const AUDIT_SOURCE = readFileSync(join(REPO_ROOT, "scripts", "checks", "secret-audit.mjs"), "utf8");
const QUALITY_EVIDENCE_SOURCE = readFileSync(join(REPO_ROOT, "scripts", "checks", "quality-evidence.mjs"), "utf8");
const GIT_EXECUTABLE_SOURCE = readFileSync(join(REPO_ROOT, "scripts", "ci", "git-executable.mjs"), "utf8");

function runGit(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function writeFixture(root, relativePath, content) {
  const targetPath = join(root, relativePath);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content);
}

function runAudit({
  candidatePath = "candidate.md",
  candidateContent,
  foreignPath = "foreign.md",
  foreignContent,
  mode = "candidate",
  mutateWorkingTree = false,
}) {
  const testRoot = mkdtempSync(join(tmpdir(), "cleanmymap-secret-audit-"));
  const scriptsRoot = join(testRoot, "scripts", "checks");
  const ciRoot = join(testRoot, "scripts", "ci");
  mkdirSync(scriptsRoot, { recursive: true });
  mkdirSync(ciRoot, { recursive: true });
  writeFileSync(join(scriptsRoot, "secret-audit.mjs"), AUDIT_SOURCE);
  writeFileSync(join(scriptsRoot, "quality-evidence.mjs"), QUALITY_EVIDENCE_SOURCE);
  writeFileSync(join(ciRoot, "git-executable.mjs"), GIT_EXECUTABLE_SOURCE);

  try {
    runGit(testRoot, ["init", "--quiet"]);
    runGit(testRoot, ["config", "user.email", "codex@example.com"]);
    runGit(testRoot, ["config", "user.name", "Codex Test"]);
    writeFixture(testRoot, candidatePath, "baseline\n");
    writeFixture(testRoot, foreignPath, foreignContent);
    runGit(testRoot, ["add", "--", candidatePath, foreignPath]);
    runGit(testRoot, ["commit", "--quiet", "-m", "baseline"]);
    const base = runGit(testRoot, ["rev-parse", "HEAD"]);

    writeFixture(testRoot, candidatePath, candidateContent);
    runGit(testRoot, ["add", "--", candidatePath]);
    runGit(testRoot, ["commit", "--quiet", "-m", "candidate"]);
    const candidate = runGit(testRoot, ["rev-parse", "HEAD"]);

    if (mutateWorkingTree) {
      writeFixture(testRoot, candidatePath, "worktree content must be ignored\n");
    }

    const args = [join(scriptsRoot, "secret-audit.mjs")];
    if (mode === "ref") {
      args.push(`--ref=${candidate}`);
    } else {
      args.push(`--candidate-ref=${candidate}`, `--candidate-range=${base}..${candidate}`);
    }

    return spawnSync(
      process.execPath,
      args,
      { cwd: testRoot, encoding: "utf8", windowsHide: true },
    );
  } finally {
    rmSync(testRoot, { recursive: true, force: true });
  }
}

test("candidate secret is detected", () => {
  const syntheticAccessKey = ["AKIA", "1234567890123456"].join("");
  const result = runAudit({
    candidateContent: `AWS_ACCESS_KEY_ID=${syntheticAccessKey}\n`,
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /AWS access key/);
  assert.match(result.stdout, /PUSH_CANDIDATE/);
});

test("a synthetic secret in a Python file is detected", () => {
  const syntheticAccessKey = ["AKIA", "1234567890123456"].join("");
  const result = runAudit({
    candidatePath: "maintenance/python/src/secret_fixture.py",
    candidateContent: `AWS_ACCESS_KEY_ID=${syntheticAccessKey}\n`,
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /secret_fixture\.py/);
  assert.match(result.stderr, /AWS access key/);
});

for (const candidatePath of [".env.production", "documentation/secret-fixture.mdx", "documentation/secret-fixture.html"]) {
  test(`a synthetic secret in ${candidatePath} is detected`, () => {
    const syntheticAccessKey = ["AKIA", "1234567890123456"].join("");
    const result = runAudit({
      candidatePath,
      candidateContent: `AWS_ACCESS_KEY_ID=${syntheticAccessKey}\n`,
      foreignContent: "no secret here\n",
    });

    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, new RegExp(candidatePath.replaceAll(".", "\\.")));
    assert.match(result.stderr, /AWS access key/);
    assert.doesNotMatch(result.stderr, new RegExp(syntheticAccessKey));
  });
}

for (const candidatePath of [".env", ".env.production", "documentation/clean-fixture.mdx", "documentation/clean-fixture.html", "documentation/clean-fixture.htm"]) {
  test(`a clean ${candidatePath} passes`, () => {
    const result = runAudit({
      candidatePath,
      candidateContent: "no secret here\n",
      foreignContent: "no secret here\n",
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /1 file\(s\) scanned/);
  });
}

test("a secret in a foreign .env.* file is not scanned by PUSH_CANDIDATE", () => {
  const syntheticAccessKey = ["AKIA", "1234567890123456"].join("");
  const result = runAudit({
    candidatePath: "candidate.md",
    candidateContent: "candidate only\n",
    foreignPath: ".env.production",
    foreignContent: `AWS_ACCESS_KEY_ID=${syntheticAccessKey}\n`,
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PUSH_CANDIDATE/);
  assert.match(result.stdout, /1 file\(s\) scanned/);
  assert.doesNotMatch(result.stdout, /\.env\.production/);
  assert.doesNotMatch(result.stderr, /\.env\.production/);
});

test("a clean Python file passes", () => {
  const result = runAudit({
    candidatePath: "maintenance/python/src/clean_fixture.py",
    candidateContent: "def clean_fixture():\n    return True\n",
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /1 file\(s\) scanned/);
});

test("--ref scans the targeted commit instead of the mutated worktree", () => {
  const syntheticAccessKey = ["AKIA", "1234567890123456"].join("");
  const result = runAudit({
    mode: "ref",
    mutateWorkingTree: true,
    candidatePath: "maintenance/python/src/ref_fixture.py",
    candidateContent: `AWS_ACCESS_KEY_ID=${syntheticAccessKey}\n`,
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /ref_fixture\.py/);
  assert.match(result.stderr, /AWS access key/);
});

test("generated path exclusions remain effective for Python files", () => {
  const syntheticAccessKey = ["AKIA", "1234567890123456"].join("");
  const result = runAudit({
    mode: "ref",
    candidatePath: ".next-codex-secret/sentinel.py",
    candidateContent: `AWS_ACCESS_KEY_ID=${syntheticAccessKey}\n`,
    foreignPath: "artifacts/apps-web-node_modules-incomplete-0830/sentinel.py",
    foreignContent: `AWS_ACCESS_KEY_ID=${syntheticAccessKey}\n`,
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /0 file\(s\) scanned/);
});

test("secret in a foreign tree file does not affect candidate scan", () => {
  const syntheticAccessKey = ["AKIA", "1234567890123456"].join("");
  const result = runAudit({
    candidateContent: "documentation only\n",
    foreignContent: `AWS_ACCESS_KEY_ID=${syntheticAccessKey}\n`,
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PUSH_CANDIDATE/);
  assert.match(result.stdout, /1 file\(s\) scanned/);
});

test("asset integrity SHA-256 is allowed", () => {
  const assetDigest = "a".repeat(64);
  const result = runAudit({
    candidateContent: `asset: { "sha256": "${assetDigest}" }\n`,
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PUSH_CANDIDATE/);
});

test("a hash next to a password or token remains blocked", () => {
  const sensitiveDigest = "b".repeat(64);
  const result = runAudit({
    candidateContent: `passwordHash=${sensitiveDigest}\nTOKEN_DIGEST=${sensitiveDigest}\n`,
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /Hash digest/);
});

test("a generated radar Git SHA beside an auth path is not a secret", () => {
  const radarRef = "f528abe403800460874b0976a730f9688671a3a5";
  const result = runAudit({
    candidatePath: "documentation/architecture/monolith-split-plan.md",
    candidateContent: `| \`apps/web/src/lib/auth/sync.ts\` | \`${radarRef}\` | 504 | 15548 | runtime | PRESENT — REVIEW | NONE | PROACTIVE_SPLIT |\n`,
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /no probable secret found/);
});

test("a hash in an authentication context remains blocked", () => {
  const sensitiveDigest = "c".repeat(40);
  const result = runAudit({
    candidatePath: "apps/web/src/lib/auth/digest.ts",
    candidateContent: `const authDigest = \"${sensitiveDigest}\";\n`,
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /Hash digest/);
});

test("a real token pattern remains blocked", () => {
  const syntheticToken = [
    "eyJaaaaaaaaaa",
    "eyJbbbbbbbbbb",
    "eyJcccccccccc",
  ].join(".");
  const result = runAudit({
    candidateContent: `ACCESS_TOKEN=${syntheticToken}\n`,
    foreignContent: "no secret here\n",
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /JWT token/);
});

test("structured public email allowlist allows exact address and blocks same-domain, partial, malformed, and adjacent secrets", () => {
  const repo = mkdtempSync(join(tmpdir(), "cmm-secret-allowlist-"));
  const email = (local, domain = "paris.fr") => `${local}@${domain}`;
  const publicEmail = email("proprete");
  const malformedEmail = email("accueil");
  try {
    runGit(repo, ["init"]);
    runGit(repo, ["config", "user.email", "test@example.com"]);
    runGit(repo, ["config", "user.name", "Test"]);
    writeFixture(
      repo,
      "scripts/checks/secret-audit.allowlist.json",
      JSON.stringify({
        allow: [
          {
            path: "documentation/contacts.md",
            category: "Email address",
            exact: publicEmail,
            sourceUrl: "https://www.paris.fr/pages/proprete",
            verifiedAt: "2026-11-24",
            justification: "Adresse generique publique officielle de la Ville de Paris.",
          },
          {
            path: "documentation/malformed.md",
            category: "Email address",
            exact: malformedEmail,
            justification: "Missing sourceUrl and verifiedAt",
          },
        ],
      }),
    );
    runGit(repo, ["add", "scripts/checks/secret-audit.allowlist.json"]);
    runGit(repo, ["commit", "-m", "add email allowlist fixture"]);

    const run = (args) =>
      spawnSync(process.execPath, [resolve("scripts/checks/secret-audit.mjs"), ...args], {
        cwd: repo,
        encoding: "utf8",
      });

    // 1. Exact allowlisted public email passes
    writeFixture(repo, "documentation/contacts.md", `Contact: ${publicEmail}\n`);
    runGit(repo, ["add", "."]);
    const staged = run(["--staged-only"]);
    assert.equal(staged.status, 0, staged.stderr || staged.stdout);
    runGit(repo, ["commit", "-m", "exact public email"]);
    const res1 = run(["--ref=HEAD"]);
    assert.equal(res1.status, 0, res1.stderr || res1.stdout);
    const candidate = run(["--candidate-ref=HEAD", "--candidate-range=HEAD^..HEAD"]);
    assert.equal(candidate.status, 0, candidate.stderr || candidate.stdout);

    // 2. Unauthorized email on the same domain is blocked
    writeFixture(repo, "documentation/contacts.md", `Contact: ${email("perso.agent")}\n`);
    runGit(repo, ["add", "documentation/contacts.md"]);
    runGit(repo, ["commit", "-m", "unauthorized same domain"]);
    assert.notEqual(run(["--ref=HEAD"]).status, 0);

    // 3. Partial match does not bypass
    writeFixture(repo, "documentation/contacts.md", `Contact: ${email("other-proprete")}\n`);
    runGit(repo, ["add", "documentation/contacts.md"]);
    runGit(repo, ["commit", "-m", "partial match"]);
    assert.notEqual(run(["--ref=HEAD"]).status, 0);

    // 4. Malformed allowlist entry does not allow
    writeFixture(repo, "documentation/contacts.md", `Contact: ${publicEmail}\n`);
    writeFixture(repo, "documentation/malformed.md", `Contact: ${malformedEmail}\n`);
    runGit(repo, ["add", "documentation/contacts.md", "documentation/malformed.md"]);
    runGit(repo, ["commit", "-m", "malformed entry"]);
    assert.notEqual(run(["--ref=HEAD"]).status, 0);

    // 5. Secret beside allowlisted email is still blocked
    runGit(repo, ["rm", "-f", "documentation/malformed.md"]);
    writeFixture(
      repo,
      "documentation/contacts.md",
      `Contact: ${publicEmail}\nAWS=${["AKIA", "1234567890ABCDEF"].join("")}\n`,
    );
    runGit(repo, ["add", "documentation/contacts.md"]);
    runGit(repo, ["commit", "-m", "secret beside allowlisted email"]);
    assert.notEqual(run(["--ref=HEAD"]).status, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("gmail addresses are not globally exempted", () => {
  const result = runAudit({
    candidateContent: `Contact: ${"private.person"}@${"gmail.com"}\n`,
    foreignContent: "no secret here\n",
  });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /Email address/);
});

test("legacy contains allowlist entries require exact match and reject substrings", () => {
  const repo = mkdtempSync(join(tmpdir(), "cleanmymap-secret-exact-"));
  const signedUrl = ["https://supabase.test/storage/v1/object/sign/reports/cache.csv?to", "ken=abc123"].join("");
  const fixtureEmail = ["fixture", "private-domain.test"].join("@");
  try {
    runGit(repo, ["init", "-q"]);
    runGit(repo, ["config", "user.email", "codex@example.com"]);
    runGit(repo, ["config", "user.name", "Codex"]);
    writeFixture(
      repo,
      "scripts/checks/secret-audit.allowlist.json",
      JSON.stringify({
        allow: [
          {
            path: "apps/web/src/test.ts",
            category: "Sensitive URL",
            contains: signedUrl,
            reason: "Exact signed URL fixture.",
          },
          {
            path: "apps/web/src/test.ts",
            category: "Email address",
            contains: fixtureEmail,
            reason: "Exact email fixture.",
          },
        ],
      }),
    );
    writeFixture(
      repo,
      "apps/web/src/test.ts",
      [
        `const a = "${signedUrl}";`,
        `const b = "${fixtureEmail}";`,
      ].join("\n"),
    );
    runGit(repo, ["add", "."]);
    runGit(repo, ["commit", "-m", "exact allowlist"]);
    const run = (args) =>
      spawnSync(process.execPath, [resolve("scripts/checks/secret-audit.mjs"), ...args], {
        cwd: repo,
        encoding: "utf8",
      });
    assert.equal(run(["--ref=HEAD"]).status, 0);

    // Substring match must NOT bypass
    writeFixture(
      repo,
      "apps/web/src/test.ts",
      `const bad = "${signedUrl}456";\n`,
    );
    runGit(repo, ["add", "apps/web/src/test.ts"]);
    runGit(repo, ["commit", "-m", "substring url"]);
    assert.equal(run(["--ref=HEAD"]).status, 1);

    writeFixture(
      repo,
      "apps/web/src/test.ts",
      `const badEmail = "prefix-${fixtureEmail}";\n`,
    );
    runGit(repo, ["add", "apps/web/src/test.ts"]);
    runGit(repo, ["commit", "-m", "substring email"]);
    assert.equal(run(["--ref=HEAD"]).status, 1);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("allowlist resolution follows staged index and committed refs even when worktree diverges or deletes allowlist", () => {
  const repo = mkdtempSync(join(tmpdir(), "cleanmymap-secret-divergence-"));
  const fixtureEmail = ["fixture", "private-domain.test"].join("@");
  try {
    runGit(repo, ["init", "-q"]);
    runGit(repo, ["config", "user.email", "codex@example.com"]);
    runGit(repo, ["config", "user.name", "Codex"]);
    writeFixture(repo, "candidate.md", "baseline\n");
    runGit(repo, ["add", "candidate.md"]);
    runGit(repo, ["commit", "-m", "baseline"]);
    const base = runGit(repo, ["rev-parse", "HEAD"]);

    writeFixture(
      repo,
      "scripts/checks/secret-audit.allowlist.json",
      JSON.stringify({
        allow: [
          {
            path: "candidate.md",
            category: "Email address",
            contains: fixtureEmail,
            reason: "Committed fixture.",
          },
        ],
      }),
    );
    writeFixture(repo, "candidate.md", `Contact: ${fixtureEmail}\n`);
    runGit(repo, ["add", "scripts/checks/secret-audit.allowlist.json", "candidate.md"]);

    const run = (args) =>
      spawnSync(process.execPath, [resolve("scripts/checks/secret-audit.mjs"), ...args], {
        cwd: repo,
        encoding: "utf8",
      });

    // Staged index has allowlist even if worktree deletes it
    rmSync(join(repo, "scripts/checks/secret-audit.allowlist.json"));
    assert.equal(run(["--staged-only"]).status, 0);

    // Commit with allowlist, keep allowlist deleted in worktree
    runGit(repo, ["commit", "-m", "committed allowlist"]);
    const commitSha = runGit(repo, ["rev-parse", "HEAD"]);
    assert.equal(run([`--ref=${commitSha}`]).status, 0);
    assert.equal(run([`--candidate-ref=${commitSha}`, `--candidate-range=${base}..${commitSha}`]).status, 0);

    // Worktree empties allowlist without staging; committed ref and staged index still pass
    writeFixture(repo, "scripts/checks/secret-audit.allowlist.json", JSON.stringify({ allow: [] }));
    assert.equal(run([`--ref=${commitSha}`]).status, 0);
    // Worktree scan itself uses worktree allowlist and blocks
    assert.equal(run([]).status, 1);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
