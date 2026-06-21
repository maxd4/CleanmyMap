"use client";

import type { ReactNode } from "react";
import {
  Beaker,
  BookOpen,
  Brain,
  ExternalLink,
  Info,
  Layers,
  MapPin,
  Palette,
  Heart,
  Scaling,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { useTranslation } from "@/lib/i18n/use-translation";
import { NationalStatsSection } from "@/components/sections/rubriques/national-stats-section";
import { TerritoryMapComparisonCards } from "@/components/maps/territory-map-comparison-cards";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type {
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactSnapshotRecord,
} from "@/lib/environmental-impact-estimator/types";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import { FreePlanServicesMethodologyVisual } from "./free-plan-services-methodology-visual";
import { MonthlyImpactHistoryChart } from "./monthly-impact-history-chart";

type MethodologyColor = "red" | "slate";

type MethodologyCardProps = {
  title: string;
  formula: string;
  description: string;
  source: string;
  color: MethodologyColor;
  icon: ReactNode;
};

type OpenSourceDoc = {
  id: string;
  title: { fr: string; en: string };
  desc: { fr: string; en: string };
  href: string;
  icon: ReactNode;
  isPdf: boolean;
  secondaryAction?: {
    href: string;
    label: { fr: string; en: string };
  };
};

type MethodologiePageClientProps = {
  freePlanServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  impactTotals: {
    monthlyKgCo2eProxy: number | null;
    annualKgCo2eProxy: number | null;
    totalKgCo2eProxy: number | null;
    generatedAt: string | null;
  };
  impactSnapshots: EnvironmentalImpactSnapshotRecord[];
  impactGeneratedAt: string | null;
  impactLaunchedAt: string | null;
  githubStats: GitHubRepositoryStats | null;
};

function MethodologyCard({
  title,
  formula,
  description,
  source,
  color,
  icon,
}: MethodologyCardProps) {
  const colorClasses: Record<
    MethodologyColor,
    { text: string; border: string; surface: string; dot: string }
  > = {
    red: {
      text: "text-red-400",
      border: "border-red-400/20",
      surface: "bg-red-400/5",
      dot: "bg-red-400",
    },
    slate: {
      text: "text-slate-400",
      border: "border-slate-400/20",
      surface: "bg-slate-400/5",
      dot: "bg-slate-400",
    },
  };

  const tone = colorClasses[color];

  return (
    <div className="group relative overflow-hidden rounded-[3rem] border border-white/5 bg-white/5 p-10 space-y-8 transition-all duration-700 hover:border-white/10 hover:bg-white/[0.07]">
      <div className={cn("relative z-10 flex items-center gap-5", tone.text)}>
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-transform duration-700 group-hover:scale-110",
            tone.surface,
          )}
        >
          {icon}
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white">
          {title}
        </h2>
      </div>

      <div
        className={cn(
          "relative z-10 rounded-[2rem] border-l-4 bg-black/20 p-8 font-mono text-sm shadow-inner",
          tone.border,
        )}
      >
        <div className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
          Équation Scientifique
        </div>
        <div className="text-red-100/80 leading-relaxed">{formula}</div>
      </div>

      <p className="relative z-10 leading-relaxed text-red-100/40 font-medium">
        {description}
      </p>

      <div className="relative z-10 flex items-center gap-3 pt-6">
        <div className={cn("h-2 w-2 rounded-full", tone.dot)} />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
          Source : {source}
        </span>
      </div>
    </div>
  );
}

function ReferenceDocCard({
  doc,
  schemaLabel,
  schemaHref,
  isFrench,
}: {
  doc: OpenSourceDoc;
  schemaLabel: { fr: string; en: string };
  schemaHref: string;
  isFrench: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/5 p-8 transition-all duration-500 hover:scale-[1.01]">
      <div className="mb-6 flex items-start gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-red-400 shadow-inner">
          {doc.icon}
        </div>
        <div>
          <h3 className="mb-2 text-xl font-bold text-white">{doc.title[isFrench ? "fr" : "en"]}</h3>
          <p className="text-xs font-medium leading-relaxed text-red-100/50">{doc.desc[isFrench ? "fr" : "en"]}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/75">
          {schemaLabel[isFrench ? "fr" : "en"]}
        </span>
        {doc.isPdf ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/60">
            PDF
          </span>
        ) : null}
      </div>
      <a
        href={doc.href}
        className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-red-500 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-red-400"
      >
        <ExternalLink size={14} />
        {isFrench ? "Consulter le fichier" : "Open file"}
      </a>
      <a
        href={schemaHref}
        className="mt-3 inline-flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/80 shadow-lg transition-all hover:border-white/20 hover:bg-white/10"
      >
        <ExternalLink size={14} />
        {isFrench ? "Voir le schéma" : "View schema"}
      </a>
    </div>
  );
}

const OPEN_SOURCE_DOCS: OpenSourceDoc[] = [
  {
    id: "impact",
    title: {
      fr: "Audit d'Impact & Modèle de Calcul",
      en: "Impact Audit & Calculation Model",
    },
    desc: {
      fr: "Découvrez en détail chaque étape de notre audit d’impact : des formules précises, les facteurs d’émission reconnus d’ADEME et du GIEC, ainsi qu’une explication claire de notre algorithme proxy linéaire, afin que vous compreniez comment chaque score est calculé et puissiez l’interpréter vous‑même.",
      en: "Explore the complete impact‑audit process, including precise equations, reputable ADEME and IPCC emission factors, and a clear breakdown of our linear proxy algorithm, empowering you to understand exactly how each impact score is derived and interpret the results confidently.",
    },
    href: "/docs/plans/rapport_impact/impact_IA.md",
    icon: <Scaling className="h-6 w-6" />,
    isPdf: false,
  },
  {
    id: "master-arch",
    title: {
      fr: "Architecture Système Complète",
      en: "Complete System Architecture",
    },
    desc: {
      fr: "Plongez dans l’architecture complète du projet : diagrammes détaillés des flux de données, description des services gérés, stratégie de découpage du monorepo, ainsi que les choix technologiques clés, pour vous permettre de comprendre et contribuer efficacement au code.",
      en: "Dive into the full project architecture: detailed data‑flow diagrams, managed service descriptions, monorepo split strategy, and key technology choices, enabling you to grasp and contribute to the codebase effectively.",
    },
    href: "/docs/architecture/master-architecture.md",
    icon: <Layers className="h-6 w-6" />,
    isPdf: false,
  },
  {
    id: "scientific-protocol",
    title: {
      fr: "Protocole Scientifique",
      en: "Scientific Protocol",
    },
    desc: {
      fr: "Accédez au protocole scientifique complet : hypothèses clairement définies, méthodes de calcul rigoureuses, formules détaillées, critères de validation stricts et processus de révision transparent, garantissant la fiabilité de nos indicateurs d’impact environnemental.",
      en: "Access the full scientific protocol: clearly defined hypotheses, rigorous calculation methods, detailed formulas, strict validation criteria, and a transparent review process, ensuring the reliability of our environmental impact indicators.",
    },
    href: "/docs/product/SCIENTIFIC_PROTOCOL.md",
    icon: <Beaker className="h-6 w-6" />,
    isPdf: false,
  },
  {
    id: "gamification",
    title: {
      fr: "Gamification Non-Compétitive",
      en: "Non-Competitive Gamification",
    },
    desc: {
      fr: "Explorez notre approche de gamification non‑compétitive : mécanismes de récompense motivants, progression structurée, études d’impact utilisateur, et comment ces éléments favorisent l’engagement citoyen sans créer de compétition néfaste.",
      en: "Explore our non‑competitive gamification approach: motivating reward mechanisms, structured progression, user impact studies, and how these elements foster citizen engagement without harmful competition.",
    },
    href: "/docs/product/gamification-non-competitive.md",
    icon: <Heart className="h-6 w-6" />,
    isPdf: false,
  },
  {
    id: "design-system",
    title: {
      fr: "Design System & Charte Premium",
      en: "Design System & Premium Charter",
    },
    desc: {
      fr: "Découvrez notre charte visuelle premium : palette de couleurs multi‑teintes par bloc, typographies élégantes, icônes cohérentes, règles d’accessibilité avancées et guides UI, assurant une expérience esthétique, homogène et inclusive.",
      en: "Discover our premium visual charter: multi‑tone color palette per block, elegant typography, consistent icons, advanced accessibility rules and UI guidelines, delivering an aesthetic, cohesive and inclusive experience.",
    },
    href: "/docs/BLOC_COLOR_SYSTEM_PREMIUM.md",
    icon: <Palette className="h-6 w-6" />,
    isPdf: false,
  },
  {
    id: "tech",
    title: {
      fr: "Fiche Technique Complète",
      en: "Full Technical Sheet",
    },
    desc: {
      fr: "Consultez la fiche technique détaillée : architecture technique du projet, choix de stack (Next.js, Supabase), mesures de sécurité, diagrammes d’infrastructure, bonnes pratiques de développement, pour les développeurs souhaitant approfondir le fonctionnement interne.",
      en: "Review the detailed technical sheet: project technical architecture, stack choices (Next.js, Supabase), security measures, infrastructure diagrams, development best practices, for developers seeking deep insight into the internal workings.",
    },
    href: "/docs/fiche-technique-cleanmymap.md",
    icon: <Brain className="h-6 w-6" />,
    isPdf: false,
  },
  {
    id: "site-methodology",
    title: {
      fr: "Fonctionnement du site",
      en: "Site Operation",
    },
    desc: {
      fr: "Fiche de méthodologie technique qui explique l'architecture du site, le rôle de Leaflet, le lien GitHub/Vercel, Supabase, Codex, PostHog, Sentry, Resend et le domaine LWS.",
      en: "Technical methodology sheet that explains the site architecture, Leaflet, the GitHub/Vercel link, Supabase, Codex, PostHog, Sentry, Resend, and the LWS domain.",
    },
    href: "/docs/architecture/methodologie-fonctionnement-site.md",
    icon: <Layers className="h-6 w-6" />,
    isPdf: false,
  },
  {
    id: "quota-free-services",
    title: {
      fr: "Impact numérique des services suivis",
      en: "Digital impact of tracked services",
    },
    desc: {
      fr: "Bloc de pilotage des services suivis, avec accès au texte d'appui et à la vue détaillée intégrée au site.",
      en: "Control block for tracked services, with access to supporting text and the detailed inline view on the site.",
    },
    href: "/docs/plans/journal_impact_DU.md",
    icon: <Sparkles className="h-6 w-6" />,
    isPdf: false,
    secondaryAction: {
      href: "#impact-services",
      label: {
        fr: "Voir le bloc",
        en: "View block",
      },
    },
  },
  {
    id: "gov",
    title: {
      fr: "Gouvernance des Publications",
      en: "Publication Governance",
    },
    desc: {
      fr: "Lisez les règles de gouvernance des contenus : workflow complet de création, validation, publication et audit des pages, garantissant qualité, conformité et traçabilité des informations diffusées.",
      en: "Read the content governance rules: complete workflow for creation, validation, publishing and auditing of pages, ensuring quality, compliance and traceability of disseminated information.",
    },
    href: "/docs/publication-governance.md",
    icon: <ShieldCheck className="h-6 w-6" />,
    isPdf: false,
  },
];

export function MethodologiePageClient({
  freePlanServices,
  impactTotals,
  impactSnapshots,
  impactGeneratedAt,
  impactLaunchedAt,
  githubStats,
}: MethodologiePageClientProps) {
  const { locale } = useSitePreferences();
  const isFrench = locale === "fr";
  const { factors, sources, version } = IMPACT_PROXY_CONFIG;
  const { t } = useTranslation("methodologie");
  const classes = getBlockClasses("impact");

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 isolate overflow-x-clip bg-[linear-gradient(180deg,rgba(255,244,246,0.98)_0%,rgba(255,251,252,0.92)_28%,rgba(15,23,42,1)_100%)] pb-20 pt-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[44rem] bg-[radial-gradient(circle_at_top,rgba(251,113,133,0.26)_0%,rgba(251,113,133,0.12)_24%,rgba(255,255,255,0.88)_52%,rgba(15,23,42,0.98)_100%)]"
      />

      <div className="mx-auto flex w-full max-w-[1600px] flex-col space-y-16 px-4 sm:px-6 lg:px-8">
        <header className="space-y-6 text-center">
          <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-red-400/20 bg-red-400/5 px-6 py-2">
            <Beaker size={14} className="animate-pulse text-red-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400/60">
              {t("header_suptitle")}
            </span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white md:text-7xl">
            {t("header_title")}
          </h1>
          <p className="mx-auto max-w-3xl text-xl font-medium leading-relaxed text-red-100/40">
            {t("header_desc")}
          </p>
        </header>

        <NationalStatsSection />

        <TerritoryMapComparisonCards
          title="Deux lectures de la cartographie"
          subtitle="La carte de base garde une lecture précise et opérationnelle. La carte Terraink ajoute une lecture plus pédagogique et plus éditoriale. On garde les deux pour comparer la clarté et l'intérêt visuel dans le contexte méthodologique."
          locationLabel="Périmètre de référence"
          tone="rose"
          note="Ici, la double carte sert d'outil d'explication. La version brute montre la donnée; la version Terraink montre la mise en scène possible pour un rapport ou une page de présentation."
        />

        <div
          className={cn(
            "relative overflow-hidden rounded-[3rem] border p-10 transition-all duration-700 md:p-16",
            classes.surface,
            classes.shadow,
          )}
        >
          <div className="pointer-events-none absolute right-0 top-0 p-12 opacity-5">
            <ShieldCheck size={400} className="text-red-400" />
          </div>

          <div className="relative z-10 grid items-center gap-16 md:grid-cols-2">
            <div className="space-y-8">
              <h2 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white md:text-4xl">
                <Brain className="text-red-400" />
                <span>Transparence Algorithmique</span>
              </h2>
              <p className="max-w-md text-lg font-medium leading-relaxed text-red-100/40">
                Chaque donnée terrain est convertie via des coefficients scientifiques rigoureux issus de l&apos;ADEME et du GIEC.
              </p>
              <div className="flex gap-4">
                <div className="rounded-xl bg-white/5 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-400/60">
                  Version {version}
                </div>
                <div className="rounded-xl bg-red-500 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-red-500/20">
                  Audit Scientifique OK
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Données Sources", val: "ADEME / GIEC", icon: <BookOpen size={16} /> },
                { label: "Audit", val: "Semestriel", icon: <Zap size={16} /> },
                { label: "Marge Erreur", val: "< 2%", icon: <Scaling size={16} /> },
                { label: "Algorithme", val: "Linéaire Proxy", icon: <Sparkles size={16} /> },
              ].map((item, index) => (
                <div
                  key={index}
                  className="group flex flex-col gap-3 rounded-[2rem] border border-white/5 bg-white/5 p-6 shadow-sm transition-all hover:border-red-400/30"
                >
                  <div className="text-red-400 transition-transform group-hover:scale-110">
                    {item.icon}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30">
                      {item.label}
                    </div>
                    <div className="text-sm font-bold text-red-100">{item.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {[
            { icon: <MapPin className="text-red-400" />, title: "Collecte Terrain", desc: "Données GPS et volumes saisis via l'App" },
            { icon: <Zap className="text-red-400" />, title: "Calcul Instantané", desc: "Application des coefficients scientifiques" },
            { icon: <ShieldCheck className="text-red-400" />, title: "Impact Certifié", desc: "Visualisation immédiate de l'impact réel" },
          ].map((step, index) => (
            <div
              key={index}
              className="group flex flex-col items-center space-y-6 rounded-[2.5rem] border border-white/5 bg-white/5 p-10 text-center transition-all duration-500 hover:border-white/10"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/5 shadow-inner transition-transform duration-700 group-hover:scale-110">
                {step.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  {step.title}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-red-100/30">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <section className="space-y-8 pt-10 border-t border-white/10">
          <div className="space-y-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-200/60">
              {isFrench ? "Quota" : "Quota"}
            </p>
            <h2 className="text-4xl font-black tracking-tight text-white">
              {isFrench ? "Plans et quotas" : "Plans and quotas"}
            </h2>
            <p className="mx-auto max-w-3xl text-lg font-medium leading-relaxed text-red-100/50">
              {isFrench
                ? "La partie quota s’appuie sur la fiche d’architecture du site et reste centrée sur le risque de dépassement des limites de plan."
                : "The quota section relies on the site architecture sheet and stays focused on the risk of exceeding plan limits."}
            </p>
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <ReferenceDocCard
              doc={OPEN_SOURCE_DOCS[6]}
              schemaLabel={{ fr: "Schéma: onglet 1", en: "Schema: tab 1" }}
              schemaHref="#quota-services"
              isFrench={isFrench}
            />

            <FreePlanServicesMethodologyVisual
              services={freePlanServices}
              impactTotals={impactTotals}
              githubStats={githubStats}
              isFrench={isFrench}
              displayMode="quota"
              sectionId="quota-services"
            />
          </div>
        </section>

        <section className="grid gap-10 xl:grid-cols-2">
          <MethodologyCard
            title={t("cards.water.title")}
            formula={t("cards.water.formula", { val: factors.waterLitersPerCigaretteButt })}
            description={t("cards.water.desc", { val: factors.waterLitersPerCigaretteButt })}
            source={t("cards.water.source", { src: sources.water })}
            color="red"
            icon={<BookOpen size={24} />}
          />

          <MethodologyCard
            title={t("cards.co2.title")}
            formula={t("cards.co2.formula", { val: factors.co2KgPerWasteKg })}
            description={t("cards.co2.desc")}
            source={t("cards.co2.source", { src: sources.co2 })}
            color="red"
            icon={<Scaling size={24} />}
          />

          <MethodologyCard
            title={t("cards.surface.title")}
            formula={t("cards.surface.formula", {
              valkg: factors.surfaceM2PerWasteKg,
              valmin: factors.surfaceM2PerVolunteerMinute,
            })}
            description={t("cards.surface.desc")}
            source={t("cards.surface.source", { src: sources.surface })}
            color="slate"
            icon={<Info size={24} />}
          />

          <MethodologyCard
            title={t("cards.map.title")}
            formula={t("cards.map.formula")}
            description={t("cards.map.desc")}
            source={t("cards.map.source")}
            color="red"
            icon={<Scaling size={24} />}
          />
        </section>

        {/* Compromis Rigueur Scientifique vs Expérience Utilisateur (Formulaire Bénévole) */}
        <div className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-white/5 p-10 md:p-12 space-y-6">
          <div className="flex items-center gap-4 text-red-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/5 shadow-inner">
              <Scaling size={20} />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white">
              {isFrench ? "Compromis Rigueur Scientifique & UX du Formulaire Bénévole" : "Scientific Rigor & UX Compromise on the Volunteer Form"}
            </h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2 text-red-100/50 leading-relaxed font-medium text-sm">
            <p>
              {isFrench
                ? "Afin d'encourager l'action citoyenne et de simplifier le geste de déclaration sur le terrain, notre formulaire bénévole a été conçu pour être le plus fluide possible. Exiger de chaque participant qu'il pèse ou caractérise précisément chaque type de déchet découragerait la majorité des utilisateurs."
                : "To encourage citizen action and simplify reporting on the ground, our volunteer form was designed to be as fluid as possible. Requiring every participant to weigh or categorize each type of waste precisely would discourage most users."}
            </p>
            <p>
              {isFrench
                ? "C'est pourquoi nous utilisons des proxies linéaires (comme estimer la surface d'action d'après le temps passé ou le poids moyen des déchets collectés). Ce compromis pragmatique permet de collecter des données à grande échelle tout en garantissant des ordres de grandeur fiables validés scientifiquement."
                : "This is why we use linear proxies (such as estimating the action area based on time spent or average weight of collected waste). This pragmatic compromise allows large-scale data collection while ensuring reliable, scientifically validated orders of magnitude."}
            </p>
          </div>
        </div>

        {/* Gamification Logic */}
        <div className="space-y-10 pt-10 border-t border-white/10">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black tracking-tight text-white">
              {isFrench
                ? "Logique de Gamification (En cours)"
                : "Gamification Logic (Work in progress)"}
            </h2>
            <p className="max-w-2xl mx-auto text-lg font-medium leading-relaxed text-red-100/50">
              {isFrench
                ? "Nous développons actuellement un système de gamification non‑compétitive visant à encourager l’engagement citoyen via des récompenses, des badges et des tableaux de progression, le tout sans mécanismes de compétition agressifs."
                : "We are currently developing a non‑competitive gamification system to encourage citizen engagement through rewards, badges and progression boards, without aggressive competitive mechanics."}
            </p>
            <p className="text-sm text-red-200/60">
              {isFrench
                ? "🚧 En cours de développement – restez à l’écoute pour de nouvelles fonctionnalités !"
                : "🚧 Work in progress – stay tuned for upcoming features!"}
            </p>
          </div>
        </div>

        <section className="space-y-8 pt-10 border-t border-white/10">
          <div className="space-y-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-200/60">
              {isFrench ? "Rapport d'impact" : "Impact report"}
            </p>
            <h2 className="text-4xl font-black tracking-tight text-white">
              {isFrench ? "Impact carbone des services suivis" : "Carbon impact of tracked services"}
            </h2>
            <p className="mx-auto max-w-3xl text-lg font-medium leading-relaxed text-red-100/50">
              {isFrench
                ? "Le rapport d’impact est branché sur le texte canonique d’ACV et sur le schéma de l’onglet impact, avec l’historique mensuel en dessous."
                : "The impact report is tied to the canonical LCA text and the impact tab schema, with the monthly history displayed below."}
            </p>
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <ReferenceDocCard
              doc={OPEN_SOURCE_DOCS[0]}
              schemaLabel={{ fr: "Schéma: onglet 2", en: "Schema: tab 2" }}
              schemaHref="#impact-services"
              isFrench={isFrench}
            />

            <div className="space-y-8">
              <FreePlanServicesMethodologyVisual
                services={freePlanServices}
                impactTotals={impactTotals}
                githubStats={githubStats}
                isFrench={isFrench}
                displayMode="impact"
                sectionId="impact-services"
              />

              <section className="space-y-8 rounded-[2.5rem] border border-white/5 bg-white/5 p-8">
                <div className="space-y-4 text-center">
                  <h3 className="text-3xl font-black tracking-tight text-white">
                    {isFrench ? "Historique mensuel d'impact" : "Monthly impact history"}
                  </h3>
                  <p className="mx-auto max-w-3xl text-base font-medium leading-relaxed text-red-100/50">
                    {isFrench
                      ? "La courbe du bas suit l’historique persistant enregistré dans Supabase, tandis que la ligne pointillée estime l’impact du développement par IA depuis le lancement du projet. Aucun chiffre n’est inventé: les données absentes restent en NA."
                      : "The bottom curve follows the persistent history stored in Supabase, while the dashed line estimates the impact of AI development since project launch. No number is invented: missing data stays NA."}
                  </p>
                </div>

                <MonthlyImpactHistoryChart
                  snapshots={impactSnapshots}
                  launchedAt={impactLaunchedAt}
                  generatedAt={impactGeneratedAt}
                />
              </section>
            </div>
          </div>
        </section>

        <footer className="cmm-ribbon-surface flex flex-col items-center justify-between gap-10 pt-20 sm:flex-row">
          <div className="space-y-3 text-center sm:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-200/60">
              CleanMyMap Engine v{version}
            </p>
            <p className="max-w-md text-xs font-bold leading-relaxed text-red-100/70">
              Tous les calculs sont open-source et vérifiables par les autorités locales et partenaires scientifiques.
            </p>
          </div>
          <div
            className="rounded-2xl border border-white/10 bg-red-950/35 px-8 py-4 text-center text-[10px] font-black uppercase tracking-widest text-red-100/60 shadow-sm backdrop-blur-sm"
            dangerouslySetInnerHTML={{ __html: t("footer.partner") }}
          />
        </footer>
      </div>
    </div>
  );
}
