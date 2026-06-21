"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Filter,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Users2,
} from "lucide-react";
import { PageHero, PageHeroBadge } from "@/components/ui/page-hero";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { CmmButton } from "@/components/ui/cmm-button";
import type {
  ActionParticipationReviewItem,
  JoinableActionHistoryItem,
  JoinableActionItem,
} from "@/lib/actions/group-participation";
import {
  filterAndSortJoinableActions,
  type JoinableActionJoinFilter,
  type JoinableActionSort,
} from "./rejoindre-un-formulaire-section.utils";

type JoinableActionsResponse = {
  status: "ok";
  authenticated: boolean;
  count: number;
  items: JoinableActionItem[];
  history: JoinableActionHistoryItem[];
};

type JoinActionResponse = {
  status: "ok";
  actionId: string;
  alreadyJoined: boolean;
  joinedAt: string;
  participationStatus: "pending" | "confirmed" | "cancelled";
  participationSource: "group_form" | "admin" | "import";
  participationUpdatedAt: string | null;
  participantsCount: number;
};

type GroupJoinQueueResponse = {
  status: "ok";
  actionId: string;
  count: number;
  pendingRequests: ActionParticipationReviewItem[];
  canReview: boolean;
};

function formatDate(dateValue: string, locale: "fr" | "en"): string {
  const parsed = new Date(`${dateValue}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.max(0, Math.trunc(value)));
}

function FilterPill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
        active
          ? "border-emerald-400 bg-emerald-500 text-white shadow-[0_10px_20px_-14px_rgba(16,185,129,0.5)]"
          : "border-emerald-200 bg-white/80 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50"
      }`}
    >
      {children}
    </button>
  );
}

function getJoinFilterLabel(filter: JoinableActionJoinFilter, fr: boolean): string {
  switch (filter) {
    case "available":
      return fr ? "À rejoindre" : "To join";
    case "joined":
      return fr ? "Confirmées" : "Confirmed";
    case "all":
    default:
      return fr ? "Tous" : "All";
  }
}

export function JoinFormSection() {
  const { locale } = useSitePreferences();
  const searchParams = useSearchParams();
  const fr = locale === "fr";
  const pageFamily = resolvePageFamily("/sections/rejoindre-un-formulaire");
  const [items, setItems] = useState<JoinableActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [historyItems, setHistoryItems] = useState<JoinableActionHistoryItem[]>([]);
  const [queueRequests, setQueueRequests] = useState<ActionParticipationReviewItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueCanReview, setQueueCanReview] = useState(false);
  const [reviewingQueueId, setReviewingQueueId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [joinFilter, setJoinFilter] = useState<JoinableActionJoinFilter>("all");
  const [sort, setSort] = useState<JoinableActionSort>("soonest");
  const [pendingJoinActionId, setPendingJoinActionId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const focusActionId = searchParams.get("actionId")?.trim() || null;
  const listUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: "24", historyLimit: "12" });
    if (focusActionId) {
      params.set("actionId", focusActionId);
    }
    return `/api/actions/group-join?${params.toString()}`;
  }, [focusActionId]);

  const loadActions = useCallback(async (signal?: AbortSignal) => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(listUrl, {
        signal: signal ?? controller.signal,
      });

      if (!response.ok) {
        throw new Error("Impossible de charger les actions validées.");
      }

      const payload = (await response.json()) as JoinableActionsResponse;
      setItems(payload.items);
      setHistoryItems(payload.history ?? []);
      setAuthenticated(payload.authenticated);
    } catch (fetchError) {
      if ((fetchError as { name?: string }).name === "AbortError") {
        return;
      }
      setError(
        fr
          ? "Le flux de participation est temporairement indisponible."
          : "The participation flow is temporarily unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [fr, listUrl]);

  useEffect(() => {
    const controller = new AbortController();
    void loadActions(controller.signal);

    return () => controller.abort();
  }, [loadActions]);

  const hasItems = items.length > 0;
  const orderedItems = useMemo(
    () =>
      filterAndSortJoinableActions(items, {
        search,
        joinFilter,
        sort,
        focusActionId,
        locale: fr ? "fr" : "en",
      }),
    [focusActionId, fr, items, joinFilter, search, sort],
  );
  const hasVisibleItems = orderedItems.length > 0;
  const emptyMessage = useMemo(
    () =>
      fr
        ? "Aucune action validée n'est ouverte pour le moment."
        : "No validated action is open right now.",
    [fr],
  );
  const activeParticipationItems = useMemo(
    () => historyItems.filter((item) => item.joined),
    [historyItems],
  );
  const pendingParticipationItems = useMemo(
    () => historyItems.filter((item) => item.participationStatus === "pending"),
    [historyItems],
  );
  const pendingJoinAction = useMemo(
    () => items.find((item) => item.id === pendingJoinActionId) ?? null,
    [items, pendingJoinActionId],
  );
  const activeFilterLabel = getJoinFilterLabel(joinFilter, fr);
  const queueActionId = useMemo(
    () => focusActionId ?? orderedItems[0]?.id ?? null,
    [focusActionId, orderedItems],
  );
  const queueAction = useMemo(
    () => orderedItems.find((item) => item.id === queueActionId) ?? null,
    [orderedItems, queueActionId],
  );

  const loadQueue = useCallback(
    async (actionId: string, signal?: AbortSignal) => {
      setQueueLoading(true);
      setQueueError(null);

      try {
        const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/group-join`, {
          signal,
        });
        const payload = (await response.json()) as GroupJoinQueueResponse | { error?: string };

        if (!response.ok) {
          const message =
            typeof payload === "object" && payload && "error" in payload && payload.error
              ? payload.error
              : fr
                ? "Impossible de charger la file publique."
                : "Unable to load the public queue.";
          setQueueRequests([]);
          setQueueCanReview(false);
          setQueueError(message);
          return;
        }

        const typedPayload = payload as GroupJoinQueueResponse;
        setQueueRequests(typedPayload.pendingRequests ?? []);
        setQueueCanReview(Boolean(typedPayload.canReview));
      } catch (queueFetchError) {
        if ((queueFetchError as { name?: string }).name === "AbortError") {
          return;
        }
        setQueueRequests([]);
        setQueueCanReview(false);
        setQueueError(
          fr
            ? "Impossible de charger la file publique."
            : "Unable to load the public queue.",
        );
      } finally {
        setQueueLoading(false);
      }
    },
    [fr],
  );

  useEffect(() => {
    if (!queueActionId) {
      setQueueRequests([]);
      setQueueCanReview(false);
      setQueueLoading(false);
      setQueueError(null);
      return undefined;
    }

    const controller = new AbortController();
    void loadQueue(queueActionId, controller.signal);

    return () => controller.abort();
  }, [loadQueue, queueActionId]);

  async function submitJoin(actionId: string) {
    const currentItem = items.find((item) => item.id === actionId) ?? null;
    setJoiningId(actionId);
    setNotice(null);

    try {
      const response = await fetch("/api/actions/group-join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ actionId }),
      });

      const payload = (await response.json()) as
        | JoinActionResponse
        | { error?: string; details?: Record<string, string[]> };

      if (!response.ok) {
        if (response.status === 401) {
          setNotice(fr ? "Connectez-vous pour rejoindre un formulaire." : "Sign in to join a form.");
          return;
        }

        const message =
          typeof payload === "object" && payload && "error" in payload && payload.error
            ? payload.error
            : fr
              ? "La jonction a échoué."
              : "Join failed.";
        setNotice(message);
        return;
      }

      const joined = payload as JoinActionResponse;
      const isConfirmed = joined.participationStatus === "confirmed";
      const isPending = joined.participationStatus === "pending";
      setItems((previous) =>
        previous.map((item) =>
          item.id === actionId
            ? {
                ...item,
                joined: isConfirmed,
                awaitingApproval: isPending,
                joinedAt: joined.joinedAt,
                participationStatus: joined.participationStatus,
                participationSource: joined.participationSource,
                participationUpdatedAt: joined.participationUpdatedAt,
                participantsCount: joined.participantsCount,
              }
            : item,
        ),
      );
      if (currentItem) {
        setHistoryItems((previous) => [
          {
            ...currentItem,
            participantsCount: joined.participantsCount,
            joined: isConfirmed,
            awaitingApproval: isPending,
            joinedAt: joined.joinedAt,
            participationStatus: joined.participationStatus,
            participationSource: joined.participationSource,
            participationUpdatedAt: joined.participationUpdatedAt,
            groupJoinEnabled: currentItem.groupJoinEnabled,
          },
          ...previous.filter((item) => item.id !== actionId),
        ]);
      }
      setNotice(
        isPending
          ? fr
            ? "Votre demande est visible dans la file publique. Le créateur ou un admin doit l'accepter."
            : "Your request is visible in the public queue. The creator or an admin must approve it."
          : joined.alreadyJoined
            ? fr
              ? "Participation déjà enregistrée. L'historique reste synchronisé et la progression peut être recalculée."
              : "Participation already recorded. Your history stays synced and progression can be recalculated."
            : fr
              ? "Participation enregistrée. Elle alimente l'historique, les badges et le compteur collectif."
              : "Participation saved. It updates history, badges, and the collective counter.",
      );
      if (queueActionId === actionId) {
        await loadQueue(actionId);
      }
    } finally {
      setJoiningId(null);
    }
  }

  function requestJoin(actionId: string) {
    setNotice(null);
    setPendingJoinActionId(actionId);
  }

  async function confirmPendingJoin() {
    if (!pendingJoinActionId) {
      return;
    }

    const actionId = pendingJoinActionId;
    setPendingJoinActionId(null);
    await submitJoin(actionId);
  }

  async function reviewQueueRequest(
    requestId: string,
    decision: "accept" | "reject",
  ) {
    if (!queueActionId || !queueCanReview) {
      return;
    }

    setReviewingQueueId(requestId);
    setQueueError(null);

    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(queueActionId)}/group-join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId: requestId,
          decision,
        }),
      });

      const payload = (await response.json()) as
        | {
            status: "ok";
            participantId: string;
            participationStatus: "pending" | "confirmed" | "cancelled";
            participationSource: "group_form" | "admin" | "import";
          }
        | { error?: string };

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload && "error" in payload && payload.error
            ? payload.error
            : fr
              ? "La demande n'a pas pu être traitée."
              : "The request could not be processed.";
        setQueueError(message);
        return;
      }

      if (decision === "accept") {
        setItems((previous) =>
          previous.map((item) =>
            item.id === queueActionId
              ? {
                  ...item,
                  participantsCount: item.participantsCount + 1,
                }
              : item,
          ),
        );
      }

      setNotice(
        decision === "accept"
          ? fr
            ? "Demande acceptée."
            : "Request approved."
          : fr
            ? "Demande refusée."
            : "Request rejected.",
      );
      await loadQueue(queueActionId);
    } finally {
      setReviewingQueueId(null);
    }
  }

  useEffect(() => {
    if (!pendingJoinActionId) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const previouslyFocusedElement = document.activeElement;
    if (previouslyFocusedElement instanceof HTMLElement) {
      previouslyFocusedElementRef.current = previouslyFocusedElement;
    }
    document.body.style.overflow = "hidden";

    const focusableSelector = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPendingJoinActionId(null);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialogElement = dialogRef.current;
      if (!dialogElement) {
        return;
      }

      const focusableElements = Array.from(
        dialogElement.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !dialogElement.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    window.setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedElementRef.current?.focus();
    };
  }, [pendingJoinActionId]);

  return (
    <SectionShell
      id="rejoindre-un-formulaire"
      hideHeader
      gradient="from-emerald-500/20 via-emerald-500/8 to-transparent"
    >
      <div className="space-y-10 pt-12 text-slate-900">
        <PageHero
          family={pageFamily}
          eyebrow={fr ? "Agir à plusieurs" : "Act together"}
          title={fr ? "Rejoindre un formulaire" : "Join a form"}
          subtitle={
            fr
              ? "Consultez les actions ouvertes, voyez la file publique et envoyez une demande de participation."
              : "Browse open actions, see the public queue, and send a participation request."
          }
          badges={
            <>
              <PageHeroBadge family={pageFamily}>
                {fr ? "Demande en validation" : "Review required"}
              </PageHeroBadge>
            </>
          }
          className="max-w-3xl"
        />

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <FamilyRubriqueCard
            withHover={false}
            className="p-8 scroll-mt-24"
            id="explorer-actions"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700/70">
                  {fr ? "Actions validées" : "Approved actions"}
                </p>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  {fr ? "Rejoindre le formulaire existant" : "Join the existing form"}
                </h2>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
                  {fr
                    ? "Filtrez, comparez, puis demandez à rejoindre."
                    : "Filter, compare, then request to join."}
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-200/40 bg-emerald-50/30 p-4 text-emerald-700">
                <ShieldCheck size={22} />
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {loading && (
                <div className="rounded-[1.75rem] border border-emerald-200/60 bg-emerald-50/40 p-6">
                  <div className="flex items-center gap-3 text-emerald-800">
                    <Loader2 size={16} className="animate-spin" />
                    <p className="text-sm font-semibold">
                      {fr ? "Chargement des actions ouvertes..." : "Loading open actions..."}
                    </p>
                  </div>
                </div>
              )}

              {!loading && error && (
                <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50/80 p-6 text-rose-900">
                  <p className="text-sm font-semibold">{error}</p>
                  <CmmButton
                    onClick={() => {
                      setLoading(true);
                      setError(null);
                      void fetch(listUrl)
                        .then(async (response) => {
                          if (!response.ok) {
                            throw new Error("reload");
                          }
                          const payload = (await response.json()) as JoinableActionsResponse;
                          setItems(payload.items);
                          setHistoryItems(payload.history ?? []);
                          setAuthenticated(payload.authenticated);
                        })
                        .catch(() => {
                          setError(
                            fr
                              ? "La liste est temporairement indisponible."
                              : "The list is temporarily unavailable.",
                          );
                        })
                        .finally(() => {
                          setLoading(false);
                        });
                    }}
                    tone="secondary"
                    className="mt-4"
                  >
                    {fr ? "Réessayer" : "Retry"}
                  </CmmButton>
                </div>
              )}

              {!loading && !error && !hasItems && (
                <div className="rounded-[1.75rem] border border-dashed border-emerald-200/70 bg-emerald-50/35 p-6 text-slate-700">
                  <p className="text-base font-bold text-slate-900">{emptyMessage}</p>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed">
                    {fr
                      ? "Créez un formulaire de groupe depuis la déclaration d'action, puis revenez ici avec son lien."
                      : "Create a group form from action declaration, then come back with its link."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <CmmButton href="/actions/new" tone="primary" variant="pill">
                      {fr ? "Créer un formulaire" : "Create a form"}
                    </CmmButton>
                    <CmmButton href="/actions/new" tone="secondary" variant="pill">
                      {fr ? "Déclarer une action" : "Declare an action"}
                    </CmmButton>
                  </div>
                </div>
              )}

              {!loading && hasItems && (
                <div id="filtres-rapides" className="scroll-mt-24">
                <div className="rounded-[1.75rem] border border-emerald-200/70 bg-emerald-50/40 p-4 shadow-[0_16px_36px_-28px_rgba(16,185,129,0.24)]">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_auto_auto] lg:items-end">
                    <label className="space-y-2">
                      <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700/70">
                        <Search size={12} />
                        {fr ? "Recherche" : "Search"}
                      </span>
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={
                          fr
                            ? "Lieu, date, durée, participants..."
                            : "Location, date, duration, participants..."
                        }
                        className="h-11 w-full rounded-2xl border border-emerald-200/80 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
                      />
                    </label>

                    <div className="space-y-2">
                      <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700/70">
                        <Filter size={12} />
                        {fr ? "Filtre" : "Filter"}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <FilterPill active={joinFilter === "all"} onClick={() => setJoinFilter("all")}>
                          {fr ? "Tous" : "All"}
                        </FilterPill>
                        <FilterPill
                          active={joinFilter === "available"}
                          onClick={() => setJoinFilter("available")}
                        >
                          {fr ? "À demander" : "Requestable"}
                        </FilterPill>
                        <FilterPill active={joinFilter === "joined"} onClick={() => setJoinFilter("joined")}>
                          {fr ? "Confirmées" : "Confirmed"}
                        </FilterPill>
                      </div>
                    </div>

                    <label className="space-y-2">
                      <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700/70">
                        <ArrowUpDown size={12} />
                        {fr ? "Tri" : "Sort"}
                      </span>
                      <select
                        value={sort}
                        onChange={(event) => setSort(event.target.value as JoinableActionSort)}
                        className="h-11 w-full rounded-2xl border border-emerald-200/80 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
                      >
                        <option value="soonest">{fr ? "Date la plus proche" : "Soonest date"}</option>
                        <option value="latest">{fr ? "Date la plus lointaine" : "Latest date"}</option>
                        <option value="participants-desc">
                          {fr ? "Plus de participants" : "Most participants"}
                        </option>
                        <option value="participants-asc">
                          {fr ? "Moins de participants" : "Fewest participants"}
                        </option>
                        <option value="location-asc">{fr ? "Lieu A → Z" : "Location A → Z"}</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-medium text-emerald-900/60">
                      {fr
                        ? `${orderedItems.length} résultat${orderedItems.length > 1 ? "s" : ""} affiché${
                            orderedItems.length > 1 ? "s" : ""
                          } sur ${items.length}`
                        : `${orderedItems.length} result${orderedItems.length > 1 ? "s" : ""} shown out of ${items.length}`}
                    </p>
                    {(search || joinFilter !== "all" || sort !== "soonest") && (
                      <CmmButton
                        tone="secondary"
                        variant="pill"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setJoinFilter("all");
                          setSort("soonest");
                        }}
                      >
                        {fr ? "Réinitialiser" : "Reset"}
                      </CmmButton>
                    )}
                  </div>
                </div>
                </div>
              )}

              {!loading && hasItems && hasVisibleItems && (
                <div className="grid gap-4">
                  {orderedItems.map((item) => (
                    <article
                      key={item.id}
                      className={`rounded-[1.75rem] border p-5 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.45)] ${
                        item.id === focusActionId
                          ? "border-emerald-400 bg-emerald-50/80 ring-2 ring-emerald-300/40"
                          : "border-emerald-200/70 bg-white/85"
                      }`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-800">
                              <CheckCircle2 size={12} />
                              {fr ? "Validée" : "Approved"}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-sky-800">
                              {item.groupJoinEnabled
                                ? fr
                                  ? "Ouverte"
                                  : "Open"
                                : fr
                                  ? "Fermée"
                                  : "Closed"}
                            </span>
                            {item.awaitingApproval && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-amber-800">
                                {fr ? "En attente" : "Pending"}
                              </span>
                            )}
                            {item.joined && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-700">
                                {fr ? "Confirmée" : "Confirmed"}
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl font-black tracking-tight text-slate-900">
                            {item.location_label}
                          </h3>

                          {item.joined && item.joinedAt && (
                            <p className="text-xs font-semibold text-emerald-800">
                              {fr ? "Confirmée le" : "Confirmed on"}{" "}
                              {formatDate(item.joinedAt.slice(0, 10), fr ? "fr" : "en")}
                            </p>
                          )}
                          {item.awaitingApproval && !item.joined && (
                            <p className="text-xs font-semibold text-amber-800">
                              {fr
                                ? "Demande en attente"
                                : "Request pending"}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/60 px-3 py-1.5">
                              <CalendarDays size={12} className="text-emerald-700" />
                              {formatDate(item.action_date, fr ? "fr" : "en")}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/60 px-3 py-1.5">
                              <Users2 size={12} className="text-emerald-700" />
                              {formatCount(item.participantsCount)}
                              {item.volunteers_count > 0 ? ` / ${formatCount(item.volunteers_count)}` : ""}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/60 px-3 py-1.5">
                              <MapPin size={12} className="text-emerald-700" />
                              {formatCount(item.duration_minutes)} min
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col gap-3 md:items-end">
                          {authenticated ? (
                            <CmmButton
                              tone="primary"
                              variant="pill"
                              className="min-w-[12rem] px-6"
                              disabled={joiningId === item.id || item.joined || item.awaitingApproval}
                              onClick={() => requestJoin(item.id)}
                            >
                              {joiningId === item.id ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  {fr ? "Enregistrement..." : "Saving..."}
                                </>
                              ) : item.joined ? (
                                <>
                                  <CheckCircle2 size={14} />
                                  {fr ? "Confirmée" : "Confirmed"}
                                </>
                              ) : item.awaitingApproval ? (
                                <>
                                  <ClipboardList size={14} />
                                  {fr ? "En attente" : "Pending"}
                                </>
                              ) : (
                                <>
                                  <ClipboardList size={14} />
                                  {fr ? "Demander à rejoindre" : "Request to join"}
                                </>
                              )}
                            </CmmButton>
                          ) : (
                            <CmmButton
                              href="/sign-in"
                              tone="primary"
                              variant="pill"
                              className="min-w-[12rem] px-6"
                            >
                              <>
                                <ClipboardList size={14} />
                                {fr ? "Se connecter" : "Sign in"}
                              </>
                            </CmmButton>
                          )}

                          <p className="max-w-xs text-right text-xs leading-relaxed text-slate-500">
                            {authenticated
                              ? item.awaitingApproval
                                ? fr
                                  ? "Demande envoyée. En attente de validation."
                                  : "Request sent. Waiting for approval."
                                : fr
                                  ? "Une participation confirmée par bénévole et par action."
                                  : "One confirmed participation per volunteer and action."
                              : fr
                                ? "Connectez-vous pour envoyer une demande."
                                : "Sign in to send a request."}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {!loading && hasItems && !hasVisibleItems && (
                <div className="rounded-[1.75rem] border border-dashed border-emerald-200/70 bg-emerald-50/35 p-6 text-slate-700">
                  <p className="text-sm font-semibold">
                    {fr
                      ? "Aucune action ne correspond à votre recherche."
                      : "No actions match your search."}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">
                    {fr
                      ? "Essayez un autre mot-clé, changez le filtre ou réinitialisez le tri."
                      : "Try a different keyword, switch the filter, or reset the sort."}
                  </p>
                  <CmmButton
                    tone="secondary"
                    variant="pill"
                    className="mt-4"
                    onClick={() => {
                      setSearch("");
                      setJoinFilter("all");
                      setSort("soonest");
                    }}
                  >
                    {fr ? "Voir tout" : "View all"}
                  </CmmButton>
                </div>
              )}

              {notice && (
                <div className="rounded-[1.5rem] border border-emerald-200/70 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-900">
                  {notice}
                </div>
              )}
            </div>
          </FamilyRubriqueCard>

          <div className="space-y-6">
            <FamilyRubriqueCard withHover={false} className="sticky top-6 p-8 shadow-[0_20px_42px_-34px_rgba(16,185,129,0.38)]">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700/70">
                      {fr ? "Résumé fixe" : "Pinned summary"}
                    </p>
                    <h2 className="text-xl font-black tracking-tight text-white">
                      {fr ? "Où en êtes-vous ?" : "Where are you?"}
                    </h2>
                  </div>
                  <div className="rounded-2xl border border-emerald-200/40 bg-emerald-50/30 px-3 py-2 text-emerald-700">
                    <ShieldCheck size={18} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.25rem] border border-emerald-200/60 bg-emerald-50/40 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700/70">
                      {fr ? "Affichées" : "Shown"}
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{orderedItems.length}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-emerald-200/60 bg-emerald-50/40 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700/70">
                      {fr ? "Actives" : "Active"}
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{activeParticipationItems.length}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-amber-200/60 bg-amber-50/40 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700/70">
                      {fr ? "En attente" : "Pending"}
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900">
                      {pendingParticipationItems.length}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-emerald-200/60 bg-emerald-50/40 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700/70">
                      {fr ? "Filtre" : "Filter"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{activeFilterLabel}</p>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-emerald-200/60 bg-white/80 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700/70">
                    {fr ? "Navigation rapide" : "Quick navigation"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CmmButton href="#explorer-actions" tone="secondary" variant="pill" size="sm">
                      {fr ? "Explorer" : "Explore"}
                    </CmmButton>
                    <CmmButton href="#mon-suivi" tone="secondary" variant="pill" size="sm">
                      {fr ? "Mon suivi" : "My tracking"}
                    </CmmButton>
                    <CmmButton href="/actions/new" tone="secondary" variant="pill" size="sm">
                      {fr ? "Créer un formulaire" : "Create a form"}
                    </CmmButton>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-emerald-200/60 bg-emerald-50/50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700/70">
                        {fr ? "File publique" : "Public queue"}
                      </p>
                      <h3 className="text-base font-black tracking-tight text-slate-900">
                        {queueAction
                          ? queueAction.location_label
                          : fr
                            ? "Aucun formulaire sélectionné"
                            : "No form selected"}
                      </h3>
                    </div>
                    <div className="rounded-2xl border border-emerald-200/70 bg-white/80 px-3 py-2 text-emerald-700">
                      <Users2 size={18} />
                    </div>
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {queueAction
                      ? fr
                        ? "Les noms des comptes en attente sont visibles par tous. Le créateur ou un admin peut traiter la file ici ou depuis la rubrique admin."
                        : "Waiting accounts are visible to everyone. The creator or an admin can process the queue here or from the admin section."
                      : fr
                        ? "Choisissez un formulaire pour afficher sa file."
                        : "Choose a form to display its queue."}
                  </p>

                  {queueAction && (
                    <p className="mt-2 text-xs font-semibold text-emerald-800">
                      {fr
                        ? `${formatDate(queueAction.action_date, "fr")} · ${formatCount(queueRequests.length)} demande${queueRequests.length > 1 ? "s" : ""}`
                        : `${formatDate(queueAction.action_date, "en")} · ${formatCount(queueRequests.length)} request${queueRequests.length > 1 ? "s" : ""}`}
                    </p>
                  )}

                  {queueError ? (
                    <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {queueError}
                    </p>
                  ) : queueLoading ? (
                    <div className="mt-3 space-y-2">
                      <div className="h-12 rounded-2xl border border-dashed border-emerald-200 bg-white/80" />
                      <div className="h-12 rounded-2xl border border-dashed border-emerald-200 bg-white/80" />
                    </div>
                  ) : queueRequests.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {queueRequests.map((request) => (
                        <div
                          key={request.id}
                          className="rounded-2xl border border-emerald-200/70 bg-white/90 px-3 py-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {request.displayName}
                              </p>
                              <p className="text-xs text-slate-600">
                                {request.handle ? `@${request.handle}` : fr ? "Compte sans pseudo public" : "No public handle"}
                                {" · "}
                                {fr
                                  ? `depuis ${formatDate(request.joinedAt.slice(0, 10), "fr")}`
                                  : `since ${formatDate(request.joinedAt.slice(0, 10), "en")}`}
                              </p>
                            </div>
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800">
                              {fr ? "En attente" : "Pending"}
                            </span>
                          </div>

                          {queueCanReview && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <CmmButton
                                type="button"
                                tone="primary"
                                variant="pill"
                                size="sm"
                                disabled={reviewingQueueId === request.id}
                                onClick={() => {
                                  void reviewQueueRequest(request.id, "accept");
                                }}
                              >
                                {reviewingQueueId === request.id
                                  ? "..."
                                  : fr
                                    ? "Accepter"
                                    : "Accept"}
                              </CmmButton>
                              <CmmButton
                                type="button"
                                tone="secondary"
                                variant="pill"
                                size="sm"
                                disabled={reviewingQueueId === request.id}
                                onClick={() => {
                                  void reviewQueueRequest(request.id, "reject");
                                }}
                              >
                                {reviewingQueueId === request.id
                                  ? "..."
                                  : fr
                                    ? "Refuser"
                                    : "Reject"}
                              </CmmButton>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-dashed border-emerald-200/80 bg-white/80 px-3 py-3 text-sm text-slate-700">
                      {fr
                        ? "Aucune demande en attente sur ce formulaire."
                        : "No requests are waiting on this form."}
                    </div>
                  )}
                </div>

                <div className="rounded-[1.25rem] border border-emerald-200/60 bg-emerald-50/40 px-4 py-3 text-sm leading-relaxed text-slate-700">
                  {fr
                    ? `${orderedItems.length} action${orderedItems.length > 1 ? "s" : ""} visible${orderedItems.length > 1 ? "s" : ""} avec le filtre ${activeFilterLabel}.`
                    : `${orderedItems.length} visible action${orderedItems.length > 1 ? "s" : ""} with the ${activeFilterLabel} filter.`}
                </div>
              </div>
            </FamilyRubriqueCard>

            <FamilyRubriqueCard withHover={false} className="p-8 scroll-mt-24" id="mon-suivi">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700/70">
                  {fr ? "Mon suivi" : "My tracking"}
                </p>
                <h2 className="text-xl font-black tracking-tight text-white">
                  {fr ? "Mes participations" : "My participations"}
                </h2>
                {authenticated ? (
                  <div className="space-y-4">
                    <div className="rounded-[1.25rem] border border-emerald-200/60 bg-emerald-50/40 px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700/70">
                        {fr ? "Résumé" : "Summary"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {fr
                          ? `${activeParticipationItems.length} participation${activeParticipationItems.length > 1 ? "s" : ""} active${activeParticipationItems.length > 1 ? "s" : ""}`
                          : `${activeParticipationItems.length} active participation${activeParticipationItems.length > 1 ? "s" : ""}`}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">
                        {fr
                          ? "Dernière jonction confirmée, file d'attente et origine restent synchronisées."
                          : "Latest confirmed join, waitlist, and source stay synchronized."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <CmmButton
                        tone="secondary"
                        variant="pill"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setJoinFilter("joined");
                          setSort("latest");
                        }}
                      >
                        {fr ? "Voir mes participations actives" : "View my active participations"}
                      </CmmButton>
                      <CmmButton
                        tone="secondary"
                        variant="pill"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setJoinFilter("all");
                          setSort("soonest");
                        }}
                      >
                        {fr ? "Revenir à la liste" : "Back to list"}
                      </CmmButton>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-slate-700">
                    {fr
                      ? "Connectez-vous pour retrouver vos participations et leur statut."
                      : "Sign in to find your participations and their status."}
                  </p>
                )}
              </div>
            </FamilyRubriqueCard>
          </div>
        </div>

        {pendingJoinAction && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setPendingJoinActionId(null);
              }
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="join-dialog-title"
              aria-describedby="join-dialog-description"
              className="w-full max-w-lg rounded-[2rem] border border-emerald-200 bg-white p-6 text-slate-900 shadow-[0_30px_80px_-32px_rgba(15,23,42,0.55)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700/70">
                    {fr ? "Confirmation" : "Confirmation"}
                  </p>
                  <h2 id="join-dialog-title" className="text-xl font-black tracking-tight">
                    {fr ? "Confirmer cette participation ?" : "Confirm this participation?"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setPendingJoinActionId(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                  aria-label={fr ? "Fermer la confirmation" : "Close confirmation"}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>

              <div id="join-dialog-description" className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
                <p>
                  {fr
                    ? "Votre demande apparaît dans la file publique."
                    : "Your request appears in the public queue."}
                </p>
                <p>
                  {fr
                    ? "Le créateur du formulaire ou un admin peut l'accepter ou la refuser."
                    : "The form creator or an admin can accept or reject it."}
                </p>
                <p>
                  {fr
                    ? "La demande n'est pas modifiable depuis cette page."
                    : "Requests cannot be edited here."}
                </p>
                {pendingJoinAction && (
                  <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 px-4 py-3 text-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700/70">
                      {fr ? "Action ciblée" : "Selected action"}
                    </p>
                    <p className="mt-1 font-semibold">{pendingJoinAction.location_label}</p>
                    <p className="text-sm text-slate-600">
                      {formatDate(pendingJoinAction.action_date, fr ? "fr" : "en")} ·{" "}
                      {formatCount(pendingJoinAction.participantsCount)}{" "}
                      {fr ? "participant(s)" : "participant(s)"}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPendingJoinActionId(null)}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                >
                  {fr ? "Annuler" : "Cancel"}
                </button>
                <button
                  ref={confirmButtonRef}
                  type="button"
                  onClick={() => {
                    void confirmPendingJoin();
                  }}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[color:var(--cmm-button-primary-border)] bg-[linear-gradient(135deg,var(--cmm-button-primary-bg-start)_0%,var(--cmm-button-primary-bg-end)_100%)] px-5 text-sm font-semibold text-[var(--cmm-button-primary-text)] shadow-[0_14px_28px_-18px_rgba(15,23,42,0.20)] transition-all duration-200 hover:border-[color:var(--cmm-button-primary-border-hover)] hover:bg-[linear-gradient(135deg,var(--cmm-button-primary-bg-hover-start)_0%,var(--cmm-button-primary-bg-hover-end)_100%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cmm-button-primary-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fr ? "Envoyer la demande" : "Send request"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SectionShell>
  );
}
