import * as React from "react";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { AppNotification } from "@/lib/notifications/client";
import { NotificationListItem } from "./notification-list-item";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type DecisionButtonProps = { onClick: () => void; disabled?: boolean };
type MuteButtonProps = { onClick: (event: React.MouseEvent<HTMLButtonElement>) => void };

function propsOf<Props>(node: ReactTestInstance): Props {
  return node.props as unknown as Props;
}

const notification: AppNotification = {
  id: "notification-action-1",
  type: "action_event",
  title: "Résultats disponibles",
  content: "Indiquez si vous avez participé.",
  read_at: null,
  created_at: "2026-10-26T10:00:00.000Z",
  payload: { eventType: "action_event", subtype: "action_result", actionId: "action-1" },
};

function renderItem(overrides: Partial<React.ComponentProps<typeof NotificationListItem>> = {}) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <NotificationListItem
        notification={notification}
        locale="fr"
        onClick={vi.fn()}
        {...overrides}
      />,
    );
  });
  return renderer;
}

function renderedText(renderer: ReturnType<typeof create>): string {
  return JSON.stringify(renderer.toJSON());
}

describe("NotificationListItem interactive behavior", () => {
  it("routes each explicit answer and keeps the notification opener separate", async () => {
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
    await act(async () => { propsOf<DecisionButtonProps>(claim).onClick(); });
    await act(async () => { propsOf<DecisionButtonProps>(decline).onClick(); });

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

  it("offers the optional-information mute action without hijacking notification navigation", async () => {
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
    const stopPropagation = vi.fn();
    await act(async () => { propsOf<MuteButtonProps>(mute).onClick({ stopPropagation } as unknown as React.MouseEvent<HTMLButtonElement>); });

    expect(onMuteAction).toHaveBeenCalledWith("action-1");
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
    renderer.unmount();
  });

  it("renders every supported notification icon and the compact/read visual states", () => {
    const types: AppNotification["type"][] = [
      "validation",
      "security",
      "community",
      "chat",
      "action_discussion",
      "action_event",
      "system",
      "gamification_reconciliation",
      "gamification_recognition",
    ];

    for (const type of types) {
      const renderer = renderItem({
        notification: { ...notification, type },
        compact: type !== "system",
        displayState: type === "system" ? "read" : "unread",
      });
      expect(renderer.root.findByType("article").props["data-notification-state"]).toBe(type === "system" ? "read" : "unread");
      renderer.unmount();
    }
  });

  it("announces each persisted outcome and the unavailable withdrawn state in both locales", () => {
    const outcomes = [
      ["accepted", "Acceptée", "Accepted"],
      ["rejected", "Refusée", "Refused"],
      ["withdrawn", "Retirée", "Withdrawn"],
      ["claim", "Demande envoyée", "Claim submitted"],
      ["not_participated", "Je n'ai pas participé", "Not participated"],
    ] as const;

    for (const [decision, french, english] of outcomes) {
      const treated = renderItem({
        notification: { ...notification, payload: { decision } },
        displayState: "treated",
      });
      expect(renderedText(treated)).toContain(french);
      treated.unmount();

      const en = renderItem({
        notification: { ...notification, payload: { decision } },
        locale: "en",
        displayState: "treated",
      });
      expect(renderedText(en)).toContain(english);
      en.unmount();
    }

    const unavailable = renderItem({
      notification: { ...notification, payload: { decision: "withdrawn" } },
      locale: "en",
      displayState: "unavailable",
    });
    expect(renderedText(unavailable)).toContain("Withdrawn");
    unavailable.unmount();

    const fallback = renderItem({ displayState: "unavailable" });
    expect(renderedText(fallback)).toContain("Obsolète");
    fallback.unmount();
  });

  it("labels action events, updates, cancellations and invalid payloads without inventing labels", () => {
    const staticLabels: Array<[string, string]> = [
      ["action_reminder", "Rappel J-1"],
      ["invitation", "Invitation de l'organisateur"],
      ["registration_request", "Demande d'inscription"],
      ["registration_decision", "Suivi de votre demande"],
      ["action_result", "Résultats disponibles"],
      ["action_result_impact", "Participation confirmée et résultats disponibles"],
      ["administrative_requirements", "Démarches administratives à finaliser"],
      ["post_action_claim", "Réclamation de participation"],
      ["post_action_claim_decision", "Résultat de votre réclamation"],
      ["role_attestation_decision", "Décision sur votre mission"],
    ];

    for (const [subtype, label] of staticLabels) {
      const renderer = renderItem({
        notification: { ...notification, payload: { eventType: "action_event", subtype } },
      });
      expect(renderedText(renderer)).toContain(label);
      renderer.unmount();
    }

    const updateCases: Array<[unknown, string]> = [
      [["cancellation", "schedule"], "Action annulée"],
      [["schedule", "meeting_point"], "Horaire modifié · Rendez-vous modifié"],
      [["invalid"], "Action modifiée"],
      [undefined, "Action modifiée"],
    ];
    for (const [changeKinds, label] of updateCases) {
      const renderer = renderItem({
        notification: {
          ...notification,
          type: "action_event",
          payload: { eventType: "action_event", subtype: "action_update", changeKinds },
        },
      });
      expect(renderedText(renderer)).toContain(label);
      renderer.unmount();
    }

    const english = renderItem({
      locale: "en",
      notification: { ...notification, type: "action_event", payload: { eventType: "action_event", subtype: "action_update", changeKinds: ["route"] } },
    });
    expect(renderedText(english)).toContain("Route updated");
    english.unmount();

    const unknown = renderItem({
      notification: { ...notification, type: "action_event", payload: { eventType: "action_event", subtype: "unknown" } },
    });
    expect(renderedText(unknown)).not.toContain("unknown");
    unknown.unmount();

    const malformed = renderItem({
      notification: { ...notification, type: "action_event", payload: { eventType: "action_event", subtype: 42 } as unknown as AppNotification["payload"] },
    });
    expect(renderedText(malformed)).not.toContain("42");
    malformed.unmount();
  });

  it("covers decision variants, English actions, and action hints", async () => {
    const onDecision = vi.fn();
    const request = renderItem({
      locale: "en",
      notification: { ...notification, payload: { requestKind: "action_share", requestId: "request-1" } },
      displayState: "decision_pending",
      decision: { kind: "action_share", state: "decision_pending", onDecision },
    });
    const accept = request.root.findByProps({ "aria-label": "Accept request" });
    await act(async () => {
      propsOf<DecisionButtonProps>(accept).onClick();
    });
    expect(request.root.findByProps({ "aria-label": "Reject request" })).toBeTruthy();
    expect(onDecision).toHaveBeenCalledWith("accept");
    request.unmount();

    for (const state of ["treated", "unavailable"] as const) {
      const renderer = renderItem({
        displayState: state,
        decision: { kind: "action_share", state, onDecision: vi.fn() },
      });
      expect(renderer.root.findAllByProps({ "aria-label": "Accepter la demande" })).toHaveLength(0);
      renderer.unmount();
    }

    for (const locale of ["fr", "en"] as const) {
      const renderer = renderItem({
        locale,
        compact: locale === "en",
        notification: { ...notification, type: "gamification_reconciliation" },
      });
      expect(renderedText(renderer)).toContain(locale === "fr" ? "Voir les changements" : "View changes");
      renderer.unmount();
    }

    const noMuteCallback = renderItem({
      notification: { ...notification, type: "action_event", payload: { subtype: "action_update" } },
    });
    expect(noMuteCallback.root.findAllByProps({ children: "Masquer les informations de cette action" })).toHaveLength(0);
    noMuteCallback.unmount();
  });
});
