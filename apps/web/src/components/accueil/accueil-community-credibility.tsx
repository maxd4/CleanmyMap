"use client";

import { useRef } from "react";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Heart,
  Leaf,
  MapPin,
  UserPlus,
  Users,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { HomeCommunityActivitySummary } from "@/lib/accueil/data";
import { useGsapReveal } from "@/lib/animations/use-gsap-reveal";

type HomeCommunityCredibilityProps = {
  activity: HomeCommunityActivitySummary;
  errorMessage?: string | null;
};

const SECTION_TITLE_STYLE = {
  textWrap: "balance",
  fontSize: "clamp(2.05rem, 3vw, 3.35rem)",
  lineHeight: 0.94,
  letterSpacing: "-0.055em",
} as const;

const ACTION_TONE_STYLES: Record<
  HomeCommunityActivitySummary["items"][number]["tone"],
  string
> = {
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-sky-100 text-sky-800",
  cyan: "bg-cyan-100 text-cyan-800",
  emerald: "bg-emerald-100 text-emerald-800",
};

function ActionPreview({
  imageUrl,
  title,
}: {
  imageUrl: string | null;
  title: string;
}) {
  return (
    <div
      aria-label={imageUrl ? `Photo de ${title}` : "Aucune photo disponible"}
      className="h-20 w-24 shrink-0 overflow-hidden rounded-[1.05rem] border border-emerald-100/70 bg-white/80 sm:h-[5.5rem] sm:w-[7.6rem]"
      role={imageUrl ? "img" : undefined}
      style={
        imageUrl
          ? {
              backgroundImage: `url("${imageUrl}")`,
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
  return (
    <article
      data-gsap-reveal
      className="flex items-center gap-3 rounded-[1.25rem] border border-white/90 bg-white/80 px-3 py-3 shadow-[0_14px_26px_-24px_rgba(4,78,58,0.6)] transition-transform hover:-translate-y-0.5 sm:gap-4 sm:px-3.5"
    >
      <ActionPreview imageUrl={item.imageUrl} title={item.title} />
      <div className="min-w-0 flex-1 self-stretch py-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-[13px] font-black leading-tight text-[#082d35] sm:text-sm">
            {item.title}
          </h3>
          <time
            className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-[#476c76] sm:text-[11px]"
            dateTime={item.dateLabel}
          >
            {item.timeLabel}
          </time>
        </div>
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#315c67] sm:text-[13px]">
          {item.summary}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${ACTION_TONE_STYLES[item.tone]}`}
          >
            {item.location}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
            <CheckCircle2 size={12} />
            {item.statusLabel}
          </span>
        </div>
      </div>
    </article>
  );
}

export function HomeCommunityCredibility({
  activity,
  errorMessage,
}: HomeCommunityCredibilityProps) {
  const sectionRef = useRef<HTMLElement | null>(null);

  useGsapReveal(sectionRef, {
    selector: "[data-gsap-reveal]",
    start: "top 78%",
    stagger: 0.06,
    duration: 0.65,
    y: 20,
  });

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-transparent py-8 sm:py-10 lg:py-12"
    >
      <div className="mx-auto grid w-full max-w-[1800px] gap-5 px-3 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="flex min-w-0 flex-col rounded-[2.25rem] border border-white/75 bg-white/48 p-5 shadow-[0_28px_70px_-50px_rgba(7,95,71,0.55)] backdrop-blur-xl sm:p-7 lg:p-8 xl:p-9">
          <div data-gsap-reveal className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white/75 text-emerald-700 shadow-[0_16px_30px_-22px_rgba(6,95,70,0.55)]">
              <Users size={26} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-600">
                Communauté
              </p>
              <h2
                className="mt-2 max-w-[15ch] text-[#063840]"
                style={SECTION_TITLE_STYLE}
              >
                Une communauté vivante et engagée
              </h2>
            </div>
          </div>

          <p
            data-gsap-reveal
            className="mt-6 max-w-[38rem] text-[15px] leading-relaxed text-[#315c67] sm:text-base"
          >
            Chaque jour, des citoyens, des collectivités et des associations
            agissent concrètement sur le terrain avec CleanMyMap. Ensemble,
            nous rendons l&apos;impact environnemental visible et durable.
          </p>

          <div
            data-gsap-reveal
            className="mt-6 flex flex-col gap-4 rounded-[1.45rem] border border-emerald-100 bg-white/48 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Heart size={24} fill="currentColor" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.23em] text-[#315c67]">
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

          <div className="mt-7 flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#082d35]">
              Dernières actions vérifiées
            </p>
            <CmmButton
              href="/actions/history"
              tone="secondary"
              variant="pill"
              className="h-9 gap-2 px-3 text-[11px] font-black text-emerald-700"
            >
              Voir toutes les actions
              <ArrowRight size={14} />
            </CmmButton>
          </div>

          {errorMessage ? (
            <div
              data-gsap-reveal
              role="alert"
              className="mt-3 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              Les actions vérifiées sont momentanément indisponibles. {errorMessage}
            </div>
          ) : null}

          <div className="mt-3 space-y-2.5">
            {activity.items.length > 0 ? (
              activity.items.slice(0, 3).map((item) => (
                <CommunityActivityCard key={item.id} item={item} />
              ))
            ) : (
              <div
                data-gsap-reveal
                className="rounded-[1.25rem] border border-white/80 bg-white/75 px-4 py-5 text-sm text-[#315c67]"
              >
                Aucune action terrain récente vérifiée n&apos;est disponible pour
                le moment.
              </div>
            )}
          </div>

          <div data-gsap-reveal className="mt-7 grid gap-3 sm:grid-cols-2">
            <CmmButton
              href="/sections/rejoindre-un-formulaire"
              tone="secondary"
              variant="pill"
              className="h-12 gap-2 px-5 text-[13px] font-black"
            >
              Rejoindre une action
              <ArrowRight size={15} />
            </CmmButton>
            <CmmButton
              href="/actions/new"
              tone="primary"
              variant="pill"
              className="h-12 gap-2 px-5 text-[13px] font-black"
            >
              Déclarer une action
              <ArrowRight size={15} />
            </CmmButton>
          </div>
        </div>

        <div className="flex min-w-0 flex-col rounded-[2.25rem] border border-white/75 bg-white/48 p-5 shadow-[0_28px_70px_-50px_rgba(7,95,71,0.55)] backdrop-blur-xl sm:p-7 lg:p-8 xl:p-9">
          <div data-gsap-reveal className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white/75 text-emerald-700 shadow-[0_16px_30px_-22px_rgba(6,95,70,0.55)]">
              <Leaf size={26} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-600">
                Crédibilité
              </p>
              <h2
                className="mt-2 max-w-[14ch] text-[#063840]"
                style={SECTION_TITLE_STYLE}
              >
                Origine, terrain et crédibilité
              </h2>
            </div>
          </div>

          <p
            data-gsap-reveal
            className="mt-6 max-w-[40rem] text-[15px] leading-relaxed text-[#315c67] sm:text-base"
          >
            CleanMyMap est un projet étudiant construit autour d&apos;actions
            réelles, porté par une ambition partenariale progressive et une
            rigueur universitaire, pour des territoires plus sains.
          </p>

          <article
            data-gsap-reveal
            className="mt-6 rounded-[1.65rem] border border-emerald-100/10 bg-[linear-gradient(145deg,#078060_0%,#075d4a_100%)] p-5 text-white shadow-[0_24px_48px_-32px_rgba(4,76,54,0.85)] sm:p-6 lg:p-7"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-emerald-100">
                <GraduationCap size={23} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-100/90">
                  L&apos;histoire du projet
                </p>
                <h3 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
                  Une démarche d&apos;engagement concrète
                </h3>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-[14px] leading-relaxed text-white/90 sm:text-[15px]">
              <p>
                Né au sein du DU Engagement de Sorbonne Université,
                CleanMyMap transforme l&apos;engagement citoyen en un outil de
                pilotage concret pour le territoire.
              </p>
              <p>
                Notre objectif : structurer, cartographier et valoriser les
                actions de dépollution pour rendre leur impact local visible.
              </p>
            </div>
          </article>

          <article
            data-gsap-reveal
            className="mt-3 rounded-[1.65rem] border border-white/20 bg-[linear-gradient(135deg,#078060_0%,#08735d_43%,#7166d8_100%)] p-5 text-white shadow-[0_24px_52px_-30px_rgba(50,45,143,0.56)] sm:p-6 lg:p-7"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
                <Users size={23} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/85">
                  Des partenariats au service du territoire
                </p>
                <h3 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
                  Un écosystème en construction
                </h3>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-[14px] leading-relaxed text-white/90 sm:text-[15px]">
              <p>
                Des partenariats progressifs avec les associations locales, les
                collectivités et les acteurs publics franciliens.
              </p>
              <p>
                Le terrain nourrit la carte, le cadre universitaire renforce la
                méthode et les partenaires amplifient l&apos;impact.
              </p>
            </div>
          </article>

          <div data-gsap-reveal className="mt-6 grid gap-3 sm:grid-cols-2">
            <CmmButton
              href="/actions/map"
              tone="primary"
              variant="pill"
              className="h-12 gap-2 px-5 text-[13px] font-black"
            >
              <MapPin size={16} />
              Voir la carte
              <ArrowRight size={15} />
            </CmmButton>
            <CmmButton
              href="/sections/community?tab=partners"
              tone="secondary"
              variant="pill"
              className="h-12 gap-2 px-5 text-[13px] font-black"
            >
              Voir les partenaires
              <ArrowRight size={15} />
            </CmmButton>
          </div>
        </div>
      </div>
    </section>
  );
}
