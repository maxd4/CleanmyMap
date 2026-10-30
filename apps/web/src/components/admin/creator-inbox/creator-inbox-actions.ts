import type { Dispatch, SetStateAction } from "react";
import { summarizeCreatorInboxItem, type CreatorInboxItem, type CreatorInboxSource } from "@/lib/community/creator-inbox";
import type { CommunityBugReportFollowUpMetrics, FeedbackTrackingStatus } from "@/lib/community/bug-reports-store";
import { acceptPartnerRequest, acceptPromotionRequest, applyCreatorInboxAction, decideLegalContentReport, rejectPartnerRequest, rejectPromotionRequest } from "./creator-inbox-service";
import { refreshList } from "./inbox-constants";
import { PARTNER_CONFIRM_PHRASE, type CreatorInboxCopy, type CreatorInboxLocale } from "./creator-inbox-copy";
import { resolveInboxMessage } from "./use-creator-inbox.helpers";
import type { LegalContentReportDecisionAction, LegalContentReportDecisionOrigin } from "@/lib/legal-content-report/legal-content-report";

type SharedActionDeps = {
  inboxLocale: CreatorInboxLocale;
  copy: CreatorInboxCopy;
  setItems: Dispatch<SetStateAction<CreatorInboxItem[]>>;
  setUpdatingKey: Dispatch<SetStateAction<string | null>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
  scheduleFeedbackTimer: (callback: () => void, delay: number) => void;
};

export function createFeedbackInboxActions({
  ...deps
}: SharedActionDeps & {
  feedbackMetrics?: CommunityBugReportFollowUpMetrics;
  setFeedbackMetrics: Dispatch<SetStateAction<CommunityBugReportFollowUpMetrics | undefined>>;
}) {
  const applyInboxAction = async (params: { source: CreatorInboxSource; itemId: string; action: "mark_treated" | "responded" | "archive" | "delete" | "change_priority"; reason: string; priority?: "normal" | "high" | "critical" }) => {
    const reason = params.reason.trim();
    if (reason.length < 5) {
      deps.setErrorMessage(deps.inboxLocale === "fr" ? "Saisissez un motif d'au moins 5 caractères." : "Enter a reason of at least 5 characters.");
      return;
    }
    deps.setUpdatingKey(`${params.source}:${params.itemId}:${params.action}`);
    deps.setErrorMessage(null);
    try {
      const payload = await applyCreatorInboxAction({ ...params, reason });
      deps.setItems((current) => refreshList(current, payload.item ?? null, payload.deletedId));
      deps.setSuccessMessage(deps.copy.messages.actionSuccess);
      deps.scheduleFeedbackTimer(() => deps.setSuccessMessage(null), 1800);
    } catch (error) {
      deps.setErrorMessage(resolveInboxMessage(error, deps.copy.messages.actionError));
    } finally {
      deps.setUpdatingKey(null);
    }
  };

  const qualifyFeedback = async (params: { item: CreatorInboxItem; decision: "pending" | "needs_info" | "accepted" | "duplicate" | "rejected"; reason: string; duplicateFeedbackId: string | null }) => {
    const reason = params.reason.trim();
    if (["needs_info", "duplicate", "rejected"].includes(params.decision) && reason.length < 5) {
      deps.setErrorMessage(deps.inboxLocale === "fr" ? "Un motif d'au moins 5 caractères est requis pour cette décision." : "A reason of at least 5 characters is required for this decision.");
      return;
    }
    if (params.decision === "duplicate" && !params.duplicateFeedbackId) {
      deps.setErrorMessage(deps.inboxLocale === "fr" ? "Sélectionnez le retour doublon concerné." : "Select the duplicate feedback.");
      return;
    }
    deps.setUpdatingKey(`feedback:${params.item.sourceRecordId}:qualify`);
    deps.setErrorMessage(null);
    try {
      const payload = await applyCreatorInboxAction({ source: "feedback", itemId: params.item.sourceRecordId, action: "qualify", reason, decision: params.decision, duplicateFeedbackId: params.duplicateFeedbackId });
      deps.setItems((current) => refreshList(current, payload.item ?? null));
      deps.setSuccessMessage(deps.copy.messages.qualificationSuccess);
      deps.scheduleFeedbackTimer(() => deps.setSuccessMessage(null), 1800);
    } catch (error) {
      deps.setErrorMessage(resolveInboxMessage(error, deps.copy.messages.qualificationError));
    } finally {
      deps.setUpdatingKey(null);
    }
  };

  const updateFeedbackTracking = async (params: { item: CreatorInboxItem; status: FeedbackTrackingStatus; publicSummary: string | null; reference: string | null; shippedOn: string | null }) => {
    if (params.status === "shipped" && (params.publicSummary?.trim().length ?? 0) < 5) {
      deps.setErrorMessage(deps.inboxLocale === "fr" ? "Un résumé public est requis pour une livraison." : "A public summary is required for delivery.");
      return;
    }
    if (params.status === "shipped" && !params.shippedOn) {
      deps.setErrorMessage(deps.inboxLocale === "fr" ? "Une date de livraison confirmée est requise." : "A confirmed delivery date is required.");
      return;
    }
    deps.setUpdatingKey(`feedback:${params.item.sourceRecordId}:update_tracking`);
    deps.setErrorMessage(null);
    try {
      const payload = await applyCreatorInboxAction({ source: "feedback", itemId: params.item.sourceRecordId, action: "update_tracking", reason: "Suivi de réalisation mis à jour", trackingStatus: params.status, trackingPublicSummary: params.publicSummary, trackingReference: params.reference, trackingShippedOn: params.shippedOn });
      deps.setItems((current) => refreshList(current, payload.item ?? null));
      if (deps.feedbackMetrics && payload.item?.tracking) {
        const wasShipped = params.item.tracking?.status === "shipped";
        const isShipped = payload.item.tracking.status === "shipped";
        if (wasShipped !== isShipped) deps.setFeedbackMetrics((current) => current ? { ...current, shipped: current.shipped + (isShipped ? 1 : -1) } : current);
      }
      deps.setSuccessMessage(deps.inboxLocale === "fr" ? "Suivi de réalisation enregistré." : "Product follow-up saved.");
      deps.scheduleFeedbackTimer(() => deps.setSuccessMessage(null), 1800);
    } catch (error) {
      deps.setErrorMessage(resolveInboxMessage(error, deps.copy.messages.actionError));
    } finally {
      deps.setUpdatingKey(null);
    }
  };

  return { applyInboxAction, qualifyFeedback, updateFeedbackTracking };
}

export function createReviewInboxActions({ ...deps }: SharedActionDeps & {
  promotionReasons: Record<string, string>;
  partnerReason: Record<string, string>;
  partnerConfirm: string;
  refreshInbox: () => Promise<void>;
}) {
  const validateReason = (reason: string) => {
    if (reason.trim().length >= 5) return true;
    deps.setErrorMessage(deps.inboxLocale === "fr" ? "Saisissez un motif d'au moins 5 caractères." : "Enter a reason of at least 5 characters.");
    return false;
  };
  const acceptPromotion = async (item: CreatorInboxItem) => {
    const reason = deps.promotionReasons[item.sourceRecordId] ?? "";
    if (!validateReason(reason)) return;
    deps.setUpdatingKey(`promotion:${item.sourceRecordId}:accept`);
    deps.setErrorMessage(null);
    try { await acceptPromotionRequest({ requestId: item.sourceRecordId, reason }); await deps.refreshInbox(); }
    catch (error) { deps.setErrorMessage(resolveInboxMessage(error, deps.copy.messages.approvalError)); }
    finally { deps.setUpdatingKey(null); }
  };
  const rejectPromotion = async (item: CreatorInboxItem) => {
    const reason = deps.promotionReasons[item.sourceRecordId] ?? "";
    if (!validateReason(reason)) return;
    deps.setUpdatingKey(`promotion:${item.sourceRecordId}:reject`);
    deps.setErrorMessage(null);
    try { await rejectPromotionRequest({ requestId: item.sourceRecordId, reason }); await deps.refreshInbox(); }
    catch (error) { deps.setErrorMessage(resolveInboxMessage(error, deps.copy.messages.rejectionError)); }
    finally { deps.setUpdatingKey(null); }
  };
  const validatePartner = (item: CreatorInboxItem) => {
    if (deps.partnerConfirm.trim().toUpperCase() !== PARTNER_CONFIRM_PHRASE) {
      deps.setErrorMessage(deps.copy.messages.partnerConfirmMismatch);
      return null;
    }
    const reason = deps.partnerReason[item.sourceRecordId] ?? "";
    return validateReason(reason) ? reason : null;
  };
  const acceptPartner = async (item: CreatorInboxItem) => {
    const reason = validatePartner(item);
    if (!reason) return;
    deps.setUpdatingKey(`partner:${item.sourceRecordId}:accept`);
    deps.setErrorMessage(null);
    try { await acceptPartnerRequest({ id: item.sourceRecordId, confirmPhrase: deps.partnerConfirm, reason }); await deps.refreshInbox(); }
    catch (error) { deps.setErrorMessage(resolveInboxMessage(error, deps.copy.messages.approvalError)); }
    finally { deps.setUpdatingKey(null); }
  };
  const rejectPartner = async (item: CreatorInboxItem) => {
    const reason = validatePartner(item);
    if (!reason) return;
    deps.setUpdatingKey(`partner:${item.sourceRecordId}:reject`);
    deps.setErrorMessage(null);
    try { await rejectPartnerRequest({ id: item.sourceRecordId, confirmPhrase: deps.partnerConfirm, reason }); await deps.refreshInbox(); }
    catch (error) { deps.setErrorMessage(resolveInboxMessage(error, deps.copy.messages.rejectionError)); }
    finally { deps.setUpdatingKey(null); }
  };
  return { acceptPromotion, rejectPromotion, acceptPartner, rejectPartner };
}

export function createCopySummaryAction({ inboxLocale, copy, setCopiedKey, setErrorMessage, scheduleFeedbackTimer }: Pick<SharedActionDeps, "inboxLocale" | "copy" | "setErrorMessage" | "scheduleFeedbackTimer"> & { setCopiedKey: Dispatch<SetStateAction<string | null>> }) {
  return async function copySummary(item: CreatorInboxItem) {
    try {
      await navigator.clipboard.writeText(summarizeCreatorInboxItem(item, inboxLocale));
      setCopiedKey(item.id);
      scheduleFeedbackTimer(() => setCopiedKey(null), 1500);
    } catch {
      setErrorMessage(copy.messages.clipboardError);
    }
  };
}

export function createLegalDecisionAction({ ...deps }: SharedActionDeps) {
  return async function decideLegalReport(params: { item: CreatorInboxItem; action: LegalContentReportDecisionAction; origin: LegalContentReportDecisionOrigin; reason: string; automatedMeansUsed: boolean; legalBasis?: string; termsBasis?: string }) {
    const reason = params.reason.trim();
    if (reason.length < 5) {
      deps.setErrorMessage(deps.inboxLocale === "fr" ? "Saisissez un motif d'au moins 5 caractères." : "Enter a reason of at least 5 characters.");
      return;
    }
    deps.setUpdatingKey(`legal_content_report:${params.item.sourceRecordId}:${params.action}`);
    deps.setErrorMessage(null);
    try {
      const payload = await decideLegalContentReport({ reportId: params.item.sourceRecordId, action: params.action, origin: params.origin, reason, automatedMeansUsed: params.automatedMeansUsed, legalBasis: params.legalBasis, termsBasis: params.termsBasis });
      deps.setItems((current) => refreshList(current, payload.item ?? null));
      deps.setSuccessMessage(payload.status === "partial" ? "Décision enregistrée, mais une notification a échoué." : deps.copy.messages.actionSuccess);
      deps.scheduleFeedbackTimer(() => deps.setSuccessMessage(null), 2400);
    } catch (error) {
      deps.setErrorMessage(resolveInboxMessage(error, deps.copy.messages.actionError));
    } finally {
      deps.setUpdatingKey(null);
    }
  };
}
