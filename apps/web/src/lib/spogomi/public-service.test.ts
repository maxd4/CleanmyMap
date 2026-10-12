import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { classifySpogomiPublicLifecycle, normalizeSpogomiEventSlug } from "./public-service";

describe("SPOGOMI public identity and lifecycle", () => {
  it("normalizes a stable URL slug without accents or unsafe separators", () => {
    expect(normalizeSpogomiEventSlug("Coupe d'été — Paris 2026")).toBe("coupe-d-ete-paris-2026");
    expect(normalizeSpogomiEventSlug("***")).toBe("evenement-spogomi");
  });

  it("classifies only from event dates and terminal states", () => {
    const now = new Date("2026-10-12T12:00:00.000Z");
    expect(classifySpogomiPublicLifecycle("2026-10-13T12:00:00.000Z", null, "draft", now)).toBe("upcoming");
    expect(classifySpogomiPublicLifecycle("2026-10-12T10:00:00.000Z", "2026-10-12T14:00:00.000Z", "in_progress", now)).toBe("in_progress");
    expect(classifySpogomiPublicLifecycle("2026-10-11T10:00:00.000Z", "2026-10-11T14:00:00.000Z", "in_progress", now)).toBe("finished");
    expect(classifySpogomiPublicLifecycle("2026-10-13T10:00:00.000Z", null, "certified", now)).toBe("finished");
  });
});
