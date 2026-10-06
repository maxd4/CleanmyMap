import Link from "next/link";
import {
  ArrowRight,
  GraduationCap,
  Leaf,
  MapPin,
  MessageCircle,
  Users,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CREDIBILITY_PROOF_CARDS } from "./accueil-credibility-proof-cards";
import {
  CommunityCredibilityLandscape,
  COMMUNITY_CREDIBILITY_TITLE_STYLE,
} from "./accueil-community-credibility-visuals";

const ECOSYSTEM_STEPS = [
  { title: "Terrain", text: "Observations et actions" },
  { title: "Carte", text: "Données et visualisation" },
  { title: "Méthode", text: "Cadre universitaire et outils" },
  { title: "Territoire", text: "Partenaires et impact" },
] as const;

export function HomeCommunityCredibilityPanel() {
  return (
    <div className="relative isolate flex min-w-0 flex-col overflow-hidden rounded-[2.25rem] border border-white/85 bg-white/58 p-5 shadow-[0_28px_70px_-50px_rgba(7,95,71,0.42)] backdrop-blur-xl sm:p-7 lg:min-h-[760px] lg:p-7 xl:p-8">
      <CommunityCredibilityLandscape variant="credibility" />
      <div data-gsap-reveal className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white/75 text-emerald-700 shadow-[0_16px_30px_-22px_rgba(6,95,70,0.55)]">
          <Leaf size={26} />
        </div>
        <div className="min-w-0">
          <p className="cmm-text-caption font-black uppercase tracking-[0.28em] text-emerald-600">
            Crédibilité
          </p>
          <h2 className="relative mt-2 text-[#063840]" style={COMMUNITY_CREDIBILITY_TITLE_STYLE}>
            Origine, terrain et crédibilité
          </h2>
        </div>
      </div>

      <p
        data-gsap-reveal
        className="mt-7 max-w-[40rem] text-[15px] leading-relaxed text-[#315c67] sm:text-base"
      >
        CleanMyMap est un projet étudiant construit autour d&apos;actions
        réelles, porté par une ambition partenariale progressive et une
        rigueur universitaire, pour des territoires plus sains.
      </p>

      <article
        data-gsap-reveal
        data-credibility-combined-card
        className="mt-5 flex flex-col rounded-[1.65rem] border border-white/25 bg-[linear-gradient(135deg,#20b384_0%,#179f98_46%,#7569ec_100%)] p-4 text-white shadow-[0_24px_48px_-32px_rgba(4,76,54,0.48)] sm:p-5 lg:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-emerald-100">
            <GraduationCap size={23} />
          </div>
          <div className="min-w-0">
            <p className="cmm-text-caption font-black uppercase tracking-[0.25em] text-emerald-100/90">
              L&apos;histoire du projet
            </p>
            <h3 className="mt-2 text-[clamp(1.1rem,2.2vw,2.2rem)] font-black tracking-tight sm:whitespace-nowrap">
              Une démarche d&apos;engagement concrète
            </h3>
          </div>
        </div>
        <div className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-white/90 sm:text-[15px]">
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

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {CREDIBILITY_PROOF_CARDS.map(({ icon: Icon, title, text, href, external }) => {
            const cardClassName = "min-h-[6.75rem] rounded-[1.15rem] border border-white/30 bg-white/12 p-3.5 shadow-[0_16px_30px_-24px_rgba(4,76,54,0.55)] transition hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:p-4";
            const content = <><div className="flex items-center gap-2.5"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white"><Icon size={18} /></div><p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-white/90">{title}</p></div><p className="mt-2 whitespace-pre-line text-sm leading-snug text-white/95">{text}</p></>;
            if (!href) return <div key={title} className={cardClassName}>{content}</div>;
            return external ? <a key={title} href={href} target="_blank" rel="noreferrer" className={cardClassName}>{content}</a> : <Link key={title} href={href} className={cardClassName}>{content}</Link>;
          })}
        </div>

        <div className="mt-5 border-t border-white/25 pt-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
              <Users size={23} />
            </div>
            <div>
              <p className="cmm-text-caption font-black uppercase tracking-[0.22em] text-white/85">
                Des partenariats au service du territoire
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
                Un écosystème en construction
              </h3>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-white/90 sm:text-[15px]">
          <p>
            Des partenariats progressifs avec les associations locales, les
            collectivités et les acteurs publics franciliens.
          </p>
          <p>
            Le terrain nourrit la carte, le cadre universitaire renforce la
            méthode et les partenaires amplifient l&apos;impact.
          </p>
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4" role="list">
          {ECOSYSTEM_STEPS.map((step) => (
            <div
              key={step.title}
              data-credibility-ecosystem-step
              className="rounded-[1rem] border border-white/20 bg-white/10 px-3.5 py-3"
              role="listitem"
            >
              <p className="text-sm font-black tracking-tight text-white">
                {step.title}
              </p>
              <p className="mt-1 text-[13px] leading-snug text-white/90">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </article>

      <div
        data-gsap-reveal
        className="mt-5 grid gap-3 sm:grid-cols-2 lg:mt-5 lg:grid-cols-3"
      >
        <CmmButton
          href="/sections/messagerie"
          tone="important"
          variant="pill"
          className="h-12 w-full min-w-0 gap-2 px-5 text-[13px] font-black"
        >
          <MessageCircle size={16} />
          Discuter
          <ArrowRight size={15} />
        </CmmButton>
        <CmmButton
          href="/actions/map"
          tone="primary"
          variant="pill"
          className="h-12 w-full min-w-0 gap-2 px-5 text-[13px] font-black"
        >
          <MapPin size={16} />
          Voir la carte
          <ArrowRight size={15} />
        </CmmButton>
        <CmmButton
          href="/sections/community?tab=partners"
          tone="secondary"
          variant="pill"
          className="h-12 w-full min-w-0 gap-2 px-5 text-[13px] font-black"
        >
          Voir les partenaires
          <ArrowRight size={15} />
        </CmmButton>
      </div>
    </div>
  );
}
