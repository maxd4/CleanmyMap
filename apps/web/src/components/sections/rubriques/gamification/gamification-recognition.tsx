"use client";

import Link from "next/link";
import { BadgeCheck, ShieldCheck, Sparkles, Users } from "lucide-react";
import { LeaderboardPanel } from "@/components/gamification/leaderboard-panel";
import type { ContributorRecognitionCard } from "@/lib/gamification/progression-types";
import type { MeResponse } from "./gamification-types";
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

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel icon={Users} title={fr ? "Reconnaissance" : "Recognition"} subtitle={fr ? "Votre contribution vérifiée reste au premier plan ; la lecture communautaire est secondaire." : "Your verified contribution stays first; the community view is secondary."} />
      <PersonalRecognitionSection progression={progression} loading={loading} error={error} fr={fr} />
      <div className="mt-6 border-t border-[#f1dfd8] pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-black text-[#2c1a17]"><Sparkles size={16} className="text-[#c51f1f]" />{fr ? "Classement public" : "Public leaderboard"}</div>
          <Link href="/sections/leaderboard" className="rounded-full border border-[#cf3b34] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#a13f38] transition hover:bg-[#fff5f2]">
            {fr ? "Voir le classement public" : "View the public leaderboard"}
          </Link>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#806b65]">
          {fr ? "La progression personnelle et toutes les données privées Gamification restent protégées." : "Personal progression and all private Gamification data remain protected."}
        </p>
        <div className="mt-5">
          <LeaderboardPanel initialScope="user" />
        </div>
      </div>
    </section>
  );
}
