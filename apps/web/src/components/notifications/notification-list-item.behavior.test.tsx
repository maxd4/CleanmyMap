import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { AppNotification } from "@/lib/notifications/client";
import { NotificationListItem } from "./notification-list-item";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const notification: AppNotification = {
  id: "notification-action-1",
  type: "action_event",
  title: "Résultats disponibles",
  content: "Indiquez si vous avez participé.",
  read_at: null,
  created_at: "2026-10-26T10:00:00.000Z",
  payload: { eventType: "action_event", subtype: "action_result", actionId: "action-1" },
};

describe("NotificationListItem interactive behavior", () => {
  it("routes each explicit answer and keeps the notification opener separate", () => {
    const onDecision = vi.fn();
    const onClick = vi.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <NotificationListItem
          notification={notification}
          locale="fr"
          displayState="decision_pending"
          decision={{ kind: "action_result", state: "decision_pending", onDecision }}
          onClick={onClick}
        />,
      );
    });

    const claim = renderer.root.findByProps({ "aria-label": "Indiquer que j'ai participé" });
    const decline = renderer.root.findByProps({ "aria-label": "Indiquer que je n'ai pas participé" });
    act(() => claim.props.onClick());
    act(() => decline.props.onClick());

    expect(onDecision).toHaveBeenNthCalledWith(1, "claim");
    expect(onDecision).toHaveBeenNthCalledWith(2, "not_participated");
    expect(renderer.root.findAllByProps({ "aria-label": "Ouvrir la notification : Résultats disponibles" })).toHaveLength(1);
    expect(onClick).not.toHaveBeenCalled();
    renderer.unmount();
  });

  it("disables both decisions during a request and announces a recoverable error", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <NotificationListItem
          notification={notification}
          locale="fr"
          displayState="decision_pending"
          decision={{
            kind: "action_result",
            state: "decision_pending",
            busy: true,
            error: "Cette décision n'a pas pu être enregistrée.",
            onDecision: vi.fn(),
          }}
          onClick={vi.fn()}
        />,
      );
    });

    expect(renderer.root.findByProps({ "aria-label": "Indiquer que j'ai participé" }).props.disabled).toBe(true);
    expect(renderer.root.findByProps({ "aria-label": "Indiquer que je n'ai pas participé" }).props.disabled).toBe(true);
    expect(renderer.root.findByProps({ role: "status" }).props.children).toBe("Traitement…");
    expect(renderer.root.findByProps({ role: "alert" }).props.children).toBe("Cette décision n'a pas pu être enregistrée.");
    renderer.unmount();
  });

  it("offers the optional-information mute action without hijacking notification navigation", () => {
    const onMuteAction = vi.fn();
    const onClick = vi.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <NotificationListItem
          notification={{
            ...notification,
            type: "action_event",
            payload: { eventType: "action_event", subtype: "action_update", actionId: "action-1", changeKinds: ["schedule"] },
          }}
          locale="fr"
          compact
          onClick={onClick}
          onMuteAction={onMuteAction}
        />,
      );
    });

    const mute = renderer.root.findByProps({ children: "Masquer les informations de cette action" });
    act(() => mute.props.onClick({ stopPropagation: vi.fn() }));

    expect(onMuteAction).toHaveBeenCalledWith("action-1");
    expect(onClick).not.toHaveBeenCalled();
    renderer.unmount();
  });
});
