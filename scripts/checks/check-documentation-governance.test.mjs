import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findConcurrentActiveRoadmaps, validateDocumentationGovernance } from "./check-documentation-governance.mjs";

function createView(files) {
  return {
    listFiles(prefix) {
      return Object.keys(files).filter((filePath) => filePath.startsWith(`${prefix}/`));
    },
    readText(filePath) {
      return files[filePath];
    },
    exists(filePath) {
      return Object.hasOwn(files, filePath);
    },
  };
}

const DEPENDENCY_ADVISORY_PATH = "documentation/security/dependency-advisory-governance.md";
const DEPENDENCY_ADVISORY_CONTENT = `GHSA-w3rx-r6r6-pgpr\nCVE-2025-71330\nGHSA-5p2g-fcmc-qvqq\nCVE-2025-71329\nGHSA-528h-pc64-c93x\nCVE-2026-71429\nimage-size@2.0.3\napps/mobile/vendor/image-size\nstream-json ^1.9.1\napps/mobile/vendor/stream-json\njayson@4.3.0\nStreamValues\nVerifier\nLes modules de filtres\nrelease upstream compatible\nn'est pas une release npm upstream\nmetro@0.84.5\nmetro@0.87.0\nversion contenant les deux correctifs\napps/web\nAucun asset non fiable ne doit entrer dans un build Metro.\n`;

describe("documentation roadmap governance", () => {
  it("rejects two roadmap documents without a distinct historical status", () => {
    const view = createView({
      "documentation/product/roadmap-priorisee.md": "> **Type :** plan `PLAN`\n",
      "documentation/product/roadmap-priorisee-long.md": "> **Statut documentaire :** `PLAN`\n",
    });

    const violations = findConcurrentActiveRoadmaps(view);

    assert.equal(violations.length, 1);
    assert.match(violations[0].snippet, /roadmap-priorisee\.md/);
    assert.match(violations[0].snippet, /roadmap-priorisee-long\.md/);
  });

  it("allows a distinct HISTORY document beside the current plan", () => {
    const view = createView({
      "documentation/product/roadmap-priorisee.md": "> **Type :** plan `PLAN`\n",
      "documentation/product/roadmap-priorisee-2025.md": "> **Type :** archive `HISTORY`\n",
    });

    assert.deepEqual(findConcurrentActiveRoadmaps(view), []);
  });

  it("does not block an internal technical reference to a versioned plan", () => {
    const view = createView({
      "documentation/plans/ateliers_DU.md": "See documentation/plans/rapport_impact/impact_IA.md\n",
      [DEPENDENCY_ADVISORY_PATH]: DEPENDENCY_ADVISORY_CONTENT,
    });

    const violations = validateDocumentationGovernance(view);

    assert.deepEqual(violations, []);
  });

  it("uses the public registry to reject an internal path on a public CURRENT page", () => {
    const view = createView({
      "documentation/plans/ateliers_DU.md": "> Statut documentaire : CURRENT\nConsulter AGENTS.md avant toute modification.\n",
      [DEPENDENCY_ADVISORY_PATH]: DEPENDENCY_ADVISORY_CONTENT,
    });

    const violations = validateDocumentationGovernance(view);

    assert.ok(violations.some((violation) =>
      violation.file === "documentation/plans/ateliers_DU.md" && violation.severity === "BLOCKING",
    ));
  });

  it("does not infer actual site exposure from a public header alone", () => {
    const view = createView({
      "documentation/development/fixture.md": "> Statut documentaire : CURRENT\n> Audience : public\nConsulter AGENTS.md avant toute modification.\n",
      [DEPENDENCY_ADVISORY_PATH]: DEPENDENCY_ADVISORY_CONTENT,
    });
    assert.deepEqual(validateDocumentationGovernance(view), []);
  });

  it("blocks a link from a public document to an unlisted internal plan", () => {
    const view = createView({
      "documentation/legal/charte-benevole.md": "> Statut documentaire : CURRENT\nVoir documentation/plans/private-review-plan.md.\n",
      [DEPENDENCY_ADVISORY_PATH]: DEPENDENCY_ADVISORY_CONTENT,
    });
    const findings = validateDocumentationGovernance(view);
    assert.ok(findings.some((finding) =>
      finding.file === "documentation/legal/charte-benevole.md"
      && finding.pattern === "internal-reference-in-public-destination"
      && /unlisted plan reference/.test(finding.snippet),
    ));
  });

  it("keeps a listed public document under governance even without a public header", () => {
    const view = createView({
      "documentation/legal/charte-benevole.md": "> Statut documentaire : CURRENT\nConsulter AGENTS.md avant toute modification.\n",
      [DEPENDENCY_ADVISORY_PATH]: DEPENDENCY_ADVISORY_CONTENT,
    });
    const findings = validateDocumentationGovernance(view);
    assert.ok(findings.some((finding) =>
      finding.file === "documentation/legal/charte-benevole.md" && finding.severity === "BLOCKING",
    ));
  });

  it("keeps historical-public internal references visible as warnings", () => {
    const view = createView({
      "documentation/plans/ateliers_DU.md": "> Statut documentaire : HISTORY\nVoir plans/ancien-plan.md.\n",
      [DEPENDENCY_ADVISORY_PATH]: DEPENDENCY_ADVISORY_CONTENT,
    });
    const findings = validateDocumentationGovernance(view);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, "WARNING");
  });

  it("accepts compliant MDX and keeps documentary exclusions", () => {
    const view = createView({
      "documentation/features/fixture.mdx": "# Public feature\n\nNo internal reference.\n",
      "documentation/plans/fixture.mdx": "See plans/internal-roadmap.md\n",
      "documentation/specs/README.md": "See AGENTS.md and plans/internal-roadmap.md\n",
      [DEPENDENCY_ADVISORY_PATH]: DEPENDENCY_ADVISORY_CONTENT,
    });

    const violations = validateDocumentationGovernance(view);

    assert.deepEqual(violations, []);
  });

  it("reports broken links in AI discovery indexes as non-blocking warnings", () => {
    const view = createView({
      "documentation/development/AI_DEVELOPER_GUIDE.md": "See [Missing](../features/renamed-missing.md) and [MissingDir](../../apps/web/src/lib/missing-dir/).\n",
      [DEPENDENCY_ADVISORY_PATH]: DEPENDENCY_ADVISORY_CONTENT,
    });

    const violations = validateDocumentationGovernance(view);

    assert.equal(violations.length, 2);
    assert.ok(violations.every((v) => v.pattern === "broken-discovery-link" && v.severity === "WARNING"));
  });
});
