import { describe, expect, it } from "vitest";
import {
  ENGAGEMENT_STATUS_DEFINITIONS,
  resolveEngagementStatus,
} from "./engagement-status";

describe("canonical engagement status", () => {
  it("keeps the qualitative status order separate from badge families", () => {
    expect(ENGAGEMENT_STATUS_DEFINITIONS.map((status) => status.label)).toEqual([
      "Observateur",
      "Contributeur",
      "Référent",
      "Mentor",
      "Coordinateur",
    ]);
    expect(ENGAGEMENT_STATUS_DEFINITIONS.map((status) => status.id)).toEqual([
      "observateur",
      "contributeur",
      "referent",
      "mentor",
      "coordinateur",
    ]);
  });

  it.each([
    [1, "observateur"],
    [3, "contributeur"],
    [6, "referent"],
    [10, "mentor"],
    [14, "coordinateur"],
    [100, "coordinateur"],
  ])("resolves level %s to status %s", (level, expected) => {
    expect(resolveEngagementStatus(level).id).toBe(expected);
  });
});
