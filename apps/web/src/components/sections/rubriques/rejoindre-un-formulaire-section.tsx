"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { PageHero, PageHeroBadge } from "@/components/ui/page-hero";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { CmmButton } from "@/components/ui/cmm-button";
import type {
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
  participantsCount: number;
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

function ActionMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-emerald-200/70 bg-emerald-50/40 px-3 py-2">
      <Icon size={14} className="text-emerald-700" />
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.28em] text-emerald-800/70">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
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

type ProgressStep = {
  id: string;
  index: number;
  title: string;
  description: string;
};

function ProgressStepper({
  steps,
}: {
  steps: ProgressStep[];
}) {
  return (
    <nav aria-label="Progression du formulaire de groupe">
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <li
            key={step.id}
            className="relative rounded-[1.5rem] border border-emerald-200/70 bg-white/85 px-4 py-4 shadow-[0_14px_30px_-24px_rgba(16,185,129,0.28)]"
          >
            <a href={`#${step.id}`} className="block">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-sm font-black text-emerald-800">
                  {step.index}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700/70">
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    {step.description}
                  </p>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function getJoinFilterLabel(filter: JoinableActionJoinFilter, fr: boolean): string {
  switch (filter) {
    case "available":
      return fr ? "À rejoindre" : "To join";
    case "joined":
      return fr ? "Déjà rejoints" : "Joined";
    case "all":
    default:
      return fr ? "Tous" : "All";
  }
}

function getJoinSortLabel(sort: JoinableActionSort, fr: boolean): string {
  switch (sort) {
    case "latest":
      return fr ? "Date la plus lointaine" : "Latest date";
    case "participants-desc":
      return fr ? "Plus de participants" : "Most participants";
    case "participants-asc":
      return fr ? "Moins de participants" : "Fewest participants";
    case "location-asc":
      return fr ? "Lieu A → Z" : "Location A → Z";
    case "soonest":
    default:
      return fr ? "Date la plus proche" : "Soonest date";
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
  const [search, setSearch] = useState("");
  const [joinFilter, setJoinFilter] = useState<JoinableActionJoinFilter>("all");
  const [sort, setSort] = useState<JoinableActionSort>("soonest");
  const focusActionId = searchParams.get("actionId")?.trim() || null;
  const listUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: "24", historyLimit: "12" });
    if (focusActionId) {
      params.set("actionId", focusActionId);
    }
    return `/api/actions/group-join?${params.toString()}`;
  }, [focusActionId]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadActions() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(listUrl, {
          signal: controller.signal,
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
    }

    void loadActions();

    return () => controller.abort();
  }, [fr, listUrl]);

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
        ? "Aucune action validée et ouverte n'est prête à être rejointe pour le moment."
        : "No validated and opened actions are available to join right now.",
    [fr],
  );
  const joinedItems = useMemo(
    () => historyItems.filter((item) => item.joined),
    [historyItems],
  );
  const recentJoinedItems = useMemo(
    () => joinedItems.slice(0, 4),
    [joinedItems],
  );
  const progressSteps = [
    {
      id: "explorer-actions",
      index: 1,
      title: fr ? "Explorer" : "Explore",
      description: fr
        ? "Repérez les actions validées, puis ouvrez les cartes qui vous intéressent."
        : "Find approved actions, then open the cards that matter to you.",
    },
    {
      id: "filtres-rapides",
      index: 2,
      title: fr ? "Affiner" : "Refine",
      description: fr
        ? "Cherchez, filtrez et triez pour réduire la liste sans perdre le contexte."
        : "Search, filter, and sort to narrow the list without losing context.",
    },
    {
      id: "mon-suivi",
      index: 3,
      title: fr ? "Suivre" : "Track",
      description: fr
        ? "Gardez vos participations récentes sous la main et revenez rapidement dessus."
        : "Keep your recent participations close and jump back to them quickly.",
    },
  ] satisfies ProgressStep[];
  const activeFilterLabel = getJoinFilterLabel(joinFilter, fr);
  const activeSortLabel = getJoinSortLabel(sort, fr);

  async function handleJoin(actionId: string) {
    const confirmed = window.confirm(
      fr
        ? "Rejoindre ce formulaire enregistrera votre participation. Continuer ?"
        : "Joining this form will record your participation. Continue?",
    );
    if (!confirmed) {
      return;
    }

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
      setItems((previous) =>
        previous.map((item) =>
          item.id === actionId
            ? {
                ...item,
                joined: true,
                joinedAt: joined.joinedAt,
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
            joined: true,
            joinedAt: joined.joinedAt,
            groupJoinEnabled: currentItem.groupJoinEnabled,
          },
          ...previous.filter((item) => item.id !== actionId),
        ]);
      }
      setNotice(
        joined.alreadyJoined
          ? fr
            ? "Vous étiez déjà inscrit sur ce formulaire."
            : "You had already joined this form."
          : fr
            ? "Participation enregistrée."
            : "Participation saved.",
      );
    } finally {
      setJoiningId(null);
    }
  }

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
              ? "Rejoindre un formulaire issu d'une action déjà validée et ouverte par l'organisateur, sans créer une nouvelle action."
              : "Join a form from an already approved action opened by the organizer, without creating a new action."
          }
          badges={
            <>
              <PageHeroBadge family={pageFamily}>Action validée requise</PageHeroBadge>
              <PageHeroBadge family={pageFamily} muted>
                {fr ? "Participation traçable" : "Traceable participation"}
              </PageHeroBadge>
            </>
          }
          className="max-w-4xl"
        />

        <ProgressStepper steps={progressSteps} />

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
                    ? "Chaque carte ci-dessous correspond à une action déjà validée et explicitement ouverte par l'organisateur. Vous pouvez rechercher, filtrer et trier la sélection avant de rejoindre; l'action choisie enregistre ensuite votre participation dans `action_participants` et alimente les badges et les stats."
                    : "Each card below maps to an already approved action that the organizer has explicitly opened. You can search, filter, and sort the selection before joining; the chosen action then records your participation in `action_participants` and updates badges and stats."}
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
                      {fr ? "Chargement des actions validées..." : "Loading approved actions..."}
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
                              ? "Le flux de participation est temporairement indisponible."
                              : "The participation flow is temporarily unavailable.",
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
                  <p className="text-sm font-semibold">{emptyMessage}</p>
                  <p className="mt-2 text-sm leading-relaxed">
                    {fr
                      ? "Le flux attend qu'une action soit validée par un admin avant d'afficher un bouton de jonction."
                      : "This flow waits for an admin-approved action before showing a join button."}
                  </p>
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
                            ? "Lieu, date, durée, nombre de participants..."
                            : "Location, date, duration, participant count..."
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
                          {fr ? "À rejoindre" : "To join"}
                        </FilterPill>
                        <FilterPill active={joinFilter === "joined"} onClick={() => setJoinFilter("joined")}>
                          {fr ? "Déjà rejoints" : "Joined"}
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
                            {item.joined && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-700">
                                {fr ? "Déjà rejoint" : "Already joined"}
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl font-black tracking-tight text-slate-900">
                            {item.location_label}
                          </h3>

                          {item.joined && item.joinedAt && (
                            <p className="text-xs font-semibold text-emerald-800">
                              {fr ? "Rejoint le" : "Joined on"}{" "}
                              {formatDate(item.joinedAt.slice(0, 10), fr ? "fr" : "en")}
                            </p>
                          )}

                          <div className="grid gap-2 md:grid-cols-3">
                            <ActionMeta
                              icon={CalendarDays}
                              label={fr ? "Date" : "Date"}
                              value={formatDate(item.action_date, fr ? "fr" : "en")}
                            />
                            <ActionMeta
                              icon={Users2}
                              label={fr ? "Participation" : "Participation"}
                              value={`${formatCount(item.participantsCount)}${item.volunteers_count > 0 ? ` / ${formatCount(item.volunteers_count)}` : ""}`}
                            />
                            <ActionMeta
                              icon={MapPin}
                              label={fr ? "Durée" : "Duration"}
                              value={`${formatCount(item.duration_minutes)} min`}
                            />
                          </div>

                          <p className="text-sm leading-relaxed text-slate-600">
                            {fr
                              ? "Le formulaire de cette action est déjà créé. Votre participation est ajoutée au même fil de validation et reste traçable séparément."
                              : "The form for this action already exists. Your participation is added to the same validation thread and stays individually traceable."}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col gap-3 md:items-end">
                          {authenticated ? (
                            <CmmButton
                              tone="primary"
                              variant="pill"
                              className="min-w-[12rem] px-6"
                              disabled={joiningId === item.id || item.joined}
                              onClick={() => void handleJoin(item.id)}
                            >
                              {joiningId === item.id ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  {fr ? "Enregistrement..." : "Saving..."}
                                </>
                              ) : item.joined ? (
                                <>
                                  <CheckCircle2 size={14} />
                                  {fr ? "Déjà rejoint" : "Already joined"}
                                </>
                              ) : (
                                <>
                                  <ClipboardList size={14} />
                                  {fr ? "Rejoindre le formulaire" : "Join the form"}
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
                              ? fr
                                ? "Une seule participation est enregistrée par bénévole et par action."
                                : "One participation is stored per volunteer and per action."
                              : fr
                                ? "Connectez-vous pour enregistrer votre participation."
                                : "Sign in to record your participation."}
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
                      {fr ? "Rejointes" : "Joined"}
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{joinedItems.length}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-emerald-200/60 bg-emerald-50/40 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700/70">
                      {fr ? "Tri" : "Sort"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{activeSortLabel}</p>
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
                    <CmmButton href="#filtres-rapides" tone="secondary" variant="pill" size="sm">
                      {fr ? "Filtres" : "Filters"}
                    </CmmButton>
                    <CmmButton href="#mon-suivi" tone="secondary" variant="pill" size="sm">
                      {fr ? "Mon suivi" : "My tracking"}
                    </CmmButton>
                    <CmmButton href="#regles" tone="secondary" variant="pill" size="sm">
                      {fr ? "Règles" : "Rules"}
                    </CmmButton>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-emerald-200/60 bg-emerald-50/40 px-4 py-3 text-sm leading-relaxed text-slate-700">
                  {fr
                    ? `Filtre actif: ${activeFilterLabel}. Résultats visibles: ${orderedItems.length} sur ${items.length}.`
                    : `Active filter: ${activeFilterLabel}. Visible results: ${orderedItems.length} of ${items.length}.`}
                </div>

                <ul id="regles" className="space-y-3 text-sm leading-relaxed text-slate-700 scroll-mt-24">
                  <li className="rounded-[1.25rem] border border-emerald-200/60 bg-emerald-50/40 px-4 py-3">
                    {fr
                      ? "La carte n'apparaît que si l'action est validée par un admin et ouverte par l'organisateur."
                      : "The card appears only after admin validation and organizer opening."}
                  </li>
                  <li className="rounded-[1.25rem] border border-emerald-200/60 bg-emerald-50/40 px-4 py-3">
                    {fr
                      ? "La participation est stockée dans `action_participants` avec unicité par bénévole et par action."
                      : "Participation is stored in `action_participants` with uniqueness per volunteer and action."}
                  </li>
                  <li className="rounded-[1.25rem] border border-emerald-200/60 bg-emerald-50/40 px-4 py-3">
                    {fr
                      ? "Le score de profil et les badges peuvent se recalculer après la jonction."
                      : "Profile score and badges can be recalculated after joining."}
                  </li>
                  <li className="rounded-[1.25rem] border border-emerald-200/60 bg-emerald-50/40 px-4 py-3">
                    {fr
                      ? "La création d'une action reste dans la rubrique `Déclarer une action`."
                      : "Creating a new action remains in the `Declare action` section."}
                  </li>
                </ul>
              </div>
            </FamilyRubriqueCard>

            <FamilyRubriqueCard withHover={false} className="p-8 scroll-mt-24" id="mon-suivi">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700/70">
                  {fr ? "Mon suivi" : "My tracking"}
                </p>
                <h2 className="text-xl font-black tracking-tight text-white">
                  {fr ? "Mes actions rejointes" : "My joined actions"}
                </h2>
                {authenticated ? (
                  <div className="space-y-4">
                    <div className="rounded-[1.25rem] border border-emerald-200/60 bg-emerald-50/40 px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700/70">
                        {fr ? "Participation actuelle" : "Current participation"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {fr
                          ? `${joinedItems.length} action${joinedItems.length > 1 ? "s" : ""} rejoint${joinedItems.length > 1 ? "es" : ""}`
                          : `${joinedItems.length} joined action${joinedItems.length > 1 ? "s" : ""}`}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">
                        {fr
                          ? "Votre historique récent est synchronisé ici, avec l'état de chaque participation et la date d'inscription."
                          : "Your recent history is synchronized here, with each participation state and join date."}
                      </p>
                    </div>

                    {recentJoinedItems.length > 0 ? (
                      <div className="space-y-3">
                        {recentJoinedItems.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-[1.25rem] border border-emerald-200/60 bg-white/80 px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 space-y-1">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {item.location_label}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatDate(item.action_date, fr ? "fr" : "en")} ·{" "}
                                  {fr ? "rejoint le" : "joined on"}{" "}
                                  {formatDate(item.joinedAt.slice(0, 10), fr ? "fr" : "en")}
                                </p>
                              </div>
                              <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-800">
                                {fr ? "Inscrit" : "Joined"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-[1.25rem] border border-dashed border-emerald-200/70 bg-emerald-50/30 px-4 py-3 text-sm leading-relaxed text-slate-700">
                        {fr
                          ? "Aucune participation enregistrée pour l'instant. Rejoignez un formulaire pour faire apparaître votre historique ici."
                          : "No participation recorded yet. Join a form to make your history appear here."}
                      </p>
                    )}

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
                        {fr ? "Voir mes actions rejointes" : "View my joined actions"}
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
                      ? "Connectez-vous pour retrouver vos actions rejointes, votre historique récent et l'état de vos participations."
                      : "Sign in to find your joined actions, recent history, and participation state."}
                  </p>
                )}
              </div>
            </FamilyRubriqueCard>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
