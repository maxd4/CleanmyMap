import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shouldTrackPageview } from "./project-pageview-tracker";

function installMockBrowser() {
  const memory = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    },
  } as unknown as Window);

  return memory;
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("shouldTrackPageview", () => {
  it("tracks the first pageview and then applies a global cooldown", () => {
    const memory = installMockBrowser();

    expect(shouldTrackPageview("/dashboard")).toBe(true);
    expect(memory.get("cleanmymap.funnel.pageviews.last_any")).toBe("0");

    vi.spyOn(Date, "now").mockReturnValue(10_000);
    expect(shouldTrackPageview("/reports")).toBe(false);

    vi.spyOn(Date, "now").mockReturnValue(30_001);
    expect(shouldTrackPageview("/reports")).toBe(true);
  });

  it("still deduplicates the same route within the short route window", () => {
    installMockBrowser();

    expect(shouldTrackPageview("/community")).toBe(true);

    vi.spyOn(Date, "now").mockReturnValue(4_999);
    expect(shouldTrackPageview("/community")).toBe(false);
  });
});
