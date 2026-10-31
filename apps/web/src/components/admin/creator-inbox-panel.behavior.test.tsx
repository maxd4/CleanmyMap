import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CreatorInboxItem } from "@/lib/community/creator-inbox";
import type { CommunityBugReportFollowUpMetrics } from "@/lib/community/bug-reports-store";
import type { CreatorInboxPagePayload } from "./creator-inbox/creator-inbox-service";
import type { InboxActionParams, LegalDecisionParams } from "./creator-inbox/inbox-item-card.types";

const serviceMocks = vi.hoisted(() => ({
  fetchCreatorInboxPage: vi.fn(),
  applyCreatorInboxAction: vi.fn(),
  acceptPromotionRequest: vi.fn(),
  rejectPromotionRequest: vi.fn(),
  acceptPartnerRequest: vi.fn(),
  rejectPartnerRequest: vi.fn(),
  decideLegalContentReport: vi.fn(),
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));
vi.mock("./creator-inbox/creator-inbox-service", () => serviceMocks);
vi.mock("./creator-inbox/inbox-item-card", () => ({
  InboxItemCard: (props: {
    item: CreatorInboxItem;
    canQualify?: boolean;
    onPromotionReasonChange: (reason: string) => void;
    onPartnerReasonChange: (reason: string) => void;
    onAssociationActionReasonChange?: (reason: string) => void;
    onActionReasonChange: (reason: string) => void;
    onCopySummary: (item: CreatorInboxItem) => void;
    onAcceptPromotion: (item: CreatorInboxItem) => void;
    onRejectPromotion: (item: CreatorInboxItem) => void;
    onAcceptPartner: (item: CreatorInboxItem) => void;
    onRejectPartner: (item: CreatorInboxItem) => void;
    onAcceptAssociationAction?: (item: CreatorInboxItem) => void;
    onRejectAssociationAction?: (item: CreatorInboxItem) => void;
    onRetryAssociationActionAnnouncement?: (item: CreatorInboxItem) => void;
    onApplyInboxAction: (params: InboxActionParams) => void;
    onLegalDecision?: (params: LegalDecisionParams) => void;
    onQualifyFeedback?: (params: { decision: "accepted"; reason: string; duplicateFeedbackId: string | null }) => void;
    onUpdateFeedbackTracking?: (params: { status: "under_study"; publicSummary: string | null; reference: string | null; shippedOn: string | null }) => void;
  }) => (
    <>
      <article data-testid={`inbox-card-${props.item.sourceRecordId}`} data-can-qualify={String(props.canQualify ?? false)}>
        {props.item.title}
      </article>
      <button
        type="button"
        data-testid={`set-action-reasons-${props.item.sourceRecordId}`}
        onClick={() => {
          props.onPromotionReasonChange("promotion reason");
          props.onPartnerReasonChange("partner reason");
          props.onAssociationActionReasonChange?.("association reason");
          props.onActionReasonChange("action reason");
        }}
      >
        set action reasons
      </button>
      <button
        type="button"
        data-testid={`invoke-apply-only-${props.item.sourceRecordId}`}
        onClick={() => props.onApplyInboxAction({ source: "feedback", itemId: props.item.sourceRecordId, action: "mark_treated", reason: "" })}
      >
        invoke apply only
      </button>
      <button
        type="button"
        data-testid={`invoke-actions-${props.item.sourceRecordId}`}
        onClick={() => {
          props.onCopySummary(props.item);
          props.onAcceptPromotion(props.item);
          props.onRejectPromotion(props.item);
          props.onAcceptPartner(props.item);
          props.onRejectPartner(props.item);
          props.onAcceptAssociationAction?.(props.item);
          props.onRejectAssociationAction?.(props.item);
          props.onRetryAssociationActionAnnouncement?.(props.item);
          props.onApplyInboxAction({ source: "feedback", itemId: props.item.sourceRecordId, action: "mark_treated", reason: "valid action reason" });
          props.onLegalDecision?.({ item: props.item, action: "reviewing", origin: "internal_initiative", reason: "valid legal reason", automatedMeansUsed: false });
          props.onQualifyFeedback?.({ decision: "accepted", reason: "valid qualification reason", duplicateFeedbackId: null });
          props.onUpdateFeedbackTracking?.({ status: "under_study", publicSummary: null, reference: null, shippedOn: null });
        }}
      >
        invoke actions
      </button>
    </>
  ),
}));

import { CreatorInboxPanel } from "./creator-inbox-panel";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function makeItem(
  id: string,
  source: CreatorInboxItem["source"] = "feedback",
  overrides: Partial<CreatorInboxItem> = {},
): CreatorInboxItem {
  return {
    id: `${source}-${id}`,
    source,
    sourceLabel: source,
    sourceRecordId: id,
    title: `${source} ${id}`,
    subtitle: null,
    authorName: `Author ${id}`,
    authorEmail: `${id}@example.test`,
    authorRole: "benevole",
    createdAt: "2026-10-16T10:00:00.000Z",
    pagePath: "/admin/creator-inbox",
    status: "new",
    sourceStatus: "open",
    priority: "normal",
    context: `Context ${id}`,
    details: [],
    canDelete: true,
    canReview: false,
    hasReplyTarget: true,
    ...overrides,
  };
}

function page(items: CreatorInboxItem[], overrides: Partial<CreatorInboxPagePayload> = {}): CreatorInboxPagePayload {
  return { items, count: items.length, hasMore: false, nextCursor: null, ...overrides };
}

function metrics(overrides: Partial<CommunityBugReportFollowUpMetrics> = {}): CommunityBugReportFollowUpMetrics {
  return {
    received: 4,
    pendingQualification: 1,
    accepted: 1,
    duplicate: 0,
    rejected: 0,
    shipped: 2,
    period: "all_time",
    scope: "community_bug_reports",
    ...overrides,
  };
}

function renderPanel(overrides: Partial<React.ComponentProps<typeof CreatorInboxPanel>> = {}) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <CreatorInboxPanel
        initialItems={[]}
        initialHasMore={false}
        initialNextCursor={null}
        {...overrides}
      />,
    );
  });
  return renderer;
}

function textContent(value: unknown): string {
  if (Array.isArray(value)) return value.map(textContent).join("");
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function buttonWithText(renderer: ReactTestRenderer, text: string) {
  const button = renderer.root.findAllByType("button").find((node) => textContent(node.props.children) === text);
  if (!button) throw new Error(`Button not found: ${text}`);
  return button;
}

function cards(renderer: ReactTestRenderer) {
  return renderer.root.findAll((node) => {
    const testId = node.props["data-testid"];
    return typeof testId === "string" && testId.startsWith("inbox-card-");
  });
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("CreatorInboxPanel rendered behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    serviceMocks.fetchCreatorInboxPage.mockResolvedValue(page([]));
    serviceMocks.applyCreatorInboxAction.mockResolvedValue({});
    serviceMocks.acceptPromotionRequest.mockResolvedValue({});
    serviceMocks.rejectPromotionRequest.mockResolvedValue({});
    serviceMocks.acceptPartnerRequest.mockResolvedValue({});
    serviceMocks.rejectPartnerRequest.mockResolvedValue({});
    serviceMocks.decideLegalContentReport.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the real empty state and feedback metrics without exposing item commands", () => {
    const renderer = renderPanel({ feedbackMetrics: metrics() });

    expect(renderer.root.findAllByProps({ "aria-label": "Indicateurs de suivi des feedbacks" })).toHaveLength(1);
    expect(cards(renderer)).toHaveLength(0);
    expect(textContent(renderer.root.findAllByType("p").map((node) => node.props.children))).toContain("Aucun élément à afficher.");
    expect(renderer.root.findAllByType("button").some((node) => textContent(node.props.children) === "Supprimer")).toBe(false);
    renderer.unmount();
  });

  it("renders filtered items and forwards the management capability boundary", () => {
    const items = [
      makeItem("needle", "feedback", { title: "Needle feedback" }),
      makeItem("promotion-1", "promotion", { title: "Promotion request", priority: "high" }),
      makeItem("event-1", "event", { title: "Community event", canDelete: false, hasReplyTarget: false }),
    ];
    const renderer = renderPanel({ initialItems: items, canQualify: false });

    expect(cards(renderer)).toHaveLength(3);
    expect(renderer.root.findAllByProps({ "data-can-qualify": "false" })).toHaveLength(3);

    const search = renderer.root.findByProps({ placeholder: "Auteur, email, titre, statut, source..." });
    act(() => { search.props.onChange({ target: { value: "needle" } }); });
    expect(cards(renderer)).toHaveLength(1);
    expect(renderer.root.findByProps({ "data-testid": "inbox-card-needle" })).toBeDefined();

    const sourceFilter = renderer.root.findAllByType("select")[0];
    act(() => {
      search.props.onChange({ target: { value: "" } });
      sourceFilter?.props.onChange({ target: { value: "promotion" } });
    });
    expect(cards(renderer)).toHaveLength(1);
    expect(renderer.root.findByProps({ "data-testid": "inbox-card-promotion-1" })).toBeDefined();
    renderer.unmount();
  });

  it("keeps qualification enabled only when the panel capability is present", () => {
    const renderer = renderPanel({ initialItems: [makeItem("feedback-1")], canQualify: true });
    expect(renderer.root.findByProps({ "data-testid": "inbox-card-feedback-1" }).props["data-can-qualify"]).toBe("true");
    renderer.unmount();
  });

  it("disables refresh while loading, surfaces an error, and recovers with a success state", async () => {
    let resolveRefresh!: (value: CreatorInboxPagePayload) => void;
    serviceMocks.fetchCreatorInboxPage
      .mockRejectedValueOnce(new Error("refresh unavailable"))
      .mockReturnValueOnce(new Promise<CreatorInboxPagePayload>((resolve) => { resolveRefresh = resolve; }));
    const renderer = renderPanel({ initialItems: [makeItem("existing")] });

    await act(async () => {
      buttonWithText(renderer, "Rafraîchir").props.onClick();
      await flush();
    });
    expect(textContent(renderer.root.findAllByType("p").map((node) => node.props.children))).toContain("refresh unavailable");

    act(() => { buttonWithText(renderer, "Rafraîchir").props.onClick(); });
    const loadingButton = buttonWithText(renderer, "Rafraîchissement...");
    expect(loadingButton.props.disabled).toBe(true);

    await act(async () => {
      resolveRefresh(page([makeItem("recovered")], { canQualify: false }));
      await flush();
    });
    expect(renderer.root.findByProps({ "data-testid": "inbox-card-recovered" })).toBeDefined();
    expect(textContent(renderer.root.findAllByType("p").map((node) => node.props.children))).toContain("File rafraîchie.");
    renderer.unmount();
  });

  it("loads the next page through the rendered button and replaces its loading state", async () => {
    let resolveNextPage!: (value: CreatorInboxPagePayload) => void;
    serviceMocks.fetchCreatorInboxPage.mockReturnValue(new Promise<CreatorInboxPagePayload>((resolve) => { resolveNextPage = resolve; }));
    const renderer = renderPanel({
      initialItems: [makeItem("first")],
      initialHasMore: true,
      initialNextCursor: "cursor-1",
    });

    act(() => { buttonWithText(renderer, "Charger la page suivante").props.onClick(); });
    const loadingButton = buttonWithText(renderer, "Chargement de la page suivante...");
    expect(loadingButton.props.disabled).toBe(true);
    await act(async () => {
      resolveNextPage(page([makeItem("second")], { hasMore: false, nextCursor: null }));
      await flush();
    });
    expect(renderer.root.findByProps({ "data-testid": "inbox-card-second" })).toBeDefined();
    expect(renderer.root.findAllByType("button").some((node) => textContent(node.props.children) === "Charger la page suivante")).toBe(false);
    renderer.unmount();
  });

  it("wires every rendered item action without replacing the panel or hiding its capability boundary", async () => {
    const item = makeItem("wired");
    const renderer = renderPanel({ initialItems: [item], canQualify: true });
    expect(renderer.root.findByProps({ "data-can-qualify": "true" })).toBeDefined();

    act(() => {
      renderer.root.findByProps({ "data-testid": "invoke-apply-only-wired" }).props.onClick();
    });
    act(() => {
      renderer.root.findByProps({ "data-testid": "set-action-reasons-wired" }).props.onClick();
      renderer.root.findByProps({ placeholder: "CONFIRMER PARTENAIRE" }).props.onChange({ target: { value: "CONFIRMER PARTENAIRE" } });
    });
    await act(async () => {
      renderer.root.findByProps({ "data-testid": "invoke-actions-wired" }).props.onClick();
      await flush();
    });

    expect(serviceMocks.applyCreatorInboxAction).toHaveBeenCalled();
    expect(serviceMocks.acceptPromotionRequest).toHaveBeenCalledWith({ requestId: "wired", reason: "promotion reason" });
    expect(serviceMocks.rejectPromotionRequest).toHaveBeenCalledWith({ requestId: "wired", reason: "promotion reason" });
    expect(serviceMocks.acceptPartnerRequest).toHaveBeenCalledWith({ id: "wired", confirmPhrase: "CONFIRMER PARTENAIRE", reason: "partner reason" });
    expect(serviceMocks.rejectPartnerRequest).toHaveBeenCalledWith({ id: "wired", confirmPhrase: "CONFIRMER PARTENAIRE", reason: "partner reason" });
    expect(serviceMocks.decideLegalContentReport).toHaveBeenCalledWith(expect.objectContaining({ reportId: "wired", reason: "valid legal reason" }));
    renderer.unmount();
  });
});
