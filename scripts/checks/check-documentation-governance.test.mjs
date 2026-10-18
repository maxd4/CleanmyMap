import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findConcurrentActiveRoadmaps } from "./check-documentation-governance.mjs";

function createView(files) {
  return {
    listFiles(prefix) {
      return Object.keys(files).filter((filePath) => filePath.startsWith(`${prefix}/`));
    },
    readText(filePath) {
      return files[filePath];
    },
  };
}

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
});
