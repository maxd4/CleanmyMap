import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { NotificationListItem } from "./notification-list-item";

const notification = {
  id: "notification-1",
  type: "validation" as const,
  title: "Validation terminée",
  content: "Votre action a été approuvée.",
  read_at: null,
  created_at: new Date().toISOString(),
  payload: null,
};

describe("notification list item", () => {
  it("exposes the unread marker and compact copy limits", () => {
    const markup = renderToStaticMarkup(
      <NotificationListItem
        notification={notification}
        locale="fr"
        compact
        onClick={vi.fn()}
      />,
    );

    expect(markup).toContain('aria-label="Non lue"');
    expect(markup).toContain("line-clamp-1");
    expect(markup).toContain("line-clamp-2");
    expect(markup).toContain("Validation terminée");
  });

  it("keeps read entries distinguishable without the unread marker", () => {
    const markup = renderToStaticMarkup(
      <NotificationListItem
        notification={{ ...notification, read_at: new Date().toISOString() }}
        locale="fr"
        onClick={vi.fn()}
      />,
    );

    expect(markup).not.toContain('aria-label="Non lue"');
    expect(markup).toContain("Validation terminée");
  });
});
