import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";
import type {
  CommunityBugReportFollowUpMetrics,
  FeedbackTracking,
} from "@/lib/community/bug-reports-store";
import type { CreatorInboxItem, CreatorInboxSource } from "@/lib/community/creator-inbox";
import type { LegalContentReportDecisionAction } from "@/lib/legal-content-report/legal-content-report";
import type { CreatorInboxPagePayload } from "./creator-inbox-service";
import { PARTNER_CONFIRM_PHRASE } from "./creator-inbox-copy";

const mocks = vi.hoisted(() => ({
  fetchCreatorInboxPage: vi.fn(),
  applyCreatorInboxAction: vi.fn(),
  acceptPromotionRequest: vi.fn(),
  rejectPromotionRequest: vi.fn(),
  acceptPartnerRequest: vi.fn(),
  rejectPartnerRequest: vi.fn(),
  decideLegalContentReport: vi.fn(),
  clipboardWriteText: vi.fn(),
}));

vi.mock("./creator-inbox-service", () => ({
  fetchCreatorInboxPage: mocks.fetchCreatorInboxPage,
  applyCreatorInboxAction: mocks.applyCreatorInboxAction,
  acceptPromotionRequest: mocks.acceptPromotionRequest,
  rejectPromotionRequest: mocks.rejectPromotionRequest,
  acceptPartnerRequest: mocks.acceptPartnerRequest,
  rejectPartnerRequest: mocks.rejectPartnerRequest,
  decideLegalContentReport: mocks.decideLegalContentReport,
}));

import { useCreatorInbox } from "./use-creator-inbox";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type HookResult = ReturnType<typeof useCreatorInbox>;
type HookParams = Parameters<typeof useCreatorInbox>[0];

const activeRenderers: ReactTestRenderer[] = [];

function createLocalStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

function makeTracking(
  overrides: Partial<FeedbackTracking> = {},
): FeedbackTracking {
  return {
    status: "under_study",
    publicSummary: null,
    reference: null,
    shippedOn: null,
    shippedNotificationAt: null,
    updatedAt: null,
    updatedByUserId: null,
    ...overrides,
  };
}

function makeItem(
  id: string,
  source: CreatorInboxSource = "feedback",
  overrides: Partial<CreatorInboxItem> = {},
): CreatorInboxItem {
  return {
    id: `${source}-${id}`,
    source,
    sourceLabel: source,
    sourceRecordId: id,
    title: `${source} ${id}`,
    subtitle: null,
    authorName: `Auteur ${id}`,
    authorEmail: `${id}@example.test`,
    authorRole: "benevole",
    createdAt: "2026-10-16T10:00:00.000Z",
    pagePath: "/admin/creator-inbox",
    status: "new",
    sourceStatus: "open",
    priority: "normal",
    context: `Contexte ${id}`,
    details: [],
    canDelete: true,
    canReview: false,
    hasReplyTarget: true,
    ...overrides,
  };
}

function page(
  items: CreatorInboxItem[],
  overrides: Partial<CreatorInboxPagePayload> = {},
): CreatorInboxPagePayload {
  return {
    items,
    count: items.length,
    hasMore: false,
    nextCursor: null,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
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

function renderHook(params: HookParams, locale: "fr" | "en" = "fr") {
  let result!: HookResult;
  let renderer!: ReactTestRenderer;

  function Harness(nextParams: HookParams) {
    result = useCreatorInbox(nextParams);
    return null;
  }

  act(() => {
    renderer = create(
      React.createElement(
        SitePreferencesProvider,
        { initialLocale: locale } as React.ComponentProps<typeof SitePreferencesProvider>,
        React.createElement(Harness, params),
      ),
    );
  });
  activeRenderers.push(renderer);

  return {
    get result() {
      return result;
    },
    update(nextParams: HookParams) {
      act(() => {
        renderer.update(
          React.createElement(
            SitePreferencesProvider,
            { initialLocale: locale } as React.ComponentProps<typeof SitePreferencesProvider>,
            React.createElement(Harness, nextParams),
          ),
        );
      });
    },
    unmount() {
      act(() => renderer.unmount());
    },
  };
}

describe("useCreatorInbox", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T12:00:00.000Z"));
    vi.stubGlobal("window", {
      localStorage: createLocalStorage(),
      setTimeout,
      clearTimeout,
      dispatchEvent: vi.fn(),
      location: { reload: vi.fn() },
    });
    vi.stubGlobal("document", {
      cookie: "",
      documentElement: {
        lang: "fr",
        setAttribute: vi.fn(),
      },
    });
    vi.stubGlobal("navigator", {
      clipboard: { writeText: mocks.clipboardWriteText },
    });
  });

  afterEach(() => {
    for (const renderer of activeRenderers.splice(0)) {
      renderer.unmount();
    }
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("builds summaries, filters by every dimension, searches details, and sorts ties deterministically", () => {
    const items = [
      makeItem("feedback-a", "feedback", {
        createdAt: "2026-10-10T10:00:00.000Z",
        details: [{ label: "Mot-clé", value: "AlphaUnique" }],
      }),
      makeItem("feedback-b", "feedback", {
        createdAt: "2026-10-10T10:00:00.000Z",
        status: "accepted",
        priority: "high",
      }),
      makeItem("promotion-1", "promotion", {
        createdAt: "2026-10-12T10:00:00.000Z",
        sourceStatus: "pending_owner_review",
        status: "pending",
        priority: "high",
        canReview: true,
      }),
      makeItem("partner-1", "partner", {
        createdAt: "2026-10-12T10:00:00.000Z",
        sourceStatus: "pending_admin_review",
        status: "pending",
        priority: "high",
        canReview: true,
      }),
      makeItem("event-1", "event", {
        createdAt: "2026-10-11T10:00:00.000Z",
        canDelete: false,
        hasReplyTarget: false,
      }),
      makeItem("legal-1", "legal_content_report", {
        createdAt: "2026-10-13T10:00:00.000Z",
        priority: "high",
        canDelete: false,
        canReview: true,
      }),
    ];
    const hook = renderHook({ initialItems: items });

    expect(hook.result.summary).toEqual({
      feedback: 2,
      promotion: 1,
      partner: 1,
      event: 1,
      legalContentReport: 1,
    });
    expect(hook.result.filteredItems[0]?.sourceRecordId).toBe("legal-1");

    act(() => hook.result.setSourceFilter("feedback"));
    expect(hook.result.filteredItems.map((item) => item.sourceRecordId)).toEqual([
      "feedback-b",
      "feedback-a",
    ]);

    act(() => hook.result.setStatusFilter("accepted"));
    expect(hook.result.filteredItems.map((item) => item.sourceRecordId)).toEqual(["feedback-b"]);

    act(() => hook.result.setPriorityFilter("high"));
    expect(hook.result.filteredItems.map((item) => item.sourceRecordId)).toEqual(["feedback-b"]);

    act(() => {
      hook.result.setSourceFilter("all");
      hook.result.setStatusFilter("all");
      hook.result.setPriorityFilter("all");
      hook.result.setQuery("alphaunique");
    });
    expect(hook.result.filteredItems.map((item) => item.sourceRecordId)).toEqual(["feedback-a"]);

    act(() => {
      hook.result.setQuery("");
      hook.result.setSortMode("date");
    });
    expect(hook.result.filteredItems.map((item) => item.sourceRecordId)).toEqual([
      "legal-1",
      "partner-1",
      "promotion-1",
      "event-1",
      "feedback-b",
      "feedback-a",
    ]);
  });

  it("replaces a page on refresh, updates metadata, blocks concurrent pagination, and reports refresh errors", async () => {
    const refresh = Promise.resolve(
      page([makeItem("fresh", "feedback")], {
        canQualify: true,
        feedbackMetrics: metrics({ shipped: 3 }),
      }),
    );
    mocks.fetchCreatorInboxPage.mockReturnValueOnce(refresh);
    const hook = renderHook({
      initialItems: [makeItem("old")],
      initialHasMore: true,
      initialNextCursor: "cursor-old",
      initialFeedbackMetrics: metrics(),
    });

    let refreshPromise!: Promise<void>;
    act(() => {
      refreshPromise = hook.result.refreshInbox();
      void hook.result.loadNextPage();
    });
    expect(mocks.fetchCreatorInboxPage).toHaveBeenCalledTimes(1);
    expect(hook.result.refreshing).toBe(true);

    await act(async () => {
      await refreshPromise;
    });
    expect(hook.result.items.map((item) => item.sourceRecordId)).toEqual(["fresh"]);
    expect(hook.result.canQualify).toBe(true);
    expect(hook.result.feedbackMetrics?.shipped).toBe(3);
    expect(hook.result.successMessage).toBe("File rafraîchie.");
    expect(hook.result.refreshing).toBe(false);

    mocks.fetchCreatorInboxPage.mockRejectedValueOnce(new Error("refresh unavailable"));
    await act(async () => {
      await hook.result.refreshInbox();
    });
    expect(hook.result.errorMessage).toBe("refresh unavailable");
    expect(hook.result.refreshing).toBe(false);
  });

  it("ignores stale refresh responses and uses localized fallbacks for non-Error failures", async () => {
    const first = deferred<CreatorInboxPagePayload>();
    const second = deferred<CreatorInboxPagePayload>();
    mocks.fetchCreatorInboxPage
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const hook = renderHook({ initialItems: [makeItem("initial")] }, "en");

    let firstRefresh!: Promise<void>;
    let secondRefresh!: Promise<void>;
    act(() => {
      firstRefresh = hook.result.refreshInbox();
      secondRefresh = hook.result.refreshInbox();
    });

    second.resolve(page([makeItem("newer")]));
    await act(async () => {
      await secondRefresh;
    });
    expect(hook.result.items.map((item) => item.sourceRecordId)).toEqual(["newer"]);

    first.resolve(page([makeItem("stale")]));
    await act(async () => {
      await firstRefresh;
    });
    expect(hook.result.items.map((item) => item.sourceRecordId)).toEqual(["newer"]);

    mocks.fetchCreatorInboxPage.mockRejectedValueOnce("refresh failed");
    await act(async () => {
      await hook.result.refreshInbox();
    });
    expect(hook.result.errorMessage).toBe("Unable to refresh inbox.");
  });

  it("validates inbox mutations, updates or deletes items, and restores pending state after errors", async () => {
    const initial = makeItem("feedback-1");
    const updated = { ...initial, status: "treated" as const };
    mocks.applyCreatorInboxAction.mockResolvedValueOnce({ item: updated });
    const hook = renderHook({ initialItems: [initial] });

    await act(async () => {
      await hook.result.applyInboxAction({
        source: "feedback",
        itemId: initial.sourceRecordId,
        action: "mark_treated",
        reason: "no",
      });
    });
    expect(mocks.applyCreatorInboxAction).not.toHaveBeenCalled();
    expect(hook.result.errorMessage).toContain("5 caractères");

    await act(async () => {
      await hook.result.applyInboxAction({
        source: "feedback",
        itemId: initial.sourceRecordId,
        action: "mark_treated",
        reason: "  Traitement confirmé  ",
      });
    });
    expect(mocks.applyCreatorInboxAction).toHaveBeenCalledWith({
      source: "feedback",
      itemId: "feedback-1",
      action: "mark_treated",
      reason: "Traitement confirmé",
    });
    expect(hook.result.items[0]?.status).toBe("treated");
    expect(hook.result.actionBusy("feedback", "feedback-1", "mark_treated")).toBe(false);

    mocks.applyCreatorInboxAction.mockResolvedValueOnce({ deletedId: "feedback-1" });
    await act(async () => {
      await hook.result.applyInboxAction({
        source: "feedback",
        itemId: "feedback-1",
        action: "delete",
        reason: "Suppression confirmée",
      });
    });
    expect(hook.result.items).toEqual([]);

    const replacement = makeItem("feedback-2");
    hook.update({ initialItems: [replacement] });
    mocks.applyCreatorInboxAction.mockRejectedValueOnce(new Error("mutation refused"));
    await act(async () => {
      await hook.result.applyInboxAction({
        source: "feedback",
        itemId: replacement.sourceRecordId,
        action: "archive",
        reason: "Archivage refusé",
      });
    });
    expect(hook.result.errorMessage).toBe("mutation refused");
    expect(hook.result.actionBusy("feedback", "feedback-2", "archive")).toBe(false);
  });

  it("qualifies feedback only with valid reasons and duplicate references", async () => {
    const feedback = makeItem("feedback-1");
    mocks.applyCreatorInboxAction.mockResolvedValue({
      item: {
        ...feedback,
        qualification: {
          status: "duplicate",
          reason: "Même retour",
          decidedAt: "2026-10-20T12:00:00.000Z",
          duplicateFeedbackId: "feedback-2",
        },
      },
    });
    const hook = renderHook({ initialItems: [feedback], initialCanQualify: true });

    await act(async () => {
      await hook.result.qualifyFeedback({
        item: feedback,
        decision: "duplicate",
        reason: "Motif complet",
        duplicateFeedbackId: null,
      });
    });
    expect(mocks.applyCreatorInboxAction).not.toHaveBeenCalled();
    expect(hook.result.errorMessage).toContain("retour doublon");

    await act(async () => {
      await hook.result.qualifyFeedback({
        item: feedback,
        decision: "duplicate",
        reason: "  Même retour  ",
        duplicateFeedbackId: "feedback-2",
      });
    });
    expect(mocks.applyCreatorInboxAction).toHaveBeenCalledWith({
      source: "feedback",
      itemId: "feedback-1",
      action: "qualify",
      reason: "Même retour",
      decision: "duplicate",
      duplicateFeedbackId: "feedback-2",
    });
    expect(hook.result.items[0]?.qualification?.status).toBe("duplicate");

    await act(async () => {
      await hook.result.qualifyFeedback({
        item: feedback,
        decision: "rejected",
        reason: "non",
        duplicateFeedbackId: null,
      });
    });
    expect(hook.result.errorMessage).toContain("motif");
  });

  it("covers English guards and incomplete optional data without calling the API", async () => {
    const sparse = makeItem("sparse", "feedback", {
      subtitle: null,
      authorEmail: null,
      authorRole: null,
      pagePath: null,
    });
    const hook = renderHook({ initialItems: [sparse] }, "en");

    act(() => hook.result.setPriorityFilter("high"));
    expect(hook.result.filteredItems).toEqual([]);
    act(() => {
      hook.result.setPriorityFilter("all");
      hook.result.setQuery("sparse");
    });
    expect(hook.result.filteredItems.map((item) => item.sourceRecordId)).toEqual(["sparse"]);

    await act(async () => {
      await hook.result.applyInboxAction({
        source: "feedback",
        itemId: sparse.sourceRecordId,
        action: "archive",
        reason: "no",
      });
    });
    expect(hook.result.errorMessage).toBe("Enter a reason of at least 5 characters.");

    await act(async () => {
      await hook.result.qualifyFeedback({
        item: sparse,
        decision: "needs_info",
        reason: "no",
        duplicateFeedbackId: null,
      });
    });
    expect(hook.result.errorMessage).toBe("A reason of at least 5 characters is required for this decision.");

    await act(async () => {
      await hook.result.qualifyFeedback({
        item: sparse,
        decision: "duplicate",
        reason: "Valid reason",
        duplicateFeedbackId: null,
      });
    });
    expect(hook.result.errorMessage).toBe("Select the duplicate feedback.");

    await act(async () => {
      await hook.result.updateFeedbackTracking({
        item: sparse,
        status: "shipped",
        publicSummary: "Valid summary",
        reference: null,
        shippedOn: null,
      });
    });
    expect(hook.result.errorMessage).toBe("A confirmed delivery date is required.");

    await act(async () => {
      await hook.result.acceptPromotion(sparse);
    });
    expect(hook.result.errorMessage).toBe("Enter a reason of at least 5 characters.");

    await act(async () => {
      await hook.result.acceptPartner(sparse);
    });
    expect(hook.result.errorMessage).toContain(PARTNER_CONFIRM_PHRASE);
    act(() => hook.result.setPartnerConfirm(PARTNER_CONFIRM_PHRASE));
    await act(async () => {
      await hook.result.acceptPartner(sparse);
    });
    expect(hook.result.errorMessage).toBe("Enter a reason of at least 5 characters.");

    act(() => hook.result.setPartnerConfirm("wrong"));
    await act(async () => {
      await hook.result.rejectPartner(sparse);
    });
    expect(hook.result.errorMessage).toContain(PARTNER_CONFIRM_PHRASE);
    act(() => hook.result.setPartnerConfirm(PARTNER_CONFIRM_PHRASE));
    await act(async () => {
      await hook.result.rejectPartner(sparse);
    });
    expect(hook.result.errorMessage).toBe("Enter a reason of at least 5 characters.");

    await act(async () => {
      await hook.result.decideLegalReport({
        item: sparse,
        action: "reviewing",
        origin: "internal_initiative",
        reason: "no",
        automatedMeansUsed: false,
      });
    });
    expect(hook.result.errorMessage).toBe("Enter a reason of at least 5 characters.");
    expect(mocks.applyCreatorInboxAction).not.toHaveBeenCalled();
  });

  it("rejects incomplete delivery data and corrects shipped metrics in both directions", async () => {
    const feedback = makeItem("feedback-1", "feedback", {
      tracking: makeTracking({ status: "under_study" }),
    });
    const shipped = {
      ...feedback,
      tracking: makeTracking({
        status: "shipped",
        publicSummary: "Résumé public complet",
        reference: "https://example.test/change",
        shippedOn: "2026-10-20",
      }),
    };
    const unshipped = {
      ...shipped,
      tracking: makeTracking({ status: "planned" }),
    };
    mocks.applyCreatorInboxAction
      .mockResolvedValueOnce({ item: shipped })
      .mockResolvedValueOnce({ item: unshipped });
    const hook = renderHook({
      initialItems: [feedback],
      initialFeedbackMetrics: metrics({ shipped: 2 }),
    });

    await act(async () => {
      await hook.result.updateFeedbackTracking({
        item: feedback,
        status: "shipped",
        publicSummary: "non",
        reference: null,
        shippedOn: "2026-10-20",
      });
    });
    expect(mocks.applyCreatorInboxAction).not.toHaveBeenCalled();
    expect(hook.result.errorMessage).toContain("résumé public");

    await act(async () => {
      await hook.result.updateFeedbackTracking({
        item: feedback,
        status: "shipped",
        publicSummary: "Résumé public complet",
        reference: null,
        shippedOn: null,
      });
    });
    expect(mocks.applyCreatorInboxAction).not.toHaveBeenCalled();
    expect(hook.result.errorMessage).toContain("date de livraison");

    await act(async () => {
      await hook.result.updateFeedbackTracking({
        item: feedback,
        status: "shipped",
        publicSummary: "Résumé public complet",
        reference: "https://example.test/change",
        shippedOn: "2026-10-20",
      });
    });
    expect(hook.result.feedbackMetrics?.shipped).toBe(3);
    expect(hook.result.items[0]?.tracking?.status).toBe("shipped");

    await act(async () => {
      await hook.result.updateFeedbackTracking({
        item: shipped,
        status: "planned",
        publicSummary: null,
        reference: null,
        shippedOn: null,
      });
    });
    expect(hook.result.feedbackMetrics?.shipped).toBe(2);
    expect(hook.result.items[0]?.tracking?.status).toBe("planned");
  });

  it("handles promotion and partner decisions with local confirmation guards", async () => {
    const promotion = makeItem("promotion-1", "promotion", {
      sourceStatus: "pending_owner_review",
      status: "pending",
      priority: "high",
      canReview: true,
    });
    const partner = makeItem("partner-1", "partner", {
      sourceStatus: "pending_admin_review",
      status: "pending",
      priority: "high",
      canReview: true,
    });
    mocks.fetchCreatorInboxPage.mockResolvedValue(page([promotion, partner]));
    mocks.acceptPromotionRequest.mockResolvedValue(undefined);
    mocks.rejectPromotionRequest.mockResolvedValue(undefined);
    mocks.acceptPartnerRequest.mockResolvedValue(undefined);
    mocks.rejectPartnerRequest.mockRejectedValue(new Error("partner rejection failed"));
    const hook = renderHook({ initialItems: [promotion, partner] });

    act(() => hook.result.setPromotionReasons({ [promotion.sourceRecordId]: "Motif promotion" }));
    await act(async () => {
      await hook.result.acceptPromotion(promotion);
    });
    expect(mocks.acceptPromotionRequest).toHaveBeenCalledWith({
      requestId: "promotion-1",
      reason: "Motif promotion",
    });

    await act(async () => {
      await hook.result.rejectPromotion(promotion);
    });
    expect(mocks.rejectPromotionRequest).toHaveBeenCalledWith({
      requestId: "promotion-1",
      reason: "Motif promotion",
    });

    act(() => {
      hook.result.setPartnerConfirm("incorrect");
      hook.result.setPartnerReason({ [partner.sourceRecordId]: "Motif partenaire" });
    });
    await act(async () => {
      await hook.result.acceptPartner(partner);
    });
    expect(mocks.acceptPartnerRequest).not.toHaveBeenCalled();
    expect(hook.result.errorMessage).toContain(PARTNER_CONFIRM_PHRASE);

    act(() => hook.result.setPartnerConfirm(PARTNER_CONFIRM_PHRASE));
    await act(async () => {
      await hook.result.acceptPartner(partner);
    });
    expect(mocks.acceptPartnerRequest).toHaveBeenCalledWith({
      id: "partner-1",
      confirmPhrase: PARTNER_CONFIRM_PHRASE,
      reason: "Motif partenaire",
    });

    await act(async () => {
      await hook.result.rejectPartner(partner);
    });
    expect(hook.result.errorMessage).toBe("partner rejection failed");
    expect(hook.result.actionBusy("partner", "partner-1", "reject")).toBe(false);
  });

  it("reports clipboard success and refusal without inventing a copied result", async () => {
    const feedback = makeItem("feedback-1");
    mocks.clipboardWriteText.mockResolvedValueOnce(undefined);
    const hook = renderHook({ initialItems: [feedback] });

    await act(async () => {
      await hook.result.copySummary(feedback);
    });
    expect(mocks.clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining("Auteur feedback-1"));
    expect(hook.result.copiedKey).toBe(feedback.id);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(hook.result.copiedKey).toBeNull();

    mocks.clipboardWriteText.mockRejectedValueOnce(new Error("clipboard denied"));
    await act(async () => {
      await hook.result.copySummary(feedback);
    });
    expect(hook.result.errorMessage).toBe("Copie impossible dans le presse-papiers.");
    expect(hook.result.copiedKey).toBeNull();
  });

  it("sends complete legal decisions, preserves partial notification status, and reports failures", async () => {
    const report = makeItem("legal-1", "legal_content_report", {
      priority: "high",
      canDelete: false,
      canReview: true,
    });
    const updated = { ...report, status: "content_restricted" as const };
    mocks.decideLegalContentReport
      .mockResolvedValueOnce({ item: updated, status: "partial" })
      .mockResolvedValueOnce({ item: { ...report, status: "closed" }, status: "applied" });
    const hook = renderHook({ initialItems: [report] });

    await act(async () => {
      await hook.result.decideLegalReport({
        item: report,
        action: "content_restricted" as LegalContentReportDecisionAction,
        origin: "received_notification",
        reason: "Motif trop court",
        automatedMeansUsed: false,
        legalBasis: "Fondement légal",
      });
    });
    expect(mocks.decideLegalContentReport).toHaveBeenCalledWith({
      reportId: "legal-1",
      action: "content_restricted",
      origin: "received_notification",
      reason: "Motif trop court",
      automatedMeansUsed: false,
      legalBasis: "Fondement légal",
      termsBasis: undefined,
    });
    expect(hook.result.successMessage).toBe("Décision enregistrée, mais une notification a échoué.");

    await act(async () => {
      await hook.result.decideLegalReport({
        item: report,
        action: "closed",
        origin: "internal_initiative",
        reason: "Clôture documentée",
        automatedMeansUsed: true,
      });
    });
    expect(hook.result.successMessage).toBe("Action enregistrée.");

    await act(async () => {
      await hook.result.decideLegalReport({
        item: report,
        action: "reviewing",
        origin: "received_notification",
        reason: "non",
        automatedMeansUsed: false,
      });
    });
    expect(mocks.decideLegalContentReport).toHaveBeenCalledTimes(2);
    expect(hook.result.errorMessage).toContain("5 caractères");

    mocks.decideLegalContentReport.mockRejectedValueOnce(new Error("legal decision failed"));
    await act(async () => {
      await hook.result.decideLegalReport({
        item: report,
        action: "reviewing",
        origin: "received_notification",
        reason: "Motif documenté",
        automatedMeansUsed: false,
      });
    });
    expect(hook.result.errorMessage).toBe("legal decision failed");
    expect(hook.result.actionBusy("legal_content_report", "legal-1", "reviewing")).toBe(false);
  });

  it("clears scheduled feedback timers when the hook unmounts", async () => {
    const feedback = makeItem("feedback-1");
    mocks.applyCreatorInboxAction.mockResolvedValueOnce({ item: feedback });
    const hook = renderHook({ initialItems: [feedback] });

    await act(async () => {
      await hook.result.applyInboxAction({
        source: "feedback",
        itemId: feedback.sourceRecordId,
        action: "mark_treated",
        reason: "Traitement complet",
      });
    });
    expect(vi.getTimerCount()).toBe(1);

    hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
