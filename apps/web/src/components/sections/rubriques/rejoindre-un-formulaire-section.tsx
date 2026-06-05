"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, CheckCircle2, ClipboardList, Loader2, MapPin, ShieldCheck, Users2, type LucideIcon } from "lucide-react";
import { PageHero, PageHeroBadge } from "@/components/ui/page-hero";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { CmmButton } from "@/components/ui/cmm-button";
import type { JoinableActionItem } from "@/lib/actions/group-participation";

type JoinableActionsResponse = {
  status: "ok";
  authenticated: boolean;
  count: number;
  items: JoinableActionItem[];
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
  const focusActionId = searchParams.get("actionId")?.trim() || null;
  const listUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: "6" });
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
  const orderedItems = useMemo(() => {
    if (!focusActionId) {
      return items;
    }

    const focused = items.find((item) => item.id === focusActionId);
    if (!focused) {
      return items;
    }

    return [focused, ...items.filter((item) => item.id !== focusActionId)];
  }, [focusActionId, items]);
  const emptyMessage = useMemo(
    () =>
      fr
        ? "Aucune action validée et ouverte n'est prête à être rejointe pour le moment."
        : "No validated and opened actions are available to join right now.",
    [fr],
  );

  async function handleJoin(actionId: string) {
    const confirmed = window.confirm(
      fr
        ? "Rejoindre ce formulaire enregistrera votre participation. Continuer ?"
        : "Joining this form will record your participation. Continue?",
    );
    if (!confirmed) {
      return;
    }

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

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <FamilyRubriqueCard withHover={false} className="p-8">
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
                    ? "Chaque carte ci-dessous correspond à une action déjà validée et explicitement ouverte par l'organisateur. Rejoindre enregistre votre participation dans `action_participants` et alimente les badges et les stats."
                    : "Each card below maps to an already approved action that the organizer has explicitly opened. Joining records your participation in `action_participants` and updates badges and stats."}
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

              {notice && (
                <div className="rounded-[1.5rem] border border-emerald-200/70 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-900">
                  {notice}
                </div>
              )}
            </div>
          </FamilyRubriqueCard>

          <div className="space-y-6">
            <FamilyRubriqueCard withHover={false} className="p-8">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700/70">
                  {fr ? "Règles" : "Rules"}
                </p>
                <h2 className="text-xl font-black tracking-tight text-white">
                  {fr ? "Ce flux rejoint, il ne crée rien" : "This flow joins, it does not create"}
                </h2>
                <ul className="space-y-3 text-sm leading-relaxed text-slate-700">
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

            <FamilyRubriqueCard withHover={false} className="p-8">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700/70">
                  {fr ? "Synchronisation" : "Sync"}
                </p>
                <h2 className="text-xl font-black tracking-tight text-white">
                  {fr ? "Badges, stats et traçabilité" : "Badges, stats, and traceability"}
                </h2>
                <p className="text-sm leading-relaxed text-slate-700">
                  {fr
                    ? "La table de participation alimente le badge Participant et les compteurs de progression collective. Le backend rejette toute jonction sur une action encore en attente ou non ouverte."
                    : "The participation table feeds the Participant badge and collective progression counters. The backend rejects any join request for a still-pending or closed action."}
                </p>
              </div>
            </FamilyRubriqueCard>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
