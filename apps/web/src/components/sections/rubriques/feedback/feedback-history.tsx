"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { CmmButton } from "@/components/ui/cmm-button";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";
import {
  isPersonalFeedbackStatus,
  type PersonalFeedbackItem,
  type PersonalFeedbackPage,
  type PersonalFeedbackStatus,
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
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.createdAt !== "string" ||
      !isPersonalFeedbackStatus(item.status) ||
      !isPersonalFeedbackType(item.type)
    ) {
      throw new Error("Invalid personal feedback item.");
    }
    return {
      id: item.id,
      title: item.title,
      type: item.type,
      createdAt: item.createdAt,
      status: item.status,
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
        </div>
        <span className="inline-flex w-fit shrink-0 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-pink-700">
          {FEEDBACK_STATUS_LABELS[item.status][locale]}
        </span>
      </div>
    </li>
  );
}

export function FeedbackHistory({ locale }: { locale: Locale }) {
  const { isLoaded, isSignedIn } = useUser();
  const [items, setItems] = useState<PersonalFeedbackItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const applyPage = useCallback((page: PersonalFeedbackPage, append: boolean) => {
    setItems((current) => (append ? [...current, ...page.items] : page.items));
    setNextCursor(page.nextCursor);
    setHasMore(page.hasMore);
    setState("ready");
  }, []);

  const loadPage = useCallback(async (cursor: string | null, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setState("loading");
    }
    setErrorMessage(null);

    try {
      const page = await fetchPersonalFeedbackPage(cursor);
      applyPage(page, append);
    } catch {
      setErrorMessage(
        locale === "fr"
          ? "Impossible de charger vos retours."
          : "Unable to load your feedback.",
      );
      if (!append) setState("error");
    } finally {
      if (append) setLoadingMore(false);
    }
  }, [applyPage, locale]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;
    let active = true;
    void fetchPersonalFeedbackPage(null)
      .then((page) => {
        if (active) applyPage(page, false);
      })
      .catch(() => {
        if (!active) return;
        setErrorMessage(
          locale === "fr"
            ? "Impossible de charger vos retours."
            : "Unable to load your feedback.",
        );
        setState("error");
      });
    return () => {
      active = false;
    };
  }, [applyPage, isLoaded, isSignedIn, locale]);

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
      ) : state === "loading" ? (
        <p className="mt-5 text-sm text-slate-600" role="status" aria-live="polite">
          {fr ? "Chargement de vos retours..." : "Loading your feedback..."}
        </p>
      ) : state === "error" ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
          <p className="text-sm text-rose-800" role="alert">
            {errorMessage ?? (fr ? "Impossible de charger vos retours." : "Unable to load your feedback.")}
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
      ) : items.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-rose-200 p-4 text-sm text-slate-600">
          {fr ? "Aucun retour envoyé pour le moment." : "No feedback submitted yet."}
        </p>
      ) : (
        <>
          <ul className="mt-5 space-y-3" aria-label={fr ? "Historique de mes retours" : "My feedback history"}>
            {items.map((item) => (
              <FeedbackHistoryItem key={item.id} item={item} locale={locale} />
            ))}
          </ul>
          {errorMessage ? (
            <p className="mt-3 text-sm text-rose-800" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {hasMore && nextCursor ? (
            <CmmButton
              type="button"
              tone="secondary"
              variant="pill"
              className="mt-4 text-pink-700"
              disabled={loadingMore}
              onClick={() => void loadPage(nextCursor, true)}
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
