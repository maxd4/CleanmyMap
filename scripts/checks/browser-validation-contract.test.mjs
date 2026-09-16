import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("browser validation contract", () => {
  it("keeps the official Clerk Playwright lane strict and bypass-free", () => {
    const config = read("playwright.config.ts");

    assert.match(config, /const baseURL = "http:\/\/127\.0\.0\.1:3000"/);
    assert.doesNotMatch(config, /PLAYWRIGHT_BASE_URL/);
    assert.match(config, /DEV_STRICT_PORT: process\.env\.DEV_STRICT_PORT \?\? "1"/);
    assert.match(config, /CMM_DISABLE_DEV_AUTH_BYPASS: "1"/);
    const globalSetup = read("e2e/global.setup.ts");
    assert.match(globalSetup, /clerkSetup/);
    assert.match(globalSetup, /storageState/);
  });

  it("requires the auth-surface announcement and separates Clerk client auth from bypass auth", () => {
    const skill = read(".agents/skills/cleanmymap-ui-testing/SKILL.md");
    const mirror = read(".codex/skills/cleanmymap-ui-testing/SKILL.md");
    const securityPlaybook = read("documentation/security/CODEX_SECURITY_PLAYBOOK.md");
    const testingGuide = read("documentation/development/TESTING.md");
    const requiredFields = [
      "AUTH_SURFACE",
      "BROWSER_HARNESS",
      "AUTH_MODE",
      "HOST_URL",
      "ROLE",
      "PERSISTENCE",
    ];

    assert.equal(mirror, skill);
    for (const content of [skill, securityPlaybook, testingGuide]) {
      for (const field of requiredFields) {
        assert.match(content, new RegExp(`${field}:`));
      }
      assert.match(content, /PROTECTED_CLERK_CLIENT/);
      assert.match(content, /CMM_DISABLE_DEV_AUTH_BYPASS=.?1/);
      assert.match(content, /127\.0\.0\.1:3000/);
      assert.match(content, /(?:bypass\s+serveur[\s\S]{0,20}(?:insuffisant|suffit pas)|server\s+bypass[\s\S]{0,30}not sufficient)/i);
      assert.doesNotMatch(content, /aucune vraie connexion Clerk n'est nécessaire/i);
    }
  });
});
