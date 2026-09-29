"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { BadgeCheck, CalendarRange, Search, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import type { ContributorRecognitionCard } from "@/lib/gamification/progression-types";
import { swrRecentViewOptions } from "@/lib/swr-config";
import {
  buildLeaderboardKey,
  fetchGamificationLeaderboard,
  filterLeaderboardItems,
  type LeaderboardPeriod,
  type LeaderboardScope,
  type LeaderboardMetric,
  type PublicIndividualLeaderboardItem,
  type PublicLeaderboardItem,
} from "./gamification-leaderboard";
import type { MeResponse } from "./gamification-types";
import { cn } from "@/lib/utils";
import { SectionLabel } from "./gamification-shell";

function RecognitionCard({
  card,
  label,
  fr,
}: {
  card: ContributorRecognitionCard;
  label: string;
  fr: boolean;
}) {
  return (
    <article className="rounded-[1.55rem] border border-[#f1dfd8] bg-[#fffaf8] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#c51f1f]">{label}</p>
          <h4 className="mt-2 text-lg font-black tracking-[-0.03em] text-[#2c1a17]">{card.actorName}</h4>
          <p className="mt-1 text-xs text-[#806b65]">{card.associationName}</p>
        </div>
        <BadgeCheck className="shrink-0 text-[#c51f1f]" size={20} />
      </div>

      <p className="mt-4 text-sm leading-6 text-[#604b46]">{card.thanksMessage}</p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-[#ead8d2] bg-white p-3">
          <p className="font-black uppercase tracking-[0.15em] text-[#a48d86]">{fr ? "Contribution" : "Contribution"}</p>
          <p className="mt-1 font-bold text-[#2c1a17]">{card.verifiedContributions} {fr ? "vérifiée(s)" : "verified"}</p>
        </div>
        <div className="rounded-xl border border-[#ead8d2] bg-white p-3">
          <p className="font-black uppercase tracking-[0.15em] text-[#a48d86]">{fr ? "Zone principale" : "Main area"}</p>
          <p className="mt-1 font-bold text-[#2c1a17]">{card.topZone}</p>
        </div>
        <div className="rounded-xl border border-[#ead8d2] bg-white p-3">
          <p className="font-black uppercase tracking-[0.15em] text-[#a48d86]">{fr ? "Régularité" : "Regularity"}</p>
          <p className="mt-1 font-bold text-[#2c1a17]">{card.regularityLabel}</p>
        </div>
        <div className="rounded-xl border border-[#ead8d2] bg-white p-3">
          <p className="font-black uppercase tracking-[0.15em] text-[#a48d86]">{fr ? "Repère" : "Signal"}</p>
          <p className="mt-1 font-bold text-[#2c1a17]">{card.mentorEligible ? (fr ? "Éligible mentor" : "Mentor eligible") : card.contributionType}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {card.badges.map((badge) => (
          <span key={badge} className="rounded-full border border-[#efc7c1] bg-white px-2.5 py-1 text-xs font-bold text-[#a13f38]">
            {badge}
          </span>
        ))}
      </div>
      {card.mentorEligible ? (
        <p className="mt-3 text-xs leading-5 text-[#806b65]">
          {fr ? "Cette éligibilité est une reconnaissance de parcours ; elle ne crée pas de rôle d'accès." : "This eligibility recognizes a journey; it does not create an access role."}
        </p>
      ) : null}
    </article>
  );
}

export function buildPersonalRecognitionCards(
  progression: MeResponse["progression"] | undefined,
  fr: boolean,
): Array<{ label: string; card: ContributorRecognitionCard }> {
  return [
    progression?.recognition.currentContributor
      ? { label: fr ? "Depuis toujours" : "Since the beginning", card: progression.recognition.currentContributor }
      : null,
    progression?.annualRecognition.currentContributor
      ? { label: fr ? "Année en cours" : "Current year", card: progression.annualRecognition.currentContributor }
      : null,
  ].filter((entry): entry is { label: string; card: ContributorRecognitionCard } => Boolean(entry));
}

function LeaderboardItemCard({
  item,
  scope,
  fr,
}: {
  item: PublicLeaderboardItem;
  scope: LeaderboardScope;
  fr: boolean;
}) {
  if (scope === "individual") {
    const individual = item as PublicIndividualLeaderboardItem;
    return (
      <article className="rounded-[1.35rem] border border-[#f1dfd8] bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a48d86]">{fr ? "Rang" : "Rank"} {individual.rank}</p>
            <h4 className="mt-1 text-base font-black text-[#2c1a17]">{individual.publicLabel}</h4>
          </div>
          <span className="rounded-full border border-[#efc7c1] bg-[#fff5f2] px-2.5 py-1 text-xs font-black text-[#a13f38]">Niveau {individual.level}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#806b65]">
          <span className="rounded-full bg-[#fffaf8] px-2.5 py-1">{individual.xpValidated} XP</span>
          <span className="rounded-full bg-[#fffaf8] px-2.5 py-1">{individual.badgeTotal} {fr ? "badges" : "badges"}</span>
        </div>
      </article>
    );
  }

  const collective = item as Extract<PublicLeaderboardItem, { members: number }>;
  return (
    <article className="rounded-[1.35rem] border border-[#f1dfd8] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a48d86]">{fr ? "Rang" : "Rank"} {collective.rank}</p>
          <h4 className="mt-1 text-base font-black text-[#2c1a17]">{collective.associationName}</h4>
        </div>
        <span className="rounded-full border border-[#efc7c1] bg-[#fff5f2] px-2.5 py-1 text-xs font-black text-[#a13f38]">Niveau {collective.currentLevel}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#806b65]">
        <span className="rounded-full bg-[#fffaf8] px-2.5 py-1">{collective.members} {fr ? "membre(s)" : "members"}</span>
        <span className="rounded-full bg-[#fffaf8] px-2.5 py-1">{collective.validatedActions} {fr ? "actions vérifiées" : "verified actions"}</span>
        <span className="rounded-full bg-[#fffaf8] px-2.5 py-1">{collective.qualityAverage} % {fr ? "qualité" : "quality"}</span>
      </div>
    </article>
  );
}

function PersonalRecognitionSection({
  progression,
  loading,
  error,
  fr,
}: {
  progression: MeResponse["progression"] | undefined;
  loading: boolean;
  error: unknown;
  fr: boolean;
}) {
  const personalCards = buildPersonalRecognitionCards(progression, fr);
  if (loading) {
    return (
      <div className="mt-6 animate-pulse space-y-4" aria-label={fr ? "Chargement de la reconnaissance" : "Loading recognition"}>
        <div className="h-6 w-64 rounded-full bg-[#f5e7e2]" />
        <div className="h-40 rounded-[1.55rem] bg-[#fff8f6]" />
      </div>
    );
  }
  if (error) {
    return <p role="alert" className="mt-6 rounded-[1.35rem] border border-[#f1c1b7] bg-[#fff5f2] p-5 text-sm leading-6 text-[#8c3f38]">{fr ? "La reconnaissance personnelle n'est pas disponible pour le moment." : "Personal recognition is not available right now."}</p>;
  }
  if (personalCards.length > 0) {
    return <div className="mt-6 space-y-3">{personalCards.map(({ label, card }) => <RecognitionCard key={label} label={label} card={card} fr={fr} />)}</div>;
  }
  return (
    <div className="mt-6 rounded-[1.55rem] border border-dashed border-[#ead8d2] bg-[#fffaf8] p-6 text-center">
      <ShieldCheck className="mx-auto text-[#cf3b34]" size={24} />
      <p className="mt-3 text-sm font-bold text-[#2c1a17]">{fr ? "Aucune reconnaissance vérifiée pour le moment." : "No verified recognition yet."}</p>
      <p className="mt-2 text-sm leading-6 text-[#806b65]">{fr ? "Une contribution validée fera apparaître ici sa preuve et son contexte." : "A validated contribution will appear here with its proof and context."}</p>
    </div>
  );
}

function LeaderboardResults({
  loading,
  error,
  items,
  scope,
  searchQuery,
  fr,
}: {
  loading: boolean;
  error: unknown;
  items: PublicLeaderboardItem[];
  scope: LeaderboardScope;
  searchQuery: string;
  fr: boolean;
}) {
  if (loading) {
    return <div className="animate-pulse space-y-3" aria-label={fr ? "Chargement du classement" : "Loading ranking"}><div className="h-20 rounded-[1.35rem] bg-[#fff8f6]" /><div className="h-20 rounded-[1.35rem] bg-[#fff8f6]" /></div>;
  }
  if (error) {
    return <p role="alert" className="rounded-[1.35rem] border border-[#f1c1b7] bg-[#fff5f2] p-5 text-sm text-[#8c3f38]">{fr ? "Le classement détaillé est indisponible pour ce scope." : "The detailed ranking is unavailable for this scope."}</p>;
  }
  if (items.length > 0) {
    return <div className="grid gap-3 lg:grid-cols-2">{items.map((item) => <LeaderboardItemCard key={`${scope}-${item.rank}-${scope === "individual" ? (item as PublicIndividualLeaderboardItem).publicLabel : (item as Extract<PublicLeaderboardItem, { members: number }>).associationName}`} item={item} scope={scope} fr={fr} />)}</div>;
  }
  return <p className="rounded-[1.35rem] border border-dashed border-[#ead8d2] bg-[#fffaf8] p-5 text-sm text-[#806b65]">{searchQuery.trim() ? (fr ? "Aucune correspondance dans les résultats chargés." : "No match in the loaded results.") : (fr ? "Aucune contribution mise en lumière pour ce scope." : "No highlighted contribution for this scope.")}</p>;
}

function LeaderboardDetails({ fr }: { fr: boolean }) {
  const [scope, setScope] = useState<LeaderboardScope>("individual");
  const [period, setPeriod] = useState<LeaderboardPeriod>("lifetime");
  const [metric, setMetric] = useState<LeaderboardMetric>("level");
  const [searchQuery, setSearchQuery] = useState("");
  const leaderboard = useSWR(buildLeaderboardKey(true, scope, period, metric), fetchGamificationLeaderboard, swrRecentViewOptions);
  const filteredItems = useMemo(() => filterLeaderboardItems(leaderboard.data?.items ?? [], scope, searchQuery), [leaderboard.data?.items, scope, searchQuery]);

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap gap-2">
        {/* The historical collective scope remains API COMPATIBILITY only. */}
        {["individual" as const].map((value) => <button key={value} type="button" onClick={() => setScope(value)} className={cn("rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.16em]", scope === value ? "border-[#c51f1f] bg-[#c51f1f] text-white" : "border-[#ead8d2] bg-white text-[#806b65]")}>{fr ? "Individuel" : "Individual"}</button>)}
        {(["lifetime", "yearToDate"] as const).map((value) => <button key={value} type="button" onClick={() => setPeriod(value)} className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.16em]", period === value ? "border-[#c51f1f] bg-[#fff5f2] text-[#a13f38]" : "border-[#ead8d2] bg-white text-[#806b65]")}><CalendarRange size={12} />{value === "lifetime" ? (fr ? "Depuis toujours" : "Lifetime") : (fr ? "Année en cours" : "Year to date")}</button>)}
        {scope === "individual" ? (["level", "xp", "badges"] as const).map((value) => <button key={value} type="button" onClick={() => setMetric(value)} className={cn("rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.16em]", metric === value ? "border-[#c51f1f] bg-[#fff5f2] text-[#a13f38]" : "border-[#ead8d2] bg-white text-[#806b65]")}>{value === "level" ? (fr ? "Niveau" : "Level") : value === "xp" ? "XP" : (fr ? "Badges" : "Badges")}</button>) : null}
      </div>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a58c86]" aria-hidden="true" />
        <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={scope === "individual" ? (fr ? "Filtrer un nom ou une structure" : "Filter a name or organization") : (fr ? "Filtrer une structure" : "Filter an organization")} className="w-full rounded-[1.15rem] border border-[#eadad4] bg-white py-3 pl-11 pr-11 text-sm text-[#281614] placeholder:text-[#a58c86] focus:border-[#dd5a52] focus:outline-none focus:ring-4 focus:ring-[#f7d4cf]" />
        {searchQuery ? <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#af625a]" aria-label={fr ? "Effacer la recherche" : "Clear search"}><X size={14} /></button> : null}
      </div>
      <p className="text-xs font-semibold text-[#806b65]">{fr ? "Scope : " : "Scope: "}{scope === "individual" ? (fr ? "individuel" : "individual") : (fr ? "collectif" : "collective")} · {period === "lifetime" ? (fr ? "depuis toujours" : "lifetime") : (fr ? "année en cours" : "year to date")}</p>
      <LeaderboardResults loading={leaderboard.isLoading} error={leaderboard.error} items={filteredItems} scope={scope} searchQuery={searchQuery} fr={fr} />
    </div>
  );
}

export function RecognitionPanel({
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
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel icon={Users} title={fr ? "Reconnaissance" : "Recognition"} subtitle={fr ? "Votre contribution vérifiée reste au premier plan ; la lecture communautaire est secondaire." : "Your verified contribution stays first; the community view is secondary."} />
      <PersonalRecognitionSection progression={progression} loading={loading} error={error} fr={fr} />
      <div className="mt-6 border-t border-[#f1dfd8] pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-black text-[#2c1a17]"><Sparkles size={16} className="text-[#c51f1f]" />{fr ? "Contributions mises en lumière" : "Highlighted contributions"}</div>
          {!showLeaderboard ? <button type="button" onClick={() => setShowLeaderboard(true)} className="rounded-full border border-[#cf3b34] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#a13f38] transition hover:bg-[#fff5f2]">{fr ? "Voir le classement détaillé" : "View detailed ranking"}</button> : null}
        </div>
        {showLeaderboard ? <LeaderboardDetails fr={fr} /> : null}
      </div>
    </section>
  );
}
