import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./dashboard-notifications-section.tsx", import.meta.url),
  "utf8",
);

describe("dashboard notifications section contract", () => {
  it("uses the existing app_notifications client without dashboard polling", () => {
    expect(source).toContain('id="notifications"');
    expect(source).toContain("loadNotificationsForCurrentUser");
    expect(source).toContain("markNotificationAsReadForCurrentUser");
    expect(source).not.toContain("setInterval");
    expect(source).not.toContain("window.setInterval");
  });

  it("covers loading, empty, error and full-list states", () => {
    expect(source).toContain("Chargement des notifications");
    expect(source).toContain("Aucune notification");
    expect(source).toContain("Les notifications sont momentanément indisponibles.");
    expect(source).toContain("visibleNotifications.map");
  });
});
