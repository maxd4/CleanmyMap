import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./notification-bell.tsx", import.meta.url), "utf8");
const itemSource = readFileSync(
  new URL("../notifications/notification-list-item.tsx", import.meta.url),
  "utf8",
);

describe("notification bell compact preview contract", () => {
  it("renders at most four notifications in the preview", () => {
    expect(source).toContain("visibleNotifications.slice(0, 4)");
    expect(source).toContain("previewNotifications.map");
    expect(source).not.toContain("visibleNotifications.map");
  });

  it("uses the responsive 22rem width and clamps preview copy", () => {
    expect(source).toContain('w-[min(22rem,calc(100vw-1rem))]');
    expect(itemSource).toContain('compact ? "line-clamp-1"');
    expect(itemSource).toContain('compact ? "line-clamp-2"');
  });

  it("keeps Open before Close and targets the notifications anchor", () => {
    expect(source.indexOf('href="/dashboard#notifications"')).toBeGreaterThanOrEqual(0);
    expect(source.indexOf("Ouvrir")).toBeLessThan(source.indexOf("Fermer"));
    expect(source).toContain('onClick={() => setIsOpen(false)}');
  });

  it("keeps read state, type icon and relative date in the shared item", () => {
    expect(itemSource).toContain("notification.read_at");
    expect(itemSource).toContain("notification.type");
    expect(itemSource).toContain("formatDistanceToNow");
  });

  it("isolates the compact preview per Clerk identity", () => {
    expect(source).toContain("key={identityKey}");
    expect(source).toContain("useNotificationRequestIdentity");
  });

  it("guards fetch, read and navigation after an identity change", () => {
    expect(source).toContain("const request = getRequest()");
    expect(source).toContain("if (!isCurrentRequest(request))");
    expect(source).toContain("markReadInFlightRef");
    expect(source).toContain("buildChatNotificationHref");
  });
});
