import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { describe, expect, it, vi } from "vitest";
import type { JoinableActionItem } from "@/lib/actions/participation/group-participation";
import { JoinFormExplorer } from "./rejoindre-un-formulaire-section.explorer";

function buildItem(): JoinableActionItem {
  return {
    id: "action-1",
    created_at: "2026-09-01T10:00:00.000Z",
    action_date: "2099-09-20",
    location_label: "Quai de Seine",
    actionTitle: "Nettoyage des berges",
    volunteers_count: 10,
    duration_minutes: 60,
    status: "approved",
    actionPhase: "pre_action",
    participantsCount: 2,
    joined: false,
    awaitingApproval: false,
    joinedAt: null,
    participationStatus: null,
    participationSource: null,
    participationUpdatedAt: null,
    groupJoinEnabled: true,
    pendingRequestsCount: 0,
  };
}

type ExplorerProps = ComponentProps<typeof JoinFormExplorer>;

function buildProps(overrides: Partial<ExplorerProps> = {}): ExplorerProps {
  const item = buildItem();
  return {
    fr: true,
    focusActionId: null,
    search: "",
    setSearch: vi.fn(),
    locationFilter: "all" as const,
    setLocationFilter: vi.fn(),
    periodFilter: "all" as const,
    setPeriodFilter: vi.fn(),
    statusFilter: "all" as const,
    setStatusFilter: vi.fn(),
    sort: "soonest" as const,
    setSort: vi.fn(),
    preActionVisibleItems: [item],
    resetFilters: vi.fn(),
    loading: false,
    error: null,
    reloadActions: vi.fn(),
    hasItems: true,
    hasVisibleItems: true,
    authenticated: false,
    joiningId: null,
    leavingId: null,
    requestJoin: vi.fn(),
    requestLeave: vi.fn(),
    noResultsMessage: "Aucune action future ne correspond à vos filtres.",
    notice: null,
    queueRequests: [],
    queueConfirmedParticipants: [],
    queueLoading: false,
    queueError: null,
    queueCanReview: false,
    reviewingQueueId: null,
    addingQueueParticipantId: null,
    queueSearchQuery: "",
    queueSearchResults: [],
    queueSearchLoading: false,
    queueSearchError: null,
    setQueueSearchQuery: vi.fn() as unknown as Dispatch<SetStateAction<string>>,
    reviewQueueRequest: vi.fn(async () => undefined),
    addQueueParticipant: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("JoinFormExplorer UX", () => {
  it("expose seulement Recherche, Filtres et Trier quand des actions existent", () => {
    const markup = renderToStaticMarkup(<JoinFormExplorer {...buildProps()} />);

    expect(markup).toContain("Recherche");
    expect(markup).toContain("Filtres");
    expect(markup).toContain("Trier");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-controls="join-action-filter-panel"');
    expect(markup).not.toContain("Localisation");
    expect(markup).not.toContain("Période");
    expect(markup).not.toContain("Statut");
  });

  it("ne rend pas la barre de filtres lorsqu'aucune action réelle n'est disponible", () => {
    const markup = renderToStaticMarkup(
      <JoinFormExplorer
        {...buildProps({
          hasItems: false,
          hasVisibleItems: false,
          preActionVisibleItems: [],
        })}
      />,
    );

    expect(markup).not.toContain("Recherche");
    expect(markup).not.toContain("Filtres");
    expect(markup).not.toContain("Trier");
  });

  it("ne rend la gestion des inscriptions que pour une cible explicite revue par le serveur", () => {
    const noTargetReviewerMarkup = renderToStaticMarkup(
      <JoinFormExplorer {...buildProps({ queueCanReview: true })} />,
    );
    const nonReviewerMarkup = renderToStaticMarkup(
      <JoinFormExplorer {...buildProps({ focusActionId: "action-1" })} />,
    );
    const reviewerMarkup = renderToStaticMarkup(
      <JoinFormExplorer
        {...buildProps({ focusActionId: "action-1", queueCanReview: true })}
      />,
    );

    expect(noTargetReviewerMarkup).not.toContain("Demandes d&#x27;inscription à revoir");
    expect(nonReviewerMarkup).not.toContain("Demandes d&#x27;inscription à revoir");
    expect(reviewerMarkup).toContain("Demandes d&#x27;inscription à revoir");
  });
});
