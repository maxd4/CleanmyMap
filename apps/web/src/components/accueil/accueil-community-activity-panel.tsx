import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Cigarette,
  FileText,
  Heart,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { HomeCommunityActivitySummary } from "@/lib/accueil/data";
import {
  HOMEPAGE_ACTIVITY_UNAVAILABLE_MESSAGE,
} from "./accueil-community-credibility.activity";
import {
  CommunityCredibilityLandscape,
  COMMUNITY_CREDIBILITY_TITLE_STYLE,
} from "./accueil-community-credibility-visuals";

const COMMUNITY_ACTION_SLOTS = 3;

function ActionPreview({
  image,
}: {
  image: HomeCommunityActivitySummary["items"][number]["image"];
}) {
  const hasImage = image.url !== null;

  return (
    <div
      aria-label={hasImage ? image.alt : "Aucune image disponible"}
      className="h-20 w-24 shrink-0 overflow-hidden rounded-[1.05rem] border border-emerald-100/70 bg-white/80 sm:h-[5.25rem] sm:w-[8.5rem]"
      role={hasImage ? "img" : undefined}
      style={
        hasImage
          ? {
              backgroundImage: `url("${image.url}")`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    />
  );
}

function CommunityActivityCard({
  item,
}: {
  item: HomeCommunityActivitySummary["items"][number];
}) {
  const hasImpactMetrics =
    item.cigaretteButts !== null || item.wasteKg !== null;

  return (
    <Link
      href={`/actions/map?actionId=${encodeURIComponent(item.id)}`}
      prefetch={false}
      data-gsap-reveal
      data-home-community-action-card
      aria-label={`Voir l'action ${item.title}`}
      className="group block rounded-[1.25rem] border border-white/90 bg-white/80 px-3 py-3.5 shadow-[0_14px_26px_-24px_rgba(4,78,58,0.45)] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-50 sm:px-4 sm:py-4"
    >
      <article className="flex items-start gap-3 sm:gap-4">
        <ActionPreview image={item.image} />
        <div className="flex min-w-0 flex-1 items-start gap-3 self-stretch py-0.5">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-[13px] font-black leading-tight text-[#082d35] sm:text-sm">
              {item.title}
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 cmm-text-caption leading-snug text-[#315c67]">
              {item.cigaretteButts !== null ? (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Cigarette size={13} aria-hidden="true" />
                  <span>{item.cigaretteButts.toLocaleString("fr-FR")} mégots</span>
                </span>
              ) : null}
              {item.wasteKg !== null ? (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Trash2 size={13} aria-hidden="true" />
                  <span>
                    {item.wasteKg.toLocaleString("fr-FR", {
                      maximumFractionDigits: 1,
                    })} kg de déchets
                  </span>
                </span>
              ) : null}
              {!hasImpactMetrics ? item.summary : null}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="max-w-full break-words rounded-full bg-[#e8f1f0] px-2.5 py-1 cmm-text-caption font-bold text-[#315c67]">
                {item.location}
              </span>
            </div>
          </div>
          <div className="flex w-[4.75rem] shrink-0 flex-col items-end justify-between gap-2 self-stretch">
            <time
              className="whitespace-nowrap cmm-text-caption font-semibold text-[#476c76]"
              dateTime={item.dateLabel}
            >
              {item.timeLabel}
            </time>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 cmm-text-caption font-bold text-emerald-800">
              <CheckCircle2 size={12} />
              {item.statusLabel}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function CommunityActivityPlaceholder() {
  return (
    <article
      data-gsap-reveal
      data-home-community-action-card
      data-home-community-action-placeholder
      aria-label="Aucune action récente disponible"
      className="flex min-h-[7.25rem] items-start gap-3 rounded-[1.25rem] border border-white/80 bg-white/55 px-3 py-3 text-[#476c76] shadow-[0_14px_26px_-24px_rgba(4,78,58,0.3)] sm:gap-4 sm:px-4"
    >
      <ActionPreview
        image={{ source: "none", url: null, alt: "", isFallback: false }}
      />
      <div className="flex min-w-0 flex-1 items-center self-stretch">
        <div className="space-y-2">
          <p className="text-[13px] font-black leading-tight sm:text-sm">
            Aucune action récente disponible
          </p>
          <p className="cmm-text-caption leading-snug">
            Cet emplacement reste réservé à une action vérifiée.
          </p>
        </div>
      </div>
    </article>
  );
}

export function HomeCommunityActivityPanel({
  activity,
  hasActivityError,
}: {
  activity: HomeCommunityActivitySummary;
  hasActivityError: boolean;
}) {
  return (
    <div className="relative isolate flex min-w-0 flex-col overflow-hidden rounded-[2.25rem] border border-white/85 bg-white/58 p-5 shadow-[0_28px_70px_-50px_rgba(7,95,71,0.42)] backdrop-blur-xl sm:p-7 lg:min-h-[760px] lg:p-7 xl:p-8">
      <CommunityCredibilityLandscape variant="community" />
      <div data-gsap-reveal className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white/75 text-emerald-700 shadow-[0_16px_30px_-22px_rgba(6,95,70,0.55)]">
          <Users size={26} />
        </div>
        <div className="min-w-0">
          <p className="cmm-text-caption font-black uppercase tracking-[0.28em] text-emerald-600">
            Communauté
          </p>
          <h2
            className="relative mt-2 text-[#063840]"
            style={COMMUNITY_CREDIBILITY_TITLE_STYLE}
          >
            Une communauté vivante et engagée
          </h2>
        </div>
      </div>

      <p
        data-gsap-reveal
        className="mt-7 max-w-[38rem] text-[15px] leading-relaxed text-[#315c67] sm:text-base"
      >
        Chaque jour, des citoyens, des collectivités et des associations
        agissent concrètement sur le terrain avec CleanMyMap. Ensemble,
        nous rendons l&apos;impact environnemental visible et durable.
      </p>

      <div
        data-gsap-reveal
        className="mt-7 flex flex-col gap-4 rounded-[1.45rem] border border-emerald-100 bg-white/48 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Heart size={24} fill="currentColor" />
          </div>
          <div>
                <p className="cmm-text-caption font-black uppercase tracking-[0.23em] text-[#315c67]">
              Soutenir CleanMyMap
            </p>
            <p className="mt-1 text-base font-black text-[#082d35]">
              Invitez un ami à nous rejoindre
            </p>
            <p className="mt-0.5 text-sm text-[#476c76]">
              Plus nous sommes nombreux, plus notre impact est réel.
            </p>
          </div>
        </div>
        <CmmButton
          href="/profil#parrainage"
          tone="secondary"
          variant="pill"
          className="h-11 shrink-0 gap-2 px-5 text-[12px] font-black"
        >
          <UserPlus size={16} />
          Inviter un ami
          <ArrowRight size={14} />
        </CmmButton>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <p className="cmm-text-caption font-black uppercase tracking-[0.25em] text-[#082d35]">
          Dernières actions vérifiées
        </p>
        <CmmButton
          href="/actions/history"
          tone="tertiary"
          variant="ghost"
          size="sm"
              className="h-auto min-h-0 gap-1 rounded-none px-0 py-1 cmm-text-caption font-black text-emerald-700 hover:bg-transparent hover:text-emerald-900"
        >
          Voir toutes les actions
          <ArrowRight size={14} />
        </CmmButton>
      </div>

      {hasActivityError ? (
        <div
          data-gsap-reveal
          role="alert"
          className="mt-3 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          {HOMEPAGE_ACTIVITY_UNAVAILABLE_MESSAGE}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {Array.from({ length: COMMUNITY_ACTION_SLOTS }, (_, index) => {
          const item = activity.items[index];

          return item ? (
            <CommunityActivityCard key={item.id} item={item} />
          ) : (
            <CommunityActivityPlaceholder key={`placeholder-${index}`} />
          );
        })}
      </div>

      <div
        data-gsap-reveal
        className="mt-8 grid gap-3 lg:grid-cols-3"
      >
        <CmmButton
          href="/reports"
          tone="critical"
          variant="pill"
          className="h-12 w-full min-w-0 gap-2 px-5 text-[13px] font-black"
        >
          <FileText size={16} />
          Générer un rapport d&apos;impact
          <ArrowRight size={15} />
        </CmmButton>
        <CmmButton
          href="/actions/new"
          tone="primary"
          variant="pill"
          className="h-12 w-full min-w-0 gap-2 px-5 text-[13px] font-black"
        >
          Créer une action
          <ArrowRight size={15} />
        </CmmButton>
        <CmmButton
          href="/sections/rejoindre-une-action"
          tone="secondary"
          variant="pill"
          className="h-12 w-full min-w-0 gap-2 px-5 text-[13px] font-black"
        >
          Rejoindre une action
          <ArrowRight size={15} />
        </CmmButton>
      </div>
    </div>
  );
}
