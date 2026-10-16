import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const trackingPath = path.join(
  repositoryRoot,
  "documentation/operations/audits/CleanMyMap_SonarCloud_491_suivi_2026-10-14.md",
);
const inventoryPath = path.join(
  repositoryRoot,
  "documentation/operations/audits/CleanMyMap_SonarCloud_491_issues_2026-10-14.json",
);
const securityLotPath = path.join(
  repositoryRoot,
  "documentation/operations/audits/CleanMyMap_SonarCloud_Security_Lot_2026-10-15.md",
);
const findingIdPattern = /AaE[0-9A-Za-z_-]+/g;

function uniqueFindingIds(text) {
  return [...new Set(text.match(findingIdPattern) ?? [])];
}

test("keeps the 491-finding inventory unique and reconciles the security lot", () => {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  const tracking = fs.readFileSync(trackingPath, "utf8");
  const securityLot = fs.readFileSync(securityLotPath, "utf8");
  const inventoryIds = inventory.unresolvedIssues.map((issue) => issue.key);
  const historicalSecurityLot = securityLot.match(
    /^[\s\S]*?(?=^## Lot L02 —)/m,
  )?.[0];
  assert.ok(historicalSecurityLot, "security lot must contain its historical section");
  const securityIds = uniqueFindingIds(historicalSecurityLot);
  const securitySection = tracking.match(
    /## Lot sécurité historique — 21 findings[\s\S]*?(?=## Lot 2A —)/,
  )?.[0];

  assert.equal(inventoryIds.length, 491);
  assert.equal(new Set(inventoryIds).size, 491);
  assert.ok(securitySection, "canonical tracking must contain the security lot");

  const canonicalSecurityIds = securitySection ? uniqueFindingIds(securitySection) : [];
  assert.deepEqual([...canonicalSecurityIds].sort(), [...securityIds].sort());
  assert.equal(canonicalSecurityIds.length, 21);
  for (const id of canonicalSecurityIds) {
    assert.equal(inventoryIds.includes(id), true, `${id} must exist in the source inventory`);
    assert.equal((securitySection.match(new RegExp(id, "g")) ?? []).length, 1, `${id} must be unique`);
  }

  const rows = securitySection.split("\n").filter((line) => line.startsWith("| `AaE"));
  assert.equal(rows.length, 21);
  assert.equal(rows.filter((line) => line.endsWith("| `FIXED_PENDING_SCAN` |")).length, 16);
  assert.equal(rows.filter((line) => line.endsWith("| `FALSE_POSITIVE` |")).length, 5);

  assert.match(tracking, /\| `TO_FIX` \| 248 \|/);
  assert.match(tracking, /\| `FIXED_PENDING_SCAN` \| 236 \|/);
  assert.match(tracking, /\| `BLOCKED` \| 2 \|/);
  assert.match(tracking, /\| `FALSE_POSITIVE` \| 5 \|/);
  assert.equal(248 + 236 + 2 + 5, inventoryIds.length);
  assert.match(
    securitySection,
    /qualifications techniques locales démontrées[\s\S]*SonarCloud/i,
  );
});
