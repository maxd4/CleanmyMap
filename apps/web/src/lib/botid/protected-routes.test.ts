import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BOT_ID_BASIC_PROTECTED_PATHS,
  BOT_ID_BASIC_PROTECTED_ROUTES,
} from "./protected-routes";

describe("BotID protected route contract", () => {
  it("protects only the remaining anonymous browser-triggered POST routes", () => {
    expect(BOT_ID_BASIC_PROTECTED_PATHS).toEqual([
      "/api/contact",
      "/api/newsletter/subscribe",
      "/api/gamification/quiz/pedagogical-metrics",
    ]);
    expect(BOT_ID_BASIC_PROTECTED_ROUTES).toHaveLength(3);
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

  it("keeps BotID out of authenticated writes while retaining server AuthN", () => {
    const routes = [
      ["../../app/api/chat/route.ts", "auth()"],
      ["../../app/api/community/bug-reports/route.ts", "auth()"],
      ["../../app/api/community/promotion-requests/route.ts", "auth()"],
      ["../../app/api/partners/onboarding-requests/route.ts", "auth()"],
      ["../../app/api/actions/route.ts", "requireAuthenticatedAccess"],
      ["../../app/api/community/events/route.ts", "auth()"],
    ] as const;

    for (const [relativePath, authMarker] of routes) {
      const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
      expect(source, relativePath).not.toContain("requireBotIdHuman");
      expect(source, relativePath).toContain(authMarker);
    }
  });

  it("keeps the DSA public-write exception outside BotID", () => {
    const source = readFileSync(
      new URL("../../app/api/legal-content-reports/route.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toContain("requireBotIdHuman");
    expect(source).toContain("const { userId } = await auth()");
  });

  it("leaves machine and operations endpoints outside the browser challenge", () => {
    expect(BOT_ID_BASIC_PROTECTED_PATHS).not.toContain("/api/community/events/ops");
    expect(BOT_ID_BASIC_PROTECTED_PATHS).not.toContain("/api/actions/map");
  });
});
