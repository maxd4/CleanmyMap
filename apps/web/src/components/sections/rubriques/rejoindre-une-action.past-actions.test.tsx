import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ActionListItem } from "@/lib/actions/types";
import { PastActionsPanel } from "./rejoindre-une-action.past-actions";

describe("PastActionsPanel", () => {
  it("affiche uniquement les résultats finaux disponibles", () => {
    const item = {
      id: "past-action",
      created_at: "2026-08-01T10:00:00.000Z",
      actor_name: "Alex",
      association_name: "Association locale",
      action_date: "2026-08-01",
      location_label: "Quai de Seine",
      latitude: null,
      longitude: null,
      waste_kg: 12,
      cigarette_butts: 34,
      volunteers_count: 99,
      duration_minutes: 62,
      notes: null,
      status: "approved",
      record_type: "action",
      geometry_kind: "polyline",
      contract: {
        geometry: { coordinates: [[2.3, 48.8]] },
        metadata: {
          preparationData: { actionTitle: "Nettoyage des berges" },
          volunteerParticipation: { participantsCount: 7 },
          actionPhase: "post_action_complete",
        },
      },
    } as unknown as ActionListItem;

    const markup = renderToStaticMarkup(
      <PastActionsPanel items={[item]} loading={false} error={null} fr />,
    );

    expect(markup).toContain("Actions passées");
    expect(markup).toContain("Nettoyage des berges");
    expect(markup).toContain("7 participants déclarés");
    expect(markup).toContain("12 kg collectés");
    expect(markup).toContain("34 mégots collectés");
    expect(markup).toContain("Organisateur : Association locale");
    expect(markup).not.toContain("Clean River Paris");
    expect(markup).toContain("Parcours final/opérationnel disponible");
    expect(markup).not.toContain("participants prévus");
    expect(markup).not.toContain("Rejoindre");
  });

  it("expose le CTA anonyme vers le flux d'authentification canonique", () => {
    const item = {
      id: "past-action",
      created_at: "2026-08-01T10:00:00.000Z",
      action_date: "2026-08-01",
      location_label: "Quai de Seine",
      contract: { geometry: { coordinates: [] }, metadata: { actionPhase: "post_action_complete" } },
    } as unknown as ActionListItem;

    const markup = renderToStaticMarkup(
      <PastActionsPanel items={[item]} loading={false} error={null} fr authenticated={false} />,
    );

    expect(markup).toContain("J’ai participé à cette action");
    expect(markup).toContain("/sign-in?redirect_url=%2Fsections%2Frejoindre-une-action%3Ftab%3Dpast");
  });

  it("affiche l'état canonique d'une demande existante au lieu du CTA", () => {
    const item = {
      id: "past-action",
      created_at: "2026-08-01T10:00:00.000Z",
      action_date: "2026-08-01",
      location_label: "Quai de Seine",
      contract: { geometry: { coordinates: [] }, metadata: { actionPhase: "post_action_complete" } },
    } as unknown as ActionListItem;
    const historyItem = {
      id: "past-action",
      participationStatus: "pending",
      participationSource: "post_action_claim",
      participantsCount: 2,
    } as unknown as import("@/lib/actions/participation/group-participation").JoinableActionHistoryItem;

    const markup = renderToStaticMarkup(
      <PastActionsPanel items={[item]} loading={false} error={null} fr authenticated historyItems={[historyItem]} />,
    );

    expect(markup).toContain("Participation à confirmer");
    expect(markup).not.toContain("Votre part des résultats");
    expect(markup).not.toContain("J’ai participé à cette action");
  });

  it("affiche la projection canonique et la provenance de chaque métrique", () => {
    const item = {
      id: "past-action",
      created_at: "2026-08-01T10:00:00.000Z",
      action_date: "2026-08-01",
      location_label: "Quai de Seine",
      waste_kg: 9,
      cigarette_butts: 12,
      contract: { geometry: { coordinates: [] }, metadata: { actionPhase: "post_action_complete" } },
    } as unknown as ActionListItem;
    const historyItem = {
      id: "past-action",
      participationStatus: "confirmed",
      participationSource: "post_action_claim",
      participantsCount: 3,
      personalImpactAttribution: {
        wasteKg: 10,
        wasteKind: "individual",
        wasteEquivalentSecKg: 10,
        wasteMohsValue: 10,
        wasteMohsSource: "equivalent_sec",
        cigaretteButts: 4,
        cigaretteButtsKind: "quote_part",
        cigaretteButtsProvenance: "counted",
        wasteInconsistent: false,
        cigaretteButtsInconsistent: false,
        wasteMohsEligible: true,
        cigaretteButtsMohsEligible: true,
      },
    } as unknown as import("@/lib/actions/participation/group-participation").JoinableActionHistoryItem;

    const markup = renderToStaticMarkup(
      <PastActionsPanel items={[item]} loading={false} error={null} fr authenticated historyItems={[historyItem]} />,
    );

    expect(markup).toContain("Votre part des résultats");
    expect(markup).toContain("10 kg");
    expect(markup).toContain("Mesure individuelle");
    expect(markup).toContain("4 mégots");
    expect(markup).toContain("Quote-part calculée");
    expect(markup).toContain("Une quote-part calculée n’est pas une mesure physique individuelle");
    expect(markup).not.toContain("3 kg");
    expect(markup).toContain("Discussion de l’action");
    expect(markup).toContain("/sections/messagerie?channel=action&amp;actionId=past-action");
  });

  it("affiche l’indisponibilité sans inventer une mesure", () => {
    const item = {
      id: "past-action",
      created_at: "2026-08-01T10:00:00.000Z",
      action_date: "2026-08-01",
      location_label: "Quai de Seine",
      contract: { geometry: { coordinates: [] }, metadata: { actionPhase: "post_action_complete" } },
    } as unknown as ActionListItem;
    const historyItem = {
      id: "past-action",
      participationStatus: "confirmed",
      participationSource: "post_action_claim",
      participantsCount: 3,
      personalImpactAttribution: {
        wasteKg: null,
        wasteKind: "unavailable",
        wasteEquivalentSecKg: null,
        wasteMohsValue: null,
        wasteMohsSource: null,
        cigaretteButts: null,
        cigaretteButtsKind: "unavailable",
        cigaretteButtsProvenance: null,
        wasteInconsistent: true,
        cigaretteButtsInconsistent: true,
        wasteMohsEligible: false,
        cigaretteButtsMohsEligible: false,
      },
    } as unknown as import("@/lib/actions/participation/group-participation").JoinableActionHistoryItem;

    const markup = renderToStaticMarkup(
      <PastActionsPanel items={[item]} loading={false} error={null} fr authenticated historyItems={[historyItem]} />,
    );

    expect(markup).toContain("Déchets");
    expect(markup).toContain("Mégots");
    expect(markup).toContain("Indisponible");
    expect(markup).not.toContain("0 kg");
    expect(markup).not.toContain("0 mégots");
  });

  it("n’affiche aucune attribution pour une participation annulée", () => {
    const item = {
      id: "past-action",
      created_at: "2026-08-01T10:00:00.000Z",
      action_date: "2026-08-01",
      location_label: "Quai de Seine",
      contract: { geometry: { coordinates: [] }, metadata: { actionPhase: "post_action_complete" } },
    } as unknown as ActionListItem;
    const historyItem = {
      id: "past-action",
      participationStatus: "cancelled",
      participationSource: "post_action_claim",
      participantsCount: 3,
      personalImpactAttribution: null,
    } as unknown as import("@/lib/actions/participation/group-participation").JoinableActionHistoryItem;

    const markup = renderToStaticMarkup(
      <PastActionsPanel items={[item]} loading={false} error={null} fr authenticated historyItems={[historyItem]} />,
    );

    expect(markup).toContain("Demande refusée");
    expect(markup).not.toContain("Votre part des résultats");
  });
});
