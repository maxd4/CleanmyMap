"use client";

import { useRef } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
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
  fontWeight: 900,
} as const;

const CREDIBILITY_PROOF_CARDS = [
  {
    icon: GraduationCap,
    title: "Cadre universitaire",
    text: "DU Engagement\nSorbonne Université",
  },
  {
    icon: MapPin,
    title: "Ancrage terrain",
    text: "Actions réelles\net cartographiées",
  },
  {
    icon: FileText,
    title: "Traçabilité",
    text: "Projet open-source\nsur GitHub",
  },
] as const;

const ECOSYSTEM_STEPS = [
  { title: "Terrain", text: "Observations\net actions" },
  { title: "Carte", text: "Données\net visualisation" },
  { title: "Méthode", text: "Cadre universitaire\net outils" },
  { title: "Territoire", text: "Partenaires\net impact" },
] as const;

function SectionLandscape({
  variant,
}: {
  variant: "community" | "credibility";
}) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute right-[-1.5rem] top-[-1rem] h-48 w-64 opacity-60 sm:h-56 sm:w-80 ${
        variant === "credibility" ? "text-violet-200/80" : "text-emerald-200/90"
      }`}
      fill="none"
      focusable="false"
      viewBox="0 0 320 220"
    >
      <circle cx="258" cy="42" fill="currentColor" opacity="0.48" r="30" />
      <path
        d="M0 183c42-38 76-45 112-23 35 21 55-8 87-22 35-15 70-10 121 26v56H0v-37Z"
        fill="currentColor"
        opacity="0.32"
      />
      <path
        d="M26 182c32-47 67-49 102-8 25 29 47 28 70 5 24-24 48-30 76-15 18 10 31 17 46 20"
        stroke="currentColor"
        strokeDasharray="4 7"
        strokeLinecap="round"
        strokeWidth="2"
        opacity="0.72"
      />
      <path
        d="M245 145 262 98l17 47h-10v35h-14v-35h-10Zm35 35 16-42 16 42h-9v28h-14v-28h-9Z"
        fill="currentColor"
        opacity="0.58"
      />
      {variant === "credibility" ? (
        <path
          d="m188 82 16-10 16 10-16 10-16-10Zm5 7v14c7 5 15 5 22 0V89"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          opacity="0.7"
        />
      ) : (
        <path
          d="M165 94c20-16 43-5 46 17-22 9-38 2-46-17Zm14 7c-8 8-13 17-14 28"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          opacity="0.68"
        />
      )}
    </svg>
  );
}

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
  return (
    <article
      data-gsap-reveal
      className="flex items-start gap-3 rounded-[1.25rem] border border-white/90 bg-white/80 px-3 py-3 shadow-[0_14px_26px_-24px_rgba(4,78,58,0.45)] transition-transform hover:-translate-y-0.5 sm:gap-4 sm:px-3.5"
    >
      <ActionPreview image={item.image} />
      <div className="flex min-w-0 flex-1 items-start gap-3 self-stretch py-0.5">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[13px] font-black leading-tight text-[#082d35] sm:text-sm">
            {item.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#315c67] sm:text-[13px]">
            {item.summary}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="line-clamp-1 max-w-full rounded-full bg-[#e8f1f0] px-2.5 py-1 text-[10px] font-bold text-[#315c67]">
              {item.location}
            </span>
          </div>
        </div>
        <div className="flex w-[4.75rem] shrink-0 flex-col items-end justify-between gap-2 self-stretch">
          <time
            className="whitespace-nowrap text-[10px] font-semibold text-[#476c76] sm:text-[11px]"
            dateTime={item.dateLabel}
          >
            {item.timeLabel}
          </time>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">
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
      className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_15%_22%,rgba(255,255,255,0.72),transparent_28%),radial-gradient(circle_at_82%_64%,rgba(196,181,253,0.22),transparent_30%),linear-gradient(135deg,#d9faef_0%,#c4f4e2_48%,#e8f8f3_100%)] py-8 sm:py-10 lg:py-12"
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_88%,rgba(16,185,129,0.2),transparent_24%),radial-gradient(circle_at_74%_8%,rgba(129,140,248,0.16),transparent_20%)]" />
      <div className="relative mx-auto grid w-full max-w-[1800px] items-stretch gap-4 px-3 sm:px-6 lg:grid-cols-2 lg:gap-5 lg:px-8">
        <div className="relative isolate flex min-w-0 flex-col overflow-hidden rounded-[2.25rem] border border-white/85 bg-white/58 p-5 shadow-[0_28px_70px_-50px_rgba(7,95,71,0.42)] backdrop-blur-xl sm:p-7 lg:min-h-[760px] lg:p-7 xl:p-8">
          <SectionLandscape variant="community" />
          <div data-gsap-reveal className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white/75 text-emerald-700 shadow-[0_16px_30px_-22px_rgba(6,95,70,0.55)]">
              <Users size={26} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-600">
                Communauté
              </p>
              <h2
                className="relative mt-2 max-w-[14ch] text-[#063840]"
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
              tone="tertiary"
              variant="ghost"
              size="sm"
              className="h-auto min-h-0 gap-1 rounded-none px-0 py-1 text-[11px] font-black text-emerald-700 hover:bg-transparent hover:text-emerald-900"
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

        <div className="relative isolate flex min-w-0 flex-col overflow-hidden rounded-[2.25rem] border border-white/85 bg-white/58 p-5 shadow-[0_28px_70px_-50px_rgba(7,95,71,0.42)] backdrop-blur-xl sm:p-7 lg:min-h-[760px] lg:p-7 xl:p-8">
          <SectionLandscape variant="credibility" />
          <div data-gsap-reveal className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white/75 text-emerald-700 shadow-[0_16px_30px_-22px_rgba(6,95,70,0.55)]">
              <Leaf size={26} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-600">
                Crédibilité
              </p>
              <h2
                className="relative mt-2 whitespace-nowrap text-[#063840]"
                style={{
                  ...SECTION_TITLE_STYLE,
                  fontSize: "clamp(1.15rem, 2.8vw, 3.35rem)",
                  textWrap: "nowrap",
                }}
              >
                Origine, terrain et crédibilité
              </h2>
            </div>
          </div>

          <p
            data-gsap-reveal
            className="mt-6 max-w-[40rem] text-[15px] leading-relaxed text-[#315c67] sm:text-base lg:text-[14px]"
          >
            CleanMyMap est un projet étudiant construit autour d&apos;actions
            réelles, porté par une ambition partenariale progressive et une
            rigueur universitaire, pour des territoires plus sains.
          </p>

          <article
            data-gsap-reveal
            className="mt-6 flex flex-1 flex-col rounded-[1.65rem] border border-white/25 bg-[linear-gradient(135deg,#20b384_0%,#179f98_46%,#7569ec_100%)] p-5 text-white shadow-[0_24px_48px_-32px_rgba(4,76,54,0.48)] sm:p-6 lg:p-7"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-emerald-100">
                <GraduationCap size={23} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-100/90">
                  L&apos;histoire du projet
                </p>
                <h3 className="mt-2 whitespace-nowrap text-[clamp(1.1rem,2.2vw,2.2rem)] font-black tracking-tight">
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

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {CREDIBILITY_PROOF_CARDS.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.title}
                    className="min-h-[7.25rem] rounded-[1.15rem] border border-white/30 bg-white/12 p-3.5 shadow-[0_16px_30px_-24px_rgba(4,76,54,0.55)] sm:p-4"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                        <Icon size={18} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
                        {card.title}
                      </p>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-snug text-white/95">
                      {card.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>

          <article
            data-gsap-reveal
            className="mt-3 flex flex-1 flex-col rounded-[1.65rem] border border-white/25 bg-[linear-gradient(135deg,#1eaf82_0%,#1699a2_48%,#7569ec_100%)] p-5 text-white shadow-[0_24px_52px_-30px_rgba(50,45,143,0.34)] sm:p-6 lg:p-7"
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

            <div
              aria-label="Étapes de construction de l'écosystème"
              className="mt-6 w-full min-w-0 overflow-hidden rounded-[1.25rem] border border-white/30 bg-white/10 p-3"
              role="list"
            >
              <div className="flex w-full min-w-0 items-stretch">
                {ECOSYSTEM_STEPS.map((step, index) => (
                  <div key={step.title} className="flex min-w-0 flex-1 items-stretch">
                    <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-1.5 text-center sm:px-3">
                      <p className="text-[clamp(0.8rem,1.4vw,1rem)] font-black tracking-tight text-white">
                        {step.title}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-[clamp(0.7rem,1.2vw,0.875rem)] leading-snug text-white/90">
                        {step.text}
                      </p>
                    </div>
                    {index < ECOSYSTEM_STEPS.length - 1 ? (
                      <div className="flex shrink-0 items-center gap-1 text-white/80 sm:gap-2" aria-hidden="true">
                        <span className="h-12 w-px bg-white/35" />
                        <ArrowRight className="shrink-0" size={18} strokeWidth={1.8} />
                        <span className="h-12 w-px bg-white/35" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </article>

          <div data-gsap-reveal className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-6">
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
