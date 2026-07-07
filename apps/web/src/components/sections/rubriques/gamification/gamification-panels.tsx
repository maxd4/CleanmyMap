import { useCallback, useMemo } from "react";
import {
  BadgeCheck,
  ChevronRight,
  Eye,
  Flag,
  Globe,
  Moon,
  PartyPopper,
  Play,
  Radio,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { SectionLabel, EmptyStateCard } from "./gamification-shell";
import { cn } from "@/lib/utils";
import {
  buildQuizBalanceProgression,
  buildQuizTypeProgression,
} from "@/lib/gamification/badges/families";
import { announceGamificationGain } from "@/lib/gamification/announcements";
import { buildLightCelebrationPreview } from "./light-celebrations-panel";
import { buildPersonalizationSnapshot } from "./personalization-panel";
import { buildRoleStatusCards } from "./roles-status-panel";
import type { MeResponse } from "./gamification-types";
import type { DisplayMode } from "@/lib/ui/preferences";

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

export function EngagementPanel({
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
    currentRole.key === "observateur" &&
    (!progression.recognition.currentContributor || progression.recognition.currentContributor.verifiedContributions <= 0)
      ? fr
        ? "Découvrez le terrain et suivez la progression."
        : "Discover the terrain and follow the progression."
      : fr
        ? currentRole.descriptionFr
        : currentRole.descriptionEn;
  const contributionNote =
    progression.recognition.currentContributor?.verifiedContributions &&
    progression.recognition.currentContributor.verifiedContributions > 0
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
    currentRole.key === "observateur"
      ? Eye
      : currentRole.key === "contributeur"
        ? BadgeCheck
        : currentRole.key === "referent"
          ? Users
          : currentRole.key === "mentor"
            ? Sparkles
            : ShieldCheck;

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
        <div className="mt-5 grid gap-5 xl:grid-cols-4">
          {roleCards.slice(1).map((card, index) => (
            <article
              key={card.key}
              className="relative"
            >
              <div className="flex items-center gap-3 pb-4">
                <div className="h-px flex-1 border-t border-dashed border-[#eed8d2]" />
                <div className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[11px] font-black ring-8",
                  card.unlocked ? "bg-[#c51f1f] text-white ring-[#fff8f6]" : "border border-[#efcfc8] bg-white text-[#b34a41] ring-[#fff8f6]",
                )}>
                  {index + 1}
                </div>
                <div className="h-px flex-1 border-t border-dashed border-[#eed8d2]" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-[12px] font-black text-[#241614]">
                  {fr ? card.labelFr : card.labelEn}
                </p>
                <p className="text-[12px] leading-6 text-[#7a625d]">
                  {fr ? card.descriptionFr : card.descriptionEn}
                </p>
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

export function RecognitionPanel({
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
  const scopeLabel =
    scope === "individual"
      ? fr
        ? "Comptes"
        : "Accounts"
      : fr
        ? "Structures"
        : "Organizations";
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

      <div className="mt-6 flex min-h-[22rem] items-center rounded-[1.75rem] border border-[#f1dfd8] bg-[#fff8f6] px-5 py-10">
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

export function CollectionsPanel({
  loading,
  error,
  locale,
}: {
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

  if (error) {
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

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={BadgeCheck}
        title={fr ? "Badges et collections" : "Badges and collections"}
        subtitle={fr ? "Des distinctions lisibles et sobres, sans surcharge visuelle." : "Readable, restrained distinctions without visual overload."}
      />

      <div className="mt-6 flex min-h-[22rem] items-center rounded-[1.75rem] border border-[#f1dfd8] bg-[#fff8f6] p-6">
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

export function CelebrationsPanel({ locale }: { locale: string }) {
  const fr = locale === "fr";
  const preview = useMemo(() => buildLightCelebrationPreview(locale), [locale]);

  const handlePreview = useCallback(() => {
    announceGamificationGain(preview);
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

export function MethodologyBanner({ locale }: { locale: string }) {
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

export function QuizProgressionCard({ locale }: { locale: string }) {
  const fr = locale === "fr";
  const quizProgressions = [
    buildQuizTypeProgression(),
    buildQuizBalanceProgression(),
  ];

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <div className="flex items-start justify-between gap-4">
        <SectionLabel
          icon={Sparkles}
          title={fr ? "Progressions quiz" : "Quiz progressions"}
          subtitle={
            fr
              ? "Deux progressions quiz alimentent réellement l'XP: l'une suit la maîtrise par type, l'autre l'entraînement équilibré."
              : "Two quiz progressions now feed real XP: one tracks mastery by type, the other balanced training across all types."
          }
        />
        <span className="inline-flex items-center rounded-full border border-[#efb0a9] bg-[#fff1ef] px-3 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-[#bb362f]">
          {fr ? "Actif" : "Active"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {quizProgressions.map((progression) => (
          <article
            key={progression.id}
            className="rounded-[1.7rem] border border-[#f1dfd8] bg-[#fff8f6] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#c63b35]">
                  {fr ? "Progression active" : "Active progression"}
                </p>
                <p className="mt-1 text-[18px] font-black tracking-[-0.03em] text-[#241411]">
                  {progression.name}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-[#efb0a9] bg-white px-3 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-[#bb362f]">
                {fr ? "Actif" : "Active"}
              </span>
            </div>

            <p className="mt-3 text-[12px] leading-6 text-[#7a625d]">
              {progression.description}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {progression.tiers.map((tier, index) => (
                <article
                  key={tier.id}
                  className="rounded-[1.35rem] border border-[#f1dfd8] bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#efc7c1] bg-[#fff8f6] text-[16px]">
                      {tier.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#c63b35]">
                        {fr ? `Palier ${index + 1}` : `Tier ${index + 1}`}
                      </p>
                      <p className="mt-1 text-[13px] font-bold text-[#241411]">
                        {tier.label}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-[#7a625d]">
                    {tier.description}
                  </p>
                </article>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-[1.45rem] border border-[#f0d9d2] bg-[#fff7f5] px-4 py-3 text-[12px] leading-6 text-[#8a716b]">
        {fr
          ? "Ces progressions comptent pour l'XP et restent visibles pour suivre le cap de maîtrise."
          : "These progressions count toward XP and stay visible to track mastery milestones."}
      </div>
    </section>
  );
}

export function OperationalStatusCard({ locale }: { locale: string }) {
  const fr = locale === "fr";
  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={Radio}
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

export function ProfileSettingsCard({
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

export function WhyGamification({
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
