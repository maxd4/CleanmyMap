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
    expect(markup).toContain("il y a");
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
    expect(markup).toContain("/");
  });

  it("does not nest decision buttons inside the notification open button", () => {
    const markup = renderToStaticMarkup(
      <NotificationListItem
        notification={{
          ...notification,
          type: "chat",
          payload: { requestKind: "action_share", requestId: "request-1" },
        }}
        locale="fr"
        displayState="decision_pending"
        decision={{ state: "decision_pending", onDecision: vi.fn() }}
        onClick={vi.fn()}
      />,
    );

    expect(markup).toContain("Accepter");
    expect(markup).toContain("Refuser");
    expect(markup.indexOf("</button><div")).toBeGreaterThan(-1);
  });

  it("keeps the durable decision outcome visible after reload", () => {
    const markup = renderToStaticMarkup(
      <NotificationListItem
        notification={{
          ...notification,
          payload: { requestKind: "action_share", requestId: "request-1", decision: "accepted", decisionState: "treated" },
        }}
        locale="fr"
        displayState="treated"
        onClick={vi.fn()}
      />,
    );

    expect(markup).toContain("Acceptée");
    expect(markup).not.toContain("Indisponible");
  });

  it("labels operational action updates from their canonical change kinds", () => {
    const markup = renderToStaticMarkup(
      <NotificationListItem
        notification={{
          ...notification,
          type: "action_event",
          title: "Horaire modifié",
          content: "Les informations opérationnelles de cette action ont changé.",
          payload: {
            eventType: "action_event",
            subtype: "action_update",
            actionId: "action-1",
            changeKinds: ["schedule"],
          },
        }}
        locale="fr"
        onClick={vi.fn()}
      />,
    );

    expect(markup).toContain("Horaire modifié");
    expect(markup).not.toContain("Demande d'inscription");
  });
});
