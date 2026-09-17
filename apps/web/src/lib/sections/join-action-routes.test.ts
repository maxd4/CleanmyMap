import { describe, expect, it } from "vitest";
import {
  buildJoinActionHref,
  buildJoinActionTabHref,
  buildLegacyJoinActionRedirect,
} from "./join-action-routes";

describe("join action routes", () => {
  it("uses the canonical route for action links", () => {
    expect(buildJoinActionHref("action 42")).toBe(
      "/sections/rejoindre-une-action?actionId=action%2042",
    );
  });

  it("builds deterministic tab links while preserving the focused action", () => {
    expect(buildJoinActionTabHref("past", "action-42")).toBe(
      "/sections/rejoindre-une-action?tab=past&actionId=action-42",
    );
  });

  it("preserves unrelated query parameters when changing tabs", () => {
    expect(
      buildJoinActionTabHref("past", "action-42", "tab=future&actionId=action-42&source=guide&tag=terrain&tag=safety"),
    ).toBe(
      "/sections/rejoindre-une-action?tab=past&source=guide&tag=terrain&tag=safety&actionId=action-42",
    );
  });

  it("preserves legacy query parameters during compatibility redirect", () => {
    expect(
      buildLegacyJoinActionRedirect({ actionId: "action 42", tab: ["future", "past"] }),
    ).toBe(
      "/sections/rejoindre-une-action?actionId=action+42&tab=future&tab=past",
    );
  });
});
