import { describe, expect, it } from "vitest";
import {
  BOT_ID_BASIC_PROTECTED_PATHS,
  BOT_ID_BASIC_PROTECTED_ROUTES,
} from "./protected-routes";

describe("BotID protected route contract", () => {
  it("protects only the browser-triggered sensitive POST routes", () => {
    expect(BOT_ID_BASIC_PROTECTED_PATHS).toEqual([
      "/api/chat",
      "/api/contact",
      "/api/newsletter/subscribe",
      "/api/community/bug-reports",
      "/api/community/promotion-requests",
      "/api/partners/onboarding-requests",
      "/api/gamification/quiz/pedagogical-metrics",
      "/api/actions",
      "/api/community/events",
    ]);
    expect(BOT_ID_BASIC_PROTECTED_ROUTES).toHaveLength(9);
    expect(BOT_ID_BASIC_PROTECTED_ROUTES).toEqual(
      expect.arrayContaining(
        BOT_ID_BASIC_PROTECTED_PATHS.map((path) => ({
          path,
          method: "POST",
          advancedOptions: { checkLevel: "basic" },
        })),
      ),
    );
  });

  it("leaves machine and operations endpoints outside the browser challenge", () => {
    expect(BOT_ID_BASIC_PROTECTED_PATHS).not.toContain("/api/community/events/ops");
    expect(BOT_ID_BASIC_PROTECTED_PATHS).not.toContain("/api/actions/map");
  });
});
