import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LeaderboardOptInSetting } from "./leaderboard-opt-in-setting";

const source = readFileSync(new URL("./leaderboard-opt-in-setting.tsx", import.meta.url), "utf8");

describe("LeaderboardOptInSetting", () => {
  it("starts unchecked and explains the public projection in the canonical settings surface", () => {
    const markup = renderToStaticMarkup(<LeaderboardOptInSetting fr />);

    expect(markup).toContain("Apparaître dans le classement public");
    expect(markup).toContain("nom public");
    expect(markup).toContain("XP validée");
    expect(markup).toContain("Vos contributions détaillées");
    expect(markup).not.toContain('checked=""');
  });

  it("uses only the profile preference API and reports load/save outcomes", () => {
    expect(source).toContain('fetch("/api/users/profile/leaderboard-opt-in"');
    expect(source).toContain('method: "PATCH"');
    expect(source).toContain('role="alert"');
    expect(source).toContain('role="status"');
    expect(source).not.toContain("userId");
    expect(source).not.toContain("xpPending");
  });
});
