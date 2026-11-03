import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionListItem } from "@/lib/actions/types";
import type { CommunityEventItem } from "@/lib/community/http";
import { AppError } from "@/lib/errors/app-errors";
import { buildPublicActionReference } from "@/lib/chat/action-sharing";
import { publicAction } from "@/fixtures/public-action";
import { PastActionsPanel } from "./rejoindre-une-action.past-actions";
import { PublicActionContinuity } from "./rejoindre-une-action.public-continuity";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

function communityEvent(canEditOwnOps: boolean): CommunityEventItem {
  return {
    id: "community-event-1",
    createdAt: "2026-08-01T10:00:00.000Z",
    organizerClerkId: null,
    canEditOwnOps,
    title: "Événement historique",
    eventDate: "2026-08-01",
    locationLabel: "Paris",
    location: { label: "Paris", latitude: null, longitude: null, source: null },
    description: null,
    capacityTarget: null,
    attendanceCount: null,
    postMortem: null,
    cleanupObjective: null,
    cleanupZone: null,
    cleanupLogisticsNeeds: null,
    cleanupSupportLevel: null,
    cleanupWasteTypesExpected: [],
    rsvpCounts: { yes: 0, maybe: 0, no: 0, total: 0 },
    myRsvpStatus: null,
  };
}

function pastAction(overrides: Record<string, unknown> = {}): ActionListItem {
  return {
    id: "past-action",
    created_at: "2026-08-01T10:00:00.000Z",
    action_date: "2026-08-01",
    location_label: "Quai de Seine",
    contract: { geometry: { coordinates: [] }, metadata: { actionPhase: "post_action_complete" } },
    ...overrides,
  } as unknown as ActionListItem;
}

function participationHistory(overrides: Record<string, unknown> = {}) {
  return {
    id: "past-action",
    participationSource: "post_action_claim",
    participantsCount: 3,
    ...overrides,
  } as unknown as import("@/lib/actions/participation/group-participation").JoinableActionHistoryItem;
}

describe("PastActionsPanel", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders English loading, error and empty states without exposing private controls", () => {
    const loading = renderToStaticMarkup(<PastActionsPanel items={[]} loading fr={false} error={null} />);
    expect(loading).toContain("Loading past actions...");
    expect(loading).not.toContain("I participated in this action");

    const error = renderToStaticMarkup(<PastActionsPanel items={[]} loading={false} fr={false} error="History unavailable" />);
    expect(error).toContain("History unavailable");
    expect(error).toContain('role="alert"');

    const empty = renderToStaticMarkup(<PastActionsPanel items={[]} loading={false} fr={false} error={null} />);
    expect(empty).toContain("No public past action yet.");
  });

  it("renders the English confirmed projection and distinguishes unavailable values", () => {
    const markup = renderToStaticMarkup(
      <PastActionsPanel
        items={[pastAction({ waste_kg: 2, cigarette_butts: 4 })]}
        loading={false}
        error={null}
        fr={false}
        authenticated
        historyItems={[participationHistory({
          participationStatus: "confirmed",
          personalImpactAttribution: {
            wasteKg: null,
            wasteKind: "unavailable",
            wasteEquivalentSecKg: null,
            wasteMohsValue: null,
            wasteMohsSource: null,
            cigaretteButts: 1.5,
            cigaretteButtsKind: "quote_part",
            cigaretteButtsProvenance: "counted",
            wasteInconsistent: false,
            cigaretteButtsInconsistent: false,
            wasteMohsEligible: false,
            cigaretteButtsMohsEligible: true,
          },
        })]}
      />,
    );
    expect(markup).toContain("Past actions");
    expect(markup).toContain("Participation confirmed");
    expect(markup).toContain("Your share of the results");
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Calculated share");
    expect(markup).toContain("Action discussion");
  });

  it("keeps community history loading, error and pagination states observable", () => {
    const loading = renderToStaticMarkup(
      <PastActionsPanel items={[]} loading={false} error={null} fr={false} communityPastEvents={[communityEvent(false)]} communityPastEventsLoading />,
    );
    expect(loading).toContain("No public past action yet.");
    expect(loading).toContain("Missions en cours de chargement…");

    const error = renderToStaticMarkup(
      <PastActionsPanel items={[]} loading={false} error={null} fr communityPastEventsError={new AppError({ kind: "network", status: 503, message: "Community history unavailable" })} />,
    );
    expect(error).toContain("Les missions ne sont pas disponibles pour le moment.");

    const paged = renderToStaticMarkup(
      <PastActionsPanel items={[]} loading={false} error={null} fr communityPastEventsHasMore communityPastEventsLoadingMore communityPastEventsLoadMore={vi.fn()} />,
    );
    expect(paged).toContain("Chargement…");
  });

  it("uses safe fallbacks for incomplete public results and keeps share scoped to the action", () => {
    const onShareAction = vi.fn();
    const item = pastAction({
      location_label: "Quartier nord",
      contract: { geometry: { coordinates: [] }, metadata: { actionTitle: "  ", actionPhase: "post_action_complete" } },
      volunteers_count: 99,
      duration_minutes: null,
      waste_kg: null,
      cigarette_butts: null,
      association_name: "",
      actor_name: "",
      notes: "[EVENT_REF]community-event-1",
    });
    const markup = renderToStaticMarkup(<PastActionsPanel items={[item]} loading={false} error={null} fr authenticated={false} onShareAction={onShareAction} />);
    expect(markup).toContain("Quartier nord");
    expect(markup).toContain("Organisateur : —");
    expect(markup).toContain("Localisation seule");
    expect(markup).not.toContain("99 participants déclarés");
    expect(markup).toContain("Partager le résultat");
    expect(markup).toContain("Voir l’événement communautaire");
    expect(markup).not.toContain("userId");
  });

  it("handles successful, invalid and network-failed participation claims through the real component", async () => {
    const item = pastAction();
    const response = (body: unknown, ok = true) => ({ ok, json: async () => body });
    const claimResponses = [
      response({ participationStatus: "pending", participationSource: "post_action_claim" }),
      response({ error: "Already requested" }, false),
      new Error("network down"),
    ];
    const fetchMock = vi.fn((input: unknown) => {
      if (String(input).includes("/participation-claim")) {
        const next = claimResponses.shift();
        return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
      }
      return Promise.resolve(response({}));
    });
    vi.stubGlobal("fetch", fetchMock);

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<PastActionsPanel items={[item]} loading={false} error={null} fr authenticated />);
    });
    const claimButton = () => renderer.root.findAllByType("button").find((node) => node.children.join("").includes("J’ai participé"));
    expect(claimButton()).toBeDefined();

    await act(async () => { claimButton()!.props.onClick(); await Promise.resolve(); });
    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes("/participation-claim"))).toHaveLength(1);
    expect(renderer.root.findAll((node) => node.props.role === "status").some((node) => node.children.join("").includes("Participation à confirmer"))).toBe(true);

    renderer.unmount();
    act(() => {
      renderer = create(<PastActionsPanel items={[item]} loading={false} error={null} fr authenticated />);
    });
    await act(async () => { claimButton()!.props.onClick(); await Promise.resolve(); });
    expect(renderer.root.findAll((node) => node.props.role === "alert").some((node) => node.children.join("").includes("Already requested"))).toBe(true);
    await act(async () => { claimButton()!.props.onClick(); await Promise.resolve(); });
    expect(renderer.root.findAll((node) => node.props.role === "alert").some((node) => node.children.join("").includes("La demande n’a pas pu être envoyée"))).toBe(true);
    renderer.unmount();
  });

  it("transmet le suivi historique au propriétaire et le masque aux autres utilisateurs", () => {
    const getOpsDraft = () => ({ attendanceCount: "4", postMortem: "Retour" });
    const updateOpsDraft = () => undefined;
    const onSaveEventOps = async () => undefined;

    const ownerMarkup = renderToStaticMarkup(
      <PastActionsPanel
        items={[]}
        loading={false}
        error={null}
        fr
        communityPastEvents={[communityEvent(true)]}
        isUpdatingEventOpsId="community-event-1"
        getOpsDraft={getOpsDraft}
        updateOpsDraft={updateOpsDraft}
        onSaveEventOps={onSaveEventOps}
      />,
    );
    expect(ownerMarkup).toContain("Suivi de ma mission");
    expect(ownerMarkup).toContain("Enregistrement…");

    const nonOwnerMarkup = renderToStaticMarkup(
      <PastActionsPanel
        items={[]}
        loading={false}
        error={null}
        fr
        communityPastEvents={[communityEvent(false)]}
        isUpdatingEventOpsId="community-event-1"
        getOpsDraft={getOpsDraft}
        updateOpsDraft={updateOpsDraft}
        onSaveEventOps={onSaveEventOps}
      />,
    );
    expect(nonOwnerMarkup).not.toContain("Suivi de ma mission");
    expect(nonOwnerMarkup).not.toContain("Enregistrer le suivi");
  });

  it("affiche les états de succès et d'erreur du suivi historique", () => {
    const successMarkup = renderToStaticMarkup(
      <PastActionsPanel
        items={[]}
        loading={false}
        error={null}
        fr
        communitySuccessMessage="Suivi de la mission mis à jour."
      />,
    );
    expect(successMarkup).toContain("Suivi de la mission mis à jour.");

    const errorMarkup = renderToStaticMarkup(
      <PastActionsPanel
        items={[]}
        loading={false}
        error={null}
        fr
        communityMutationError={new AppError({ kind: "permission", status: 403, message: "Forbidden" })}
      />,
    );
    expect(errorMarkup).toContain("Le suivi de la mission n’a pas été enregistré");
    expect(errorMarkup).toContain("Forbidden");
  });

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
    const item = pastAction();

    const markup = renderToStaticMarkup(
      <PastActionsPanel items={[item]} loading={false} error={null} fr authenticated={false} />,
    );

    expect(markup).toContain("J’ai participé à cette action");
    expect(markup).toContain("/sign-in?redirect_url=%2Fsections%2Frejoindre-une-action%3Ftab%3Dpast");
  });

  it("affiche l'état canonique d'une demande existante au lieu du CTA", () => {
    const item = pastAction();
    const historyItem = participationHistory({ participationStatus: "pending", participantsCount: 2 });

    const markup = renderToStaticMarkup(
      <PastActionsPanel items={[item]} loading={false} error={null} fr authenticated historyItems={[historyItem]} />,
    );

    expect(markup).toContain("Participation à confirmer");
    expect(markup).not.toContain("Votre part des résultats");
    expect(markup).not.toContain("J’ai participé à cette action");
  });

  it("affiche la projection canonique et la provenance de chaque métrique", () => {
    const item = pastAction({ waste_kg: 9, cigarette_butts: 12 });
    const historyItem = participationHistory({
      participationStatus: "confirmed",
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
    });

    const markup = renderToStaticMarkup(
      <PastActionsPanel items={[item]} loading={false} error={null} fr authenticated historyItems={[historyItem]} />,
    );

    expect(markup).toContain("Votre part des résultats");
    expect(markup).toContain("10 kg");
    expect(markup).toContain("Mesure individuelle");
    expect(markup).toContain("4 mégots");
    expect(markup).toContain("Quote-part calculée");
    expect(markup).toContain("Une quote-part calculée n’est pas une mesure physique individuelle");
    expect(markup).toContain("Voir ma progression actuelle");
    expect(markup).toContain('href="/sections/gamification"');
    expect(markup).not.toContain("3 kg");
    expect(markup).toContain("Discussion de l’action");
    expect(markup).toContain("/sections/messagerie?channel=action&amp;actionId=past-action");
  });

  it("affiche l’indisponibilité sans inventer une mesure", () => {
    const item = pastAction();
    const historyItem = participationHistory({
      participationStatus: "confirmed",
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
    });

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
    const item = pastAction();
    const historyItem = participationHistory({
      participationStatus: "cancelled",
      personalImpactAttribution: null,
    });

    const markup = renderToStaticMarkup(
      <PastActionsPanel items={[item]} loading={false} error={null} fr authenticated historyItems={[historyItem]} />,
    );

    expect(markup).toContain("Demande refusée");
    expect(markup).not.toContain("Votre part des résultats");
  });

  it("affiche la projection publique 6D1 et les suggestions bornées", () => {
    const reference = buildPublicActionReference(
      {
        ...publicAction,
        action_date: "2026-08-01",
        action_phase: "post_action_complete",
      },
      null,
      {
        thanksMessage: "Merci à toutes et tous",
        workedWell: "Bonne coordination",
        blockers: null,
        improveNextTime: null,
        publishedAt: "2026-08-02T10:00:00.000Z",
        updatedAt: "2026-08-02T10:00:00.000Z",
      },
      {
        recommendations: [{
          id: "future-action",
          title: "Nettoyage du quartier",
          actionDate: "2026-08-15",
          eventStartTime: "09:30",
          sector: "11e arrondissement",
        }],
      },
    );
    const markup = renderToStaticMarkup(
      <PublicActionContinuity
        fr
        state={{ actionId: reference.id, loading: false, error: null, reference }}
      />,
    );

    expect(markup).toContain("Merci aux participants");
    expect(markup).toContain("Retour d’expérience");
    expect(markup).toContain("Prochaines actions près de ce secteur");
    expect(markup).toContain("Nettoyage du quartier");
    expect(markup).toContain("11e arrondissement");
    expect(markup).not.toContain("authoredByClerkId");
  });
});
