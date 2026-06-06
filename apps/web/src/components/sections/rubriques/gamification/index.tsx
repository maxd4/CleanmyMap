"use client";

import { useCallback, useMemo, useState } from "react";
import { Search, ShieldCheck, Sparkles, Users, Eye, Flag, Settings2, Moon, Globe, ChevronRight, Play, BadgeCheck, PartyPopper, TrendingUp, Zap, X, type LucideIcon } from "lucide-react";
import useSWR from "swr";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { cn } from "@/lib/utils";
import { dispatchGamificationCelebration } from "@/lib/gamification/celebration";
import { buildCollectionSummary } from "./collections-panel";
import { buildLightCelebrationPreview } from "./light-celebrations-panel";
import { buildPersonalizationSnapshot } from "./personalization-panel";
import { buildRoleStatusCards } from "./roles-status-panel";
import type { MeResponse } from "./gamification-types";
import type { DisplayMode } from "@/lib/ui/preferences";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "Requête API impossible.";
    throw new Error(message);
  }
  return body as T;
}

type RoleCard = ReturnType<typeof buildRoleStatusCards>[number];

function getCurrentRoleCard(cards: RoleCard[]): RoleCard {
  for (let index = cards.length - 1; index >= 0; index -= 1) {
    if (cards[index]?.unlocked) {
      return cards[index];
    }
  }
  return cards[0];
}

function getNextRoleCard(cards: RoleCard[]): RoleCard | null {
  return cards.find((card) => !card.unlocked) ?? null;
}

function SectionLabel({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c51f1f] text-white shadow-[0_10px_30px_rgba(197,31,31,0.28)]">
        <Icon size={18} strokeWidth={2.3} />
      </div>
      <div className="space-y-1">
        <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-[#211312]">
          {title}
        </h3>
        <p className="max-w-2xl text-[13px] leading-relaxed text-[#7f635d]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function HeroArtwork() {
  return (
    <div className="relative mx-auto h-[20rem] w-full max-w-[36rem] overflow-hidden rounded-[2.5rem] border border-[#f0d9d2] bg-[linear-gradient(180deg,#fffaf8_0%,#fff0eb_100%)] shadow-[0_24px_70px_rgba(160,43,31,0.12)] lg:h-[24rem]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(245,85,74,0.28)_0%,rgba(245,85,74,0.12)_16%,transparent_40%),radial-gradient(circle_at_82%_30%,rgba(241,74,63,0.16)_0%,transparent_30%),radial-gradient(circle_at_60%_70%,rgba(197,31,31,0.08)_0%,transparent_40%)]" />
      <div className="absolute right-7 top-7 h-32 w-32 rounded-full border border-[#f4b5ad]/80 bg-[#ff7a73]/75 shadow-[0_0_0_22px_rgba(255,121,113,0.10),0_0_0_44px_rgba(255,121,113,0.05)]" />
      <div className="absolute right-4 top-4 h-40 w-40 rounded-full border border-dashed border-[#efb0a7] opacity-80" />
      <div className="absolute right-0 top-20 h-28 w-28 rounded-full border border-dashed border-[#efb0a7] opacity-50" />

      <svg
        viewBox="0 0 720 520"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="gamification-hill-1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f8b6ae" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#df2b22" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="gamification-hill-2" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f7a59b" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#c61d1d" stopOpacity="0.98" />
          </linearGradient>
          <linearGradient id="gamification-road" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#fff8f6" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#ffd9d0" stopOpacity="0.88" />
          </linearGradient>
          <filter id="gamification-glow">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        <circle cx="595" cy="95" r="78" fill="#ff6c63" opacity="0.16" filter="url(#gamification-glow)" />
        <circle cx="595" cy="95" r="44" fill="#ff6c63" opacity="0.95" />

        <path
          d="M0 405C78 372 120 378 180 360C238 343 281 288 356 272C432 255 471 306 534 300C593 294 620 251 720 228V520H0Z"
          fill="url(#gamification-hill-1)"
        />
        <path
          d="M0 465C88 423 152 430 220 404C288 379 312 320 388 304C470 286 520 345 587 338C639 332 674 300 720 285V520H0Z"
          fill="url(#gamification-hill-2)"
        />

        <path
          d="M526 176C576 170 612 179 650 185C681 190 703 186 720 180"
          fill="none"
          stroke="#f3cdc5"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M531 179C531 226 533 258 536 333"
          fill="none"
          stroke="#d37064"
          strokeWidth="2"
          opacity="0.45"
        />
        <circle cx="531" cy="178" r="11" fill="#fffdfb" stroke="#bb362f" strokeWidth="3" />
        <text x="531" y="182" textAnchor="middle" fontSize="13" fontWeight="700" fill="#bb362f">
          R
        </text>

        <path
          d="M180 476C228 456 266 428 319 387C371 347 416 299 465 246C513 193 564 170 642 134"
          fill="none"
          stroke="url(#gamification-road)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M181 477C229 457 269 431 322 389C374 349 420 301 468 249C517 196 568 172 646 137"
          fill="none"
          stroke="#cf241e"
          strokeOpacity="0.45"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="12 10"
        />

        {[
          [260, 320],
          [300, 292],
          [332, 320],
          [400, 284],
          [428, 252],
          [470, 238],
          [518, 222],
          [570, 188],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="5.5" fill="#bb241e" opacity="0.9" />
        ))}

        {[
          [120, 138],
          [182, 160],
          [224, 126],
          [636, 164],
          [688, 120],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#f4bdb4" opacity="0.9" />
        ))}

        <path
          d="M628 272c16-12 31-13 45-4 12 8 20 22 23 43"
          fill="none"
          stroke="#ff9d93"
          strokeWidth="3"
          opacity="0.45"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function HeroBlock({ fr }: { fr: boolean }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <p className="text-[11px] font-black uppercase tracking-[0.42em] text-[#c51f1f]">
            Impact rouge
          </p>
          <div className="space-y-4">
            <h1 className="text-[clamp(2.8rem,5vw,4.8rem)] font-black leading-[0.93] tracking-[-0.05em] text-[#2a1412]">
              {fr ? "Écosystème & Gamification" : "Ecosystem & Gamification"}
            </h1>
            <p className="max-w-2xl text-[clamp(1.05rem,1.7vw,1.55rem)] font-medium leading-tight text-[#4f2e29]">
              {fr ? "Engagement communautaire et impact validé" : "Community engagement and validated impact"}
            </p>
          </div>
          <p className="max-w-2xl text-[15px] leading-7 text-[#6f5450]">
            {fr
              ? "Votre progression reflète des contributions vérifiées et votre participation au service de l'intérêt collectif. Chaque action compte."
              : "Your progression reflects verified contributions and participation in service of the common good. Every action counts."}
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-x-8 top-10 h-24 rounded-full bg-[#ff6d62]/10 blur-3xl" aria-hidden="true" />
          <HeroArtwork />
        </div>
      </div>
    </section>
  );
}

function EmptyStateCard({
  title,
  description,
  icon: Icon,
  ctaLabel,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-[#f1dfd8] bg-[#fff8f6] px-6 py-12 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#fff0ee] text-[#f19a92] shadow-inner">
        <Icon size={40} strokeWidth={1.9} />
      </div>
      <p className="mt-8 max-w-xs text-[22px] font-black leading-[1.15] tracking-[-0.03em] text-[#291714]">
        {title}
      </p>
      <p className="mt-3 max-w-md text-[14px] leading-7 text-[#6f5a56]">
        {description}
      </p>
      <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#efb0a9] bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#ba302b]">
        <Sparkles size={12} />
        {ctaLabel}
      </p>
    </div>
  );
}

function EngagementPanel({
  progression,
  loading,
  error,
  locale,
}: {
  progression: MeResponse["progression"] | undefined;
  loading: boolean;
  error: unknown;
  locale: string;
}) {
  const fr = locale === "fr";

  if (loading) {
    return (
      <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
        <div className="animate-pulse space-y-5">
          <div className="h-4 w-48 rounded-full bg-[#f5e7e2]" />
          <div className="h-8 w-72 rounded-full bg-[#f5e7e2]" />
          <div className="rounded-[1.75rem] border border-[#f3e5e0] bg-[#fff8f6] p-5">
            <div className="h-7 w-40 rounded-full bg-[#f5e7e2]" />
            <div className="mt-4 h-16 rounded-2xl bg-[#f5e7e2]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-36 rounded-[1.5rem] bg-[#f6ece8]" />
            <div className="h-36 rounded-[1.5rem] bg-[#f6ece8]" />
          </div>
        </div>
      </section>
    );
  }

  if (error || !progression) {
    return (
      <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0ee] text-[#cf3830]">
            <ShieldCheck size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#c51f1f]">
              {fr ? "Parcours d'engagement" : "Engagement journey"}
            </p>
            <p className="text-sm font-semibold text-[#2c1a17]">
              {fr
                ? "Le moteur de progression n'est pas disponible pour le moment."
                : "The progression engine is not available right now."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const roleCards = buildRoleStatusCards(progression.recognition.currentContributor);
  const currentRole = getCurrentRoleCard(roleCards);
  const nextRole = getNextRoleCard(roleCards);
  const currentDescription =
    currentRole.key === "observateur" && (!progression.recognition.currentContributor || progression.recognition.currentContributor.verifiedContributions <= 0)
      ? fr
        ? "Découvrez le terrain et suivez la progression."
        : "Discover the terrain and follow the progression."
      : fr
        ? currentRole.descriptionFr
        : currentRole.descriptionEn;
  const contributionNote =
    progression.recognition.currentContributor?.verifiedContributions && progression.recognition.currentContributor.verifiedContributions > 0
      ? fr
        ? `${progression.recognition.currentContributor.verifiedContributions} actions vérifiées`
        : `${progression.recognition.currentContributor.verifiedContributions} verified actions`
      : fr
        ? "Aucune contribution validée pour le moment."
        : "No validated contribution yet.";
  const progressNote = progression.nextLevel.requirements.missing[0]
    ? progression.nextLevel.requirements.missing[0]
    : fr
      ? "Les règles exactes de progression seront bientôt disponibles."
      : "The exact progression rules will be available soon.";

  const StatusIcon =
    currentRole.key === "observateur" ? Eye : currentRole.key === "contributeur" ? BadgeCheck : currentRole.key === "referent" ? Users : currentRole.key === "mentor" ? Sparkles : ShieldCheck;

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={TrendingUp}
        title={fr ? "Parcours d'engagement" : "Engagement journey"}
        subtitle={fr ? "Votre progression se débloque au fil de vos contributions validées." : "Your progress unlocks as your validated contributions accumulate."}
      />

      <div className="mt-6 rounded-[1.75rem] border border-[#f1d9d3] bg-[#fff7f5] p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#c51f1f] text-white shadow-[0_16px_40px_rgba(197,31,31,0.22)]">
            <StatusIcon size={24} strokeWidth={2.1} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#cf3a33]">
              {fr ? "Statut actuel" : "Current status"}
            </p>
            <p className="mt-2 text-[clamp(1.5rem,2vw,1.9rem)] font-black tracking-[-0.04em] text-[#281413]">
              {fr ? currentRole.labelFr : currentRole.labelEn}
            </p>
            <p className="mt-2 max-w-xl text-[14px] leading-7 text-[#6e5550]">
              {currentDescription}
            </p>
            <p className="mt-2 text-[12px] font-medium text-[#8c716b]">
              {contributionNote}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-7">
        <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[#b53a33]">
          {fr ? "Prochains statuts" : "Next statuses"}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {roleCards.slice(1).map((card, index) => (
            <article
              key={card.key}
              className={cn(
                "rounded-[1.45rem] border p-4 transition-colors",
                card.unlocked
                  ? "border-[#efc5be] bg-[#fff6f4]"
                  : "border-[#f1e1dc] bg-white",
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-black",
                  card.unlocked ? "bg-[#c51f1f] text-white" : "border border-[#efcfc8] bg-white text-[#b34a41]",
                )}>
                  {index + 1}
                </div>
                <div className="space-y-1">
                  <p className="text-[12px] font-black text-[#241614]">
                    {fr ? card.labelFr : card.labelEn}
                  </p>
                  <p className="text-[12px] leading-6 text-[#7a625d]">
                    {fr ? card.descriptionFr : card.descriptionEn}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.55rem] border border-[#efc7c1] bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-[#efc6bf] bg-[#fff7f4] text-[#bf342e]">
              <Flag size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#c63b35]">
                {fr ? "Prochain statut" : "Next status"}
              </p>
              <p className="mt-2 text-[14px] font-bold text-[#281614]">
                {nextRole
                  ? fr
                    ? nextRole.labelFr
                    : nextRole.labelEn
                  : fr
                    ? "Parcours complet"
                    : "Completed path"}
              </p>
              <p className="mt-1 text-[13px] leading-6 text-[#7d625d]">
                {fr ? "Réalisez et validez votre première contribution." : "Make and validate your first contribution."}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.55rem] border border-[#efdcd7] bg-[#fffaf9] p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-[#edd6d0] bg-white text-[#c63b35]">
              <Settings2 size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#c63b35]">
                {fr ? "Moteur de progression" : "Progression engine"}
              </p>
              <p className="mt-2 text-[14px] font-bold text-[#281614]">
                {fr ? "En cours d'activation" : "Being activated"}
              </p>
              <p className="mt-1 text-[13px] leading-6 text-[#7d625d]">
                {progressNote}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecognitionPanel({
  locale,
  scope,
  setScope,
  searchQuery,
  setSearchQuery,
}: {
  locale: string;
  scope: "individual" | "collective";
  setScope: (value: "individual" | "collective") => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}) {
  const fr = locale === "fr";
  const scopeLabel = scope === "individual" ? (fr ? "Comptes" : "Accounts") : (fr ? "Structures" : "Organizations");
  const placeholder =
    scope === "individual"
      ? fr
        ? "Rechercher un compte (nom, structure)..."
        : "Search an account (name, organization)..."
      : fr
        ? "Rechercher une structure..."
        : "Search an organization...";
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={Users}
        title={fr ? "Reconnaissance sociale" : "Social recognition"}
        subtitle={fr ? "Le classement met en lumière l'engagement au sein de la communauté." : "The ranking highlights engagement across the community."}
      />

      <div className="mt-5 flex w-fit rounded-full border border-[#f0d9d2] bg-[#fff7f5] p-1">
        <button
          type="button"
          onClick={() => setScope("individual")}
          className={cn(
            "rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-[0.24em] transition-colors",
            scope === "individual"
              ? "bg-[#c51f1f] text-white shadow-[0_10px_24px_rgba(197,31,31,0.18)]"
              : "text-[#7c645d] hover:text-[#301815]",
          )}
        >
          {fr ? "Comptes" : "Accounts"}
        </button>
        <button
          type="button"
          onClick={() => setScope("collective")}
          className={cn(
            "rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-[0.24em] transition-colors",
            scope === "collective"
              ? "bg-[#c51f1f] text-white shadow-[0_10px_24px_rgba(197,31,31,0.18)]"
              : "text-[#7c645d] hover:text-[#301815]",
          )}
        >
          {fr ? "Structures" : "Organizations"}
        </button>
      </div>

      <p className="mt-4 max-w-2xl text-[14px] leading-7 text-[#6f5a56]">
        {fr
          ? "Le classement met en lumière l'engagement au sein de la communauté."
          : "The ranking highlights engagement across the community."}
      </p>

      <div className="relative mt-5">
        <Search
          size={17}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a58c86]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-[1.35rem] border border-[#eadad4] bg-white py-3.5 pl-12 pr-12 text-sm text-[#281614] placeholder:text-[#a58c86] focus:border-[#dd5a52] focus:outline-none focus:ring-4 focus:ring-[#f7d4cf]"
        />
        {searchQuery.trim().length > 0 ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full border border-[#eadad4] bg-[#fff7f5] p-1.5 text-[#af625a] transition hover:border-[#cf3b34] hover:text-[#bb362f]"
            aria-label={fr ? "Effacer la recherche" : "Clear search"}
          >
            <X size={13} />
          </button>
        ) : null}
      </div>

      <div className="mt-6 rounded-[1.75rem] border border-[#f1dfd8] bg-[#fff8f6] px-5 py-10">
        <EmptyStateCard
          title={
            hasSearch
              ? fr
                ? "Aucune correspondance trouvée"
                : "No match found"
              : fr
                ? "Le moteur de classement n'est pas encore disponible"
                : "The ranking engine is not yet available"
          }
          description={
            hasSearch
              ? fr
                ? "Essayez un autre nom ou passez sur l'autre onglet pour comparer les structures."
                : "Try another name or switch tabs to compare organizations."
              : fr
                ? "La reconnaissance apparaîtra ici dès que des contributions validées seront enregistrées."
                : "Recognition will appear here as soon as validated contributions are recorded."
          }
          icon={hasSearch ? BadgeCheck : ShieldCheck}
          ctaLabel={scopeLabel}
        />
      </div>

      <div className="mt-5 rounded-[1.55rem] border border-[#efc7c1] bg-white px-4 py-4 text-center text-[13px] leading-6 text-[#9a625c]">
        {fr
          ? "Votre engagement compte. Continuez à contribuer : la reconnaissance suivra naturellement."
          : "Your engagement matters. Keep contributing: recognition will follow naturally."}
      </div>
    </section>
  );
}

function CollectionsPanel({
  progression,
  loading,
  error,
  locale,
}: {
  progression: MeResponse["progression"] | undefined;
  loading: boolean;
  error: unknown;
  locale: string;
}) {
  const fr = locale === "fr";

  if (loading) {
    return (
      <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-44 rounded-full bg-[#f5e7e2]" />
          <div className="h-6 w-64 rounded-full bg-[#f5e7e2]" />
          <div className="h-56 rounded-[1.75rem] bg-[#fff8f6]" />
        </div>
      </section>
    );
  }

  if (error || !progression) {
    return (
      <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
        <SectionLabel
          icon={BadgeCheck}
          title={fr ? "Badges et collections" : "Badges and collections"}
          subtitle={fr ? "Des distinctions lisibles et sobres, sans surcharge visuelle." : "Readable, restrained distinctions without visual overload."}
        />
        <div className="mt-6 rounded-[1.75rem] border border-[#f1dfd8] bg-[#fff8f6] p-6">
          <EmptyStateCard
            title={
              fr
                ? "La vitrine de collections n'est pas encore disponible"
                : "The collection showcase is not available yet"
            }
            description={
              fr
                ? "Les badges et collections apparaîtront dès que le contenu sera activé."
                : "Badges and collections will appear once the content is activated."
            }
            icon={BadgeCheck}
            ctaLabel={fr ? "Aperçu" : "Preview"}
          />
        </div>
      </section>
    );
  }

  const summary = buildCollectionSummary(progression);

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={BadgeCheck}
        title={fr ? "Badges et collections" : "Badges and collections"}
        subtitle={fr ? "Des distinctions lisibles et sobres, sans surcharge visuelle." : "Readable, restrained distinctions without visual overload."}
      />

      <div className="mt-6 rounded-[1.75rem] border border-[#f1dfd8] bg-[#fff8f6] p-6">
        <EmptyStateCard
          title={
            fr
              ? "La vitrine de collections n'est pas encore disponible"
              : "The collection showcase is not available yet"
          }
          description={
            fr
              ? "Les badges et collections apparaîtront dès que le contenu sera activé."
              : "Badges and collections will appear once the content is activated."
          }
          icon={BadgeCheck}
          ctaLabel={fr ? "Aperçu" : "Preview"}
        />
      </div>

      {summary.badgeCount > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              label: fr ? "Badges" : "Badges",
              value: summary.badgeCount,
            },
            {
              label: fr ? "Zones" : "Zones",
              value: summary.zoneCount,
            },
            {
              label: fr ? "Actions validées" : "Validated actions",
              value: summary.approvedActionCount,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.35rem] border border-[#efdad4] bg-[#fff8f6] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b0554d]">
                {item.label}
              </p>
              <p className="mt-2 text-[22px] font-black tracking-[-0.04em] text-[#281614]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CelebrationsPanel({ locale }: { locale: string }) {
  const fr = locale === "fr";
  const preview = useMemo(() => buildLightCelebrationPreview(locale), [locale]);

  const handlePreview = useCallback(() => {
    dispatchGamificationCelebration(preview);
  }, [preview]);

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <div className="flex items-start justify-between gap-4">
        <SectionLabel
          icon={PartyPopper}
          title={fr ? "Célébrations légères" : "Light celebrations"}
          subtitle={fr ? "Un retour visuel discret apparaît quand un palier est atteint." : "A discreet visual cue appears when a milestone is reached."}
        />
        <span className="inline-flex items-center rounded-full border border-[#efb0a9] bg-[#fff1ef] px-3 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-[#bb362f]">
          {fr ? "Aperçu" : "Preview"}
        </span>
      </div>

      <div className="mt-6 rounded-[1.75rem] border border-[#f1dfd8] bg-[#fff8f6] p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex min-h-40 items-center justify-center rounded-[1.5rem] border border-[#f1dfd8] bg-white">
            <div className="relative flex h-28 w-44 items-center justify-center">
              <div className="absolute left-2 top-3 h-20 w-20 rounded-[1.15rem] border border-[#f1c1b7] bg-[#ffd9d4] shadow-[0_14px_30px_rgba(197,31,31,0.12)]" />
              <div className="absolute right-2 top-0 h-10 w-10 rounded-[0.95rem] bg-[#cf3b34] shadow-[0_10px_26px_rgba(197,31,31,0.22)]" />
              <div className="absolute bottom-1 left-12 h-12 w-12 rounded-[0.95rem] border border-[#f1c1b7] bg-[#fff0ed]" />
              <div className="absolute z-10 h-12 w-12 rounded-[1rem] bg-white text-[#c51f1f] shadow-[0_12px_30px_rgba(197,31,31,0.12)]" />
            </div>
          </div>
          <div className="flex min-h-40 items-center justify-center rounded-[1.5rem] border border-[#f1dfd8] bg-white">
            <div className="relative flex h-28 w-44 items-center justify-center">
              <div className="absolute left-8 top-7 h-11 w-11 rounded-[0.95rem] bg-[#ff8f86] shadow-[0_12px_26px_rgba(197,31,31,0.18)]" />
              <div className="absolute right-7 top-10 h-14 w-14 rounded-[1.15rem] border border-[#f1c1b7] bg-[#fff0ed]" />
              <div className="absolute bottom-2 left-6 h-12 w-24 rounded-[1rem] bg-[#ffd9d4]" />
              <div className="absolute z-10 h-10 w-10 rounded-[0.9rem] bg-[#cf3b34] shadow-[0_12px_30px_rgba(197,31,31,0.18)]" />
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-[13px] leading-7 text-[#7b615c]">
          {fr
            ? "Toast discret, confetti léger et son bref quand un palier tombe."
            : "Discreet toast, light confetti and a short sound when a milestone lands."}
        </p>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={handlePreview}
            className="inline-flex items-center gap-2 rounded-[1.1rem] border border-[#cf3b34] bg-white px-8 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#bb362f] shadow-[0_10px_24px_rgba(197,31,31,0.08)] transition hover:-translate-y-0.5 hover:bg-[#fff7f5]"
          >
            <Play size={14} fill="currentColor" />
            {fr ? "Tester l'aperçu" : "Test preview"}
          </button>
        </div>
      </div>
    </section>
  );
}

function MethodologyBanner({ locale }: { locale: string }) {
  const fr = locale === "fr";
  return (
    <section className="rounded-[2rem] border border-[#f0d9d2] bg-[#fff7f5] px-5 py-5 shadow-[0_18px_40px_rgba(126,31,20,0.06)] lg:px-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#c51f1f] text-white shadow-[0_12px_26px_rgba(197,31,31,0.18)]">
          <ShieldCheck size={20} />
        </div>
        <div className="space-y-1">
          <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-[#c51f1f]">
            {fr ? "Algorithme d'impact vérifié" : "Verified impact algorithm"}
          </h3>
          <p className="max-w-4xl text-[14px] leading-7 text-[#6e5550]">
            {fr
              ? "La progression (XP) reflète uniquement des objectifs validés et des indicateurs d'impact explicites. Méthodologie transparente, fondée sur des données vérifiables."
              : "Progression (XP) reflects validated objectives only and explicit impact indicators. Transparent methodology grounded in verifiable data."}
          </p>
        </div>
      </div>
    </section>
  );
}

function OperationalStatusCard({ locale }: { locale: string }) {
  const fr = locale === "fr";
  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={Zap}
        title={fr ? "Statut opérationnel" : "Operational status"}
        subtitle={fr ? "Le moteur de progression reste en arrière-plan et s’active sur les données validées." : "The progression engine remains in the background and activates on validated data."}
      />

      <div className="mt-6 flex min-h-[19rem] flex-col items-center justify-center rounded-[1.75rem] border border-[#f1dfd8] bg-[#fff8f6] px-6 py-10 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#fff0ee] text-[#ea7d75] shadow-inner">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#f1c8c1] bg-white">
            <ShieldCheck size={30} strokeWidth={1.8} />
          </div>
        </div>
        <p className="mt-8 max-w-xs text-[24px] font-black leading-[1.12] tracking-[-0.04em] text-[#281614]">
          {fr ? "Moteur de progression hors ligne" : "Progression engine offline"}
        </p>
        <p className="mt-3 max-w-md text-[14px] leading-7 text-[#6f5a56]">
          {fr
            ? "Les services de progression sont en cours d'activation. Revenez bientôt."
            : "The progression services are still being activated. Check back soon."}
        </p>
      </div>
    </section>
  );
}

function ProfileSettingsCard({
  locale,
  displayMode,
  personalization,
  setDisplayMode,
  toggleTheme,
}: {
  locale: string;
  displayMode: string;
  personalization: ReturnType<typeof buildPersonalizationSnapshot>;
  setDisplayMode: (value: DisplayMode) => void;
  toggleTheme: () => void;
}) {
  const fr = locale === "fr";
  const rows = [
    {
      icon: Globe,
      label: fr ? "Langue" : "Language",
      value: personalization.localeLabel,
    },
    {
      icon: Moon,
      label: fr ? "Thème" : "Theme",
      value: personalization.themeLabel,
    },
    {
      icon: Settings2,
      label: fr ? "Mode d'affichage" : "Display mode",
      value: personalization.displayModeLabel,
      hint: personalization.displayModeHint,
    },
  ];

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={Settings2}
        title={fr ? "Réglages du profil" : "Profile settings"}
        subtitle={fr ? "Personnalisez votre expérience CleanMyMap." : "Personalize your CleanMyMap experience."}
      />

      <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-[#f1dfd8] bg-white">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={cn(
              "flex items-start justify-between gap-4 px-4 py-4",
              index < rows.length - 1 ? "border-b border-[#f4e5e0]" : "",
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0ee] text-[#c63b35]">
                <row.icon size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a65a52]">
                  {row.label}
                </p>
                <p className="mt-1 text-[14px] font-bold text-[#241411]">
                  {row.value}
                </p>
                {row.hint ? (
                  <p className="mt-1 text-[12px] leading-6 text-[#8a716b]">
                    {row.hint}
                  </p>
                ) : null}
              </div>
            </div>
            <ChevronRight size={16} className="mt-2 shrink-0 text-[#c8a9a1]" />
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setDisplayMode("exhaustif")}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-[1.2rem] border px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] transition",
            displayMode === "exhaustif"
              ? "border-[#cf3b34] bg-[#fff7f5] text-[#bb362f]"
              : "border-[#ead8d2] bg-white text-[#7a625d] hover:border-[#cf3b34] hover:text-[#bb362f]",
          )}
        >
          <Eye size={14} />
          {fr ? "Passer en affichage simplifié" : "Switch to simplified view"}
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center justify-center gap-2 rounded-[1.2rem] border border-[#ead8d2] bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#7a625d] transition hover:border-[#cf3b34] hover:text-[#bb362f]"
        >
          <Moon size={14} />
          {fr ? "Basculer en mode sombre" : "Switch to dark mode"}
        </button>
      </div>

      <div className="mt-4 rounded-[1.45rem] border border-[#f0d9d2] bg-[#fff8f6] px-4 py-3 text-[12px] leading-6 text-[#8a716b]">
        {fr
          ? "Charte premium complète active"
          : "Active, fully premium card"}
      </div>
    </section>
  );
}

function WhyGamification({
  locale,
}: {
  locale: string;
}) {
  const fr = locale === "fr";
  const items = [
    {
      icon: Eye,
      title: fr ? "Rendre visible ce qui compte" : "Make what matters visible",
      description: fr
        ? "Valoriser les contributions utiles et l'impact réel sur le terrain."
        : "Highlight useful contributions and real impact in the field.",
    },
    {
      icon: Users,
      title: fr ? "Encourager sans sur-compétition" : "Encourage without over-competition",
      description: fr
        ? "Une progression saine, coopérative et alignée avec l'intérêt collectif."
        : "A healthy, cooperative progression aligned with the collective good.",
    },
    {
      icon: TrendingUp,
      title: fr ? "Une communauté en progression" : "A community in progression",
      description: fr
        ? "Des repères clairs pour suivre l'évolution du commun."
        : "Clear markers to follow the evolution of the commons.",
    },
  ];

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={ShieldCheck}
        title={fr ? "Pourquoi cette gamification ?" : "Why this gamification?"}
        subtitle={fr ? "Une mécanique simple, lisible et utile." : "A simple, readable and useful mechanic."}
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.title}
            className="rounded-[1.65rem] border border-[#f1dfd8] bg-[#fff8f6] p-5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0ee] text-[#c51f1f]">
              <item.icon size={20} />
            </div>
            <h4 className="mt-4 max-w-[14ch] text-[18px] font-black leading-[1.1] tracking-[-0.03em] text-[#281614]">
              {item.title}
            </h4>
            <p className="mt-3 text-[14px] leading-7 text-[#6f5a56]">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function GamificationSection() {
  const { locale, theme, displayMode, setDisplayMode, toggleTheme } = useSitePreferences();
  const fr = locale === "fr";
  const [scope, setScope] = useState<"individual" | "collective">("individual");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: meData,
    isLoading: meLoading,
    error: meError,
  } = useSWR("gamification-me", () => fetchJson<MeResponse>("/api/gamification/me"));

  const progression = meData?.progression;
  const personalization = useMemo(
    () => buildPersonalizationSnapshot(locale, theme, displayMode),
    [locale, theme, displayMode],
  );

  return (
    <SectionShell
      id="gamification"
      hideHeader
      gradient="from-[#fff8f5] via-white to-transparent"
    >
      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#fffdfc_0%,#fff8f7_48%,#fffefc_100%)] text-[#241311]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_74%_12%,rgba(255,118,108,0.16)_0%,rgba(255,118,108,0.08)_18%,transparent_40%),radial-gradient(circle_at_82%_20%,rgba(197,31,31,0.10)_0%,transparent_24%),radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.95)_0%,transparent_55%)]" />
        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
          <HeroBlock fr={fr} />

          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <EngagementPanel
                progression={progression}
                loading={meLoading}
                error={meError}
                locale={locale}
              />
              <RecognitionPanel
                locale={locale}
                scope={scope}
                setScope={setScope}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <CollectionsPanel
                progression={progression}
                loading={meLoading}
                error={meError}
                locale={locale}
              />
              <CelebrationsPanel locale={locale} />
            </div>

            <MethodologyBanner locale={locale} />

            <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
              <OperationalStatusCard locale={locale} />
              <ProfileSettingsCard
                locale={locale}
                displayMode={displayMode}
                personalization={personalization}
                setDisplayMode={setDisplayMode}
                toggleTheme={toggleTheme}
              />
            </div>

            <WhyGamification locale={locale} />
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

export default GamificationSection;
