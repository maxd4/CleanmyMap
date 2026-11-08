import { describe, expect, it } from "vitest";

import { resolveDropdownOpenUp } from "./use-dropdown-placement";

describe("dropdown placement", () => {
  it("opens below when the trigger has enough room", () => {
    expect(resolveDropdownOpenUp({ top: 80, bottom: 124 }, 900)).toBe(false);
  });

  it("opens above when the space below is constrained", () => {
    expect(resolveDropdownOpenUp({ top: 720, bottom: 764 }, 800)).toBe(true);
  });

  it("chooses the side with more room when the measured panel fits on neither side", () => {
    expect(resolveDropdownOpenUp({ top: 297, bottom: 341 }, 640, 12, 296)).toBe(false);
    expect(resolveDropdownOpenUp({ top: 297, bottom: 341 }, 640, 12, 280)).toBe(false);
  });
});
