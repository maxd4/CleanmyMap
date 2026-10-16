"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { CmmButton } from "@/components/ui/cmm-button";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";
import {
  isPersonalFeedbackQualificationStatus,
  isPersonalFeedbackTrackingStatus,
  isPersonalFeedbackStatus,
  type PersonalFeedbackItem,
  type PersonalFeedbackPage,
  type PersonalFeedbackStatus,
  type PersonalFeedbackTrackingStatus,
} from "@/lib/community/feedback-history-contract";
import type { Locale } from "../feedback-section.shared";

const FEEDBACK_TYPE_LABELS: Record<PersonalFeedbackItem["type"], { fr: string; en: string }> = {
  bug: { fr: "Bug", en: "Bug" },
  idea: { fr: "Idée", en: "Idea" },
  improvement: { fr: "Amélioration", en: "Improvement" },
  collaboration: { fr: "Collaboration", en: "Collaboration" },
};

const FEEDBACK_STATUS_LABELS: Record<PersonalFeedbackStatus, { fr: string; en: string }> = {
  new: { fr: "Nouveau", en: "New" },
  pending: { fr: "En attente", en: "Pending" },
  responded: { fr: "Répondu", en: "Responded" },
  treated: { fr: "Traité", en: "Treated" },
  archived: { fr: "Archivé", en: "Archived" },
};

const FEEDBACK_QUALIFICATION_LABELS = {
  pending: { fr: "En attente d'examen", en: "Awaiting review" },
  needs_info: {
    fr: "Informations complémentaires demandées",
    en: "More information requested",
  },
  accepted: { fr: "Pertinent", en: "Relevant" },
  duplicate: { fr: "Doublon", en: "Duplicate" },
  rejected: { fr: "Non retenu", en: "Not retained" },
} as const;

const FEEDBACK_TRACKING_LABELS: Record<PersonalFeedbackTrackingStatus, { fr: string; en: string }> = {
  not_planned: { fr: "Aucune réalisation décidée", en: "No delivery decided" },
  under_study: { fr: "À étudier", en: "Under study" },
  planned: { fr: "Planifié", en: "Planned" },
  in_progress: { fr: "En cours de développement", en: "In progress" },
  shipped: { fr: "Livré", en: "Shipped" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isPersonalFeedbackType(
  value: unknown,
): value is PersonalFeedbackItem["type"] {
  return (
    value === "bug" ||
    value === "idea" ||
    value === "improvement" ||
    value === "collaboration"
  );
}

function parsePersonalFeedbackPage(value: unknown): PersonalFeedbackPage {
  if (!isRecord(value) || value.status !== "ok" || !Array.isArray(value.items)) {
    throw new Error("Invalid personal feedback response.");
  }

  const items = value.items.map((item) => {
    const qualificationDecidedByUserId =
      item && typeof item === "object" && "qualificationDecidedByUserId" in item
        ? item.qualificationDecidedByUserId
        : null;
    const description =
      item && typeof item === "object" && typeof item.description === "string"
        ? item.description
        : "";
    const trackingStatus =
      item && typeof item === "object" && "trackingStatus" in item
        ? item.trackingStatus
        : "not_planned";
    const trackingPublicSummary =
      item && typeof item === "object" && "trackingPublicSummary" in item
        ? item.trackingPublicSummary
        : null;
    const trackingReference =
      item && typeof item === "object" && "trackingReference" in item
        ? item.trackingReference
        : null;
    const trackingShippedOn =
      item && typeof item === "object" && "trackingShippedOn" in item
        ? item.trackingShippedOn
        : null;
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.createdAt !== "string" ||
      !isPersonalFeedbackStatus(item.status) ||
      !isPersonalFeedbackType(item.type) ||
      !isPersonalFeedbackQualificationStatus(item.qualificationStatus) ||
      !isPersonalFeedbackTrackingStatus(trackingStatus) ||
      (qualificationDecidedByUserId !== null &&
        typeof qualificationDecidedByUserId !== "string") ||
      (typeof trackingPublicSummary !== "string" && trackingPublicSummary !== null) ||
      (typeof trackingReference !== "string" && trackingReference !== null) ||
      (typeof trackingShippedOn !== "string" && trackingShippedOn !== null) ||
      (item.qualificationReason !== null &&
        typeof item.qualificationReason !== "string")
    ) {
      throw new Error("Invalid personal feedback item.");
    }
    return {
      id: item.id,
      title: item.title,
      type: item.type,
      createdAt: item.createdAt,
      status: item.status,
      qualificationStatus: item.qualificationStatus,
      qualificationReason: item.qualificationReason,
      qualificationDecidedByUserId,
      description,
      trackingStatus,
      trackingPublicSummary,
      trackingReference,
      trackingShippedOn,
    };
  });

  if (
    (value.nextCursor !== null && typeof value.nextCursor !== "string") ||
    typeof value.hasMore !== "boolean"
  ) {
    throw new Error("Invalid personal feedback pagination.");
  }

  return {
    status: "ok",
    items,
    nextCursor: value.nextCursor,
    hasMore: value.hasMore,
  };
}

export async function fetchPersonalFeedbackPage(
  cursor: string | null = null,
): Promise<PersonalFeedbackPage> {
  const search = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const response = await fetch(`/api/community/bug-reports${search}`, {
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : "Unable to load personal feedback.",
    );
  }
  return parsePersonalFeedbackPage(payload);
}

function formatFeedbackDate(createdAt: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(createdAt));
}

type FeedbackHistoryState = {
  ownerId: string | null;
  items: PersonalFeedbackItem[];
  nextCursor: string | null;
  hasMore: boolean;
  state: "loading" | "ready" | "error";
  errorMessage: string | null;
};

function createFeedbackHistoryState(
  ownerId: string | null,
  state: FeedbackHistoryState["state"],
): FeedbackHistoryState {
  return {
    ownerId,
    items: [],
    nextCursor: null,
    hasMore: false,
    state,
    errorMessage: null,
  };
}

function FeedbackHistoryItem({ item, locale }: { item: PersonalFeedbackItem; locale: Locale }) {
  return (
    <li className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] text-slate-500">
            {locale === "fr" ? "Référence" : "Reference"}: {item.id}
          </p>
          <h3 className="mt-1 text-base font-bold text-slate-950">{item.title}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {FEEDBACK_TYPE_LABELS[item.type][locale]} · {formatFeedbackDate(item.createdAt, locale)}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {FEEDBACK_QUALIFICATION_LABELS[item.qualificationStatus][locale]}
          </p>
          {item.qualificationStatus === "accepted" && item.type !== "collaboration" ? (
            <p className="mt-1 text-xs font-medium text-slate-600">
              {locale === "fr"
                ? "Contribution reconnue pour la progression Amélioration du produit."
                : "Contribution recognized for the Product improvement progression."}
            </p>
          ) : null}
          {item.qualificationReason ? (
            <p className="mt-1 cmm-text-small leading-relaxed cmm-text-secondary">
              {item.qualificationReason}
            </p>
          ) : null}
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {locale === "fr" ? "Suivi produit" : "Product follow-up"}: {FEEDBACK_TRACKING_LABELS[item.trackingStatus][locale]}
          </p>
          {item.trackingStatus === "shipped" ? (
            <div className="mt-1 space-y-1 cmm-text-small leading-relaxed cmm-text-secondary">
              {item.trackingPublicSummary ? <p>{item.trackingPublicSummary}</p> : null}
              {item.trackingReference ? (
                <p>{locale === "fr" ? "Référence" : "Reference"}: {item.trackingReference}</p>
              ) : null}
              {item.trackingShippedOn ? (
                <p>{locale === "fr" ? "Livré le" : "Delivered on"}: {item.trackingShippedOn}</p>
              ) : null}
            </div>
          ) : null}
          {item.qualificationStatus === "needs_info" && item.qualificationDecidedByUserId ? (
            <a
              className="mt-2 inline-flex text-xs font-semibold text-pink-700 underline-offset-2 hover:underline"
              href={`/sections/messagerie?channel=dm&recipientId=${encodeURIComponent(item.qualificationDecidedByUserId)}&feedbackId=${encodeURIComponent(item.id)}`}
            >
              {locale === "fr" ? "Ajouter une précision dans le DM" : "Add details in the DM"}
            </a>
          ) : null}
        </div>
        <span className="inline-flex w-fit shrink-0 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-pink-700">
          {FEEDBACK_STATUS_LABELS[item.status][locale]}
        </span>
      </div>
    </li>
  );
}

export function FeedbackHistory({ locale }: { locale: Locale }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const ownerId = isLoaded && isSignedIn ? user?.id ?? null : null;
  const ownerIdRef = useRef<string | null>(ownerId);
  const requestSequenceRef = useRef(0);
  const [history, setHistory] = useState<FeedbackHistoryState>(() =>
    createFeedbackHistoryState(null, "loading"),
  );
  const [loadingMoreOwnerId, setLoadingMoreOwnerId] = useState<string | null>(null);

  const isCurrentRequest = useCallback(
    (requestOwnerId: string, requestSequence: number) =>
      requestSequenceRef.current === requestSequence &&
      ownerIdRef.current === requestOwnerId,
    [],
  );

  const loadPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (!ownerId) return;

      const requestOwnerId = ownerId;
      const requestSequence = ++requestSequenceRef.current;
      setLoadingMoreOwnerId(append ? requestOwnerId : null);
      if (append) {
        setHistory((current) =>
          current.ownerId === requestOwnerId
            ? { ...current, errorMessage: null }
            : current,
        );
      } else {
        setHistory(
          createFeedbackHistoryState(requestOwnerId, "loading"),
        );
      }

      try {
        const page = await fetchPersonalFeedbackPage(cursor);
        if (!isCurrentRequest(requestOwnerId, requestSequence)) return;
        setHistory((current) => ({
          ownerId: requestOwnerId,
          items: append ? [...current.items, ...page.items] : page.items,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          state: "ready",
          errorMessage: null,
        }));
      } catch {
        if (!isCurrentRequest(requestOwnerId, requestSequence)) return;
        setHistory((current) => ({
          ...(current.ownerId === requestOwnerId
            ? current
            : createFeedbackHistoryState(requestOwnerId, append ? "ready" : "error")),
          state: append ? "ready" : "error",
          errorMessage:
            locale === "fr"
              ? "Impossible de charger vos retours."
              : "Unable to load your feedback.",
        }));
      } finally {
        if (isCurrentRequest(requestOwnerId, requestSequence)) {
          setLoadingMoreOwnerId(null);
        }
      }
    },
    [isCurrentRequest, locale, ownerId],
  );

  useEffect(() => {
    ownerIdRef.current = ownerId;
  }, [ownerId]);

  useEffect(() => {
    const requestOwnerId = ownerId;
    const requestSequence = ++requestSequenceRef.current;
    if (!isLoaded || !isSignedIn || !requestOwnerId) {
      return () => {
        if (requestSequenceRef.current === requestSequence) {
          requestSequenceRef.current += 1;
        }
      };
    }

    void fetchPersonalFeedbackPage(null)
      .then((page) => {
        if (!isCurrentRequest(requestOwnerId, requestSequence)) return;
        setHistory({
          ownerId: requestOwnerId,
          items: page.items,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          state: "ready",
          errorMessage: null,
        });
      })
      .catch(() => {
        if (!isCurrentRequest(requestOwnerId, requestSequence)) return;
        setHistory({
          ...createFeedbackHistoryState(requestOwnerId, "error"),
          errorMessage:
            locale === "fr"
              ? "Impossible de charger vos retours."
              : "Unable to load your feedback.",
        });
      });
    return () => {
      if (requestSequenceRef.current === requestSequence) {
        requestSequenceRef.current += 1;
      }
    };
  }, [isCurrentRequest, isLoaded, isSignedIn, locale, ownerId]);

  const visibleHistory =
    history.ownerId === ownerId
      ? history
      : createFeedbackHistoryState(ownerId, "loading");
  const loadingMore = loadingMoreOwnerId === ownerId;

  const fr = locale === "fr";
  const signInHref = buildSignInRedirectHref("/sections/feedback#mes-retours");

  return (
    <section
      id="mes-retours"
      aria-labelledby="mes-retours-title"
      className="rounded-[2rem] border border-rose-200/70 bg-white/88 p-6 shadow-[0_24px_72px_-60px_rgba(236,72,153,0.55)]"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="mes-retours-title" className="text-[0.9rem] font-black uppercase tracking-[0.18em] text-pink-600">
            {fr ? "Mes retours" : "My feedback"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-800">
            {fr
              ? "Retrouvez uniquement les retours envoyés depuis votre compte."
              : "See only the feedback submitted from your account."}
          </p>
        </div>
      </div>

      {!isLoaded ? (
        <p className="mt-5 text-sm text-slate-600" role="status" aria-live="polite">
          {fr ? "Vérification de la session..." : "Checking your session..."}
        </p>
      ) : !isSignedIn ? (
        <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
          <p className="text-sm text-slate-700">
            {fr ? "Connectez-vous pour consulter vos retours." : "Sign in to view your feedback."}
          </p>
          <CmmButton href={signInHref} tone="secondary" variant="pill" className="mt-3 text-pink-700">
            {fr ? "Se connecter" : "Sign in"}
          </CmmButton>
        </div>
      ) : visibleHistory.state === "loading" ? (
        <p className="mt-5 text-sm text-slate-600" role="status" aria-live="polite">
          {fr ? "Chargement de vos retours..." : "Loading your feedback..."}
        </p>
      ) : visibleHistory.state === "error" ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
          <p className="text-sm text-rose-800" role="alert">
            {visibleHistory.errorMessage ?? (fr ? "Impossible de charger vos retours." : "Unable to load your feedback.")}
          </p>
          <CmmButton
            type="button"
            tone="secondary"
            variant="pill"
            className="mt-3 text-pink-700"
            onClick={() => void loadPage(null, false)}
          >
            {fr ? "Réessayer" : "Retry"}
          </CmmButton>
        </div>
      ) : visibleHistory.items.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-rose-200 p-4 text-sm text-slate-600">
          {fr ? "Aucun retour envoyé pour le moment." : "No feedback submitted yet."}
        </p>
      ) : (
        <>
          <ul className="mt-5 space-y-3" aria-label={fr ? "Historique de mes retours" : "My feedback history"}>
            {visibleHistory.items.map((item) => (
              <FeedbackHistoryItem key={item.id} item={item} locale={locale} />
            ))}
          </ul>
          {visibleHistory.errorMessage ? (
            <p className="mt-3 text-sm text-rose-800" role="alert">
              {visibleHistory.errorMessage}
            </p>
          ) : null}
          {visibleHistory.hasMore && visibleHistory.nextCursor ? (
            <CmmButton
              type="button"
              tone="secondary"
              variant="pill"
              className="mt-4 text-pink-700"
              disabled={loadingMore}
              onClick={() => void loadPage(visibleHistory.nextCursor, true)}
            >
              {loadingMore
                ? fr
                  ? "Chargement..."
                  : "Loading..."
                : fr
                  ? "Voir plus"
                  : "Load more"}
            </CmmButton>
          ) : null}
        </>
      )}
    </section>
  );
}
