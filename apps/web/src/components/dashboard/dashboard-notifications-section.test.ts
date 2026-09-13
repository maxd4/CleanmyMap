import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { AppNotification } from "@/lib/notifications/client";
import { appendUniqueNotifications } from "./dashboard-notifications-section";

const source = readFileSync(
  new URL("./dashboard-notifications-section.tsx", import.meta.url),
  "utf8",
);

describe("dashboard notifications section contract", () => {
  it("uses the existing app_notifications client without dashboard polling", () => {
    expect(source).toContain('id="notifications"');
    expect(source).toContain("loadNotificationsPageForCurrentUser");
    expect(source).toContain("markNotificationAsReadForCurrentUser");
    expect(source).not.toContain("setInterval");
    expect(source).not.toContain("window.setInterval");
  });

  it("loads the next cursor page and prevents duplicates", () => {
    expect(source).toContain("loadMoreNotifications");
    expect(source).toContain("nextCursor");
    expect(source).toContain("Afficher plus");

    const notification = (id: string): AppNotification => ({
      id,
      type: "system",
      title: id,
      content: "Contenu",
      read_at: null,
      created_at: "2026-09-13T12:00:00.000Z",
      payload: null,
    });

    expect(
      appendUniqueNotifications(
        [notification("one")],
        [notification("one"), notification("two")],
      ).map((item) => item.id),
    ).toEqual(["one", "two"]);
  });

  it("covers loading, empty, error and full-list states", () => {
    expect(source).toContain("Chargement des notifications");
    expect(source).toContain("Aucune notification");
    expect(source).toContain("Les notifications sont momentanément indisponibles.");
    expect(source).toContain("Fin de l&apos;historique des notifications");
    expect(source).toContain("visibleNotifications.map");
  });
});
