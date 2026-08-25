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
  Trash2,
  Zap,
} from "lucide-react";
import { buildActionImpactMethodology } from "@/lib/actions/impact-calculators";
import {
  buildActionPollutionProjectionMethodology,
} from "@/lib/actions/revisit-priority";
import {
  LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS,
} from "@/lib/actions/local-repollution-calibration";
import { PROJECTION_CONFIDENCE_CONSTANTS } from "@/lib/actions/projection-confidence";
import {
  ACTION_PRIORITY_COLOR_STOPS,
  resolveDynamicColor,
} from "@/components/actions/map-marker-categories";
import { useTranslation } from "@/lib/i18n/use-translation";
import { NationalStatsSection } from "@/components/sections/rubriques/national-stats-section";
import { TerritoryMapComparisonCards } from "@/components/maps/territory-map-comparison-cards";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type {
  EnvironmentalImpactElectricityEstimate,
  EnvironmentalImpactWaterEstimate,
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactSnapshotRecord,
} from "@/lib/environmental-impact-estimator/types";
import { buildWaterEstimate } from "@/lib/environmental-impact-estimator/services/water";
import { buildElectricityEstimate } from "@/lib/environmental-impact-estimator/services/electricity";
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
  impactElectricity?: EnvironmentalImpactElectricityEstimate | null;
  impactWater?: EnvironmentalImpactWaterEstimate | null;
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
          Formule du proxy
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
        href={doc.secondaryAction?.href ?? schemaHref}
        className="mt-3 inline-flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/80 shadow-lg transition-all hover:border-white/20 hover:bg-white/10"
      >
        <ExternalLink size={14} />
        {doc.secondaryAction
          ? doc.secondaryAction.label[isFrench ? "fr" : "en"]
          : isFrench
            ? "Voir le schéma"
            : "View schema"}
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
      fr: "Découvrez le calcul runtime des KPI d’impact, la distinction entre valeurs déclarées et estimées, les sources configurées et les limites de chaque proxy.",
      en: "Explore the runtime impact KPI calculation, the distinction between declared and estimated values, configured sources, and the limits of each proxy.",
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
      fr: "Accédez au protocole de calcul : hypothèses, formules effectivement exécutées, critères de validation et limites d’interprétation.",
      en: "Access the calculation protocol: assumptions, formulas actually executed, validation criteria, and interpretation limits.",
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
  {
    id: "action-map-methodology",
    title: {
      fr: "Méthodologie de la carte d'actions",
      en: "Action Map Methodology",
    },
    desc: {
      fr: "Comprenez la distinction entre mémoire des actions, pollution constatée, pollution projetée et signalements Trash Spotter actuellement observés.",
      en: "Understand the distinction between action history, observed pollution, projected pollution, and currently observed Trash Spotter reports.",
    },
    href: "/docs/product/methodologie-carte-actions.md",
    icon: <MapPin className="h-6 w-6" />,
    isPdf: false,
    secondaryAction: {
      href: "#methodologie-carte-actions",
      label: {
        fr: "Voir la section sur cette page",
        en: "View this page section",
      },
    },
  },
];

export function ActionMapMethodologySection({ isFrench }: { isFrench: boolean }) {
  const projection = buildActionPollutionProjectionMethodology();
  const actionMapDoc = OPEN_SOURCE_DOCS.find(
    (doc) => doc.id === "action-map-methodology",
  );

  if (!actionMapDoc) {
    return null;
  }

  return (
    <section
      id="methodologie-carte-actions"
      className="scroll-mt-8 space-y-8 rounded-[3rem] border border-sky-300/20 bg-slate-950/95 p-6 shadow-[0_28px_70px_-40px_rgba(14,165,233,0.55)] md:p-10"
    >
      <div className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-sky-300/70">
          {isFrench ? "Référence cartographique" : "Cartographic reference"}
        </p>
        <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">
          {isFrench
            ? "Méthodologie de la carte d'actions"
            : "Action map methodology"}
        </h2>
        <p className="max-w-4xl text-base font-medium leading-relaxed text-slate-200/70">
          {isFrench
            ? "Le calque Actions conserve la mémoire des interventions et projette une remontée de pollution à partir de la dernière action. Trash Spotter reste la lecture opérationnelle des pollutions actuellement signalées et actionnables."
            : "The Actions layer keeps intervention history and projects pollution recovery from the last action. Trash Spotter remains the operational view of currently reported and actionable pollution."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: isFrench ? "Pollution constatée" : "Observed pollution",
            text: isFrench
              ? "Score historique S/100 constaté avant l'action. Il n'est jamais réécrit par le temps."
              : "Historical score S/100 observed before the action. Time never rewrites it.",
          },
          {
            title: isFrench ? "Pollution projetée" : "Projected pollution",
            text: isFrench
              ? "Estimation P/100 calculée depuis le score historique et le temps écoulé."
              : "Estimate P/100 calculated from the historical score and elapsed time.",
          },
          {
            title: isFrench ? "Dernière action" : "Last action",
            text: isFrench
              ? "Date de référence pour calculer le nombre de jours écoulés t."
              : "Reference date used to calculate elapsed days t.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/10 bg-white/[0.06] p-5"
          >
            <h3 className="text-sm font-black text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300/70">
              {item.text}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.06] p-5">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-white">
          {isFrench ? "État courant par lieu" : "Current state by place"}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-300/75">
          {isFrench
            ? "Le resolver canonique réutilise les règles spatiales de la calibration et conserve les enregistrements sources. Sa priorité est : observation terrain récente, puis projection, puis historique si aucune projection exploitable n'est disponible."
            : "The canonical resolver reuses the calibration spatial rules and keeps source records intact. Its priority is: recent field observation, then projection, then history when no usable projection is available."}
        </p>
        <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-slate-300/75 md:grid-cols-3">
          <li>
            {isFrench
              ? "Trash Spotter quantitatif : observed · measured."
              : "Quantified Trash Spotter: observed · measured."}
          </li>
          <li>
            {isFrench
              ? "Trash Spotter qualitatif : Pollution observée · niveau non quantifié."
              : "Qualitative Trash Spotter: observed pollution · level not quantified."}
          </li>
          <li>
            {isFrench
              ? "clean_place : lieu explicitement propre, sans score fabriqué."
              : "clean_place: explicitly clean place, without an invented score."}
          </li>
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-emerald-100/70">
          {isFrench
            ? "Chaque état expose source observed|projected|historical, scoreKind measured|projected|unavailable, provenance, date et action historique. Un spot ponctuel ne recolore jamais une polyline. Le champ observé quantifié Trash Spotter reste un contrat futur : le read path actuel ne fabrique aucune donnée."
            : "Each state exposes source observed|projected|historical, scoreKind measured|projected|unavailable, provenance, date, and action history. A point spot never recolors a polyline. The quantified Trash Spotter field remains a future contract: the current read path invents no data."}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-sky-300/20 bg-sky-400/[0.08] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-200/70">
              {isFrench ? "Projection runtime" : "Runtime projection"}
            </p>
            <p className="mt-3 overflow-x-auto font-mono text-sm leading-relaxed text-sky-100">
              {projection.t80Formula}
              <br />
              {projection.projectionFormula}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-300/70">
              {projection.decayConstantFormula}. {isFrench
                ? "Sans mesure post-action explicite, S_post = 0 est un baseline de modèle, pas une mesure de propreté. Une mesure réelle post-action est prioritaire."
                : "Without an explicit post-action measurement, S_post = 0 is a model baseline, not a cleanliness measurement. A real post-action measurement takes priority."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {projection.orderOfMagnitude.map((item) => (
              <div
                key={item.historicalScore}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm"
              >
                <span className="text-slate-300/70">
                  S = {item.historicalScore}
                </span>
                <strong className="text-white">
                  T80 ≈ {Math.round(item.t80Days)} j
                </strong>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-300/20 bg-white/[0.05] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-200/70">
              {isFrench ? "Confiance de la projection" : "Projection confidence"}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300/75">
              {isFrench
                ? "Le resolver pur qualifie la robustesse des données d'entrée, pas la probabilité que le modèle soit juste. Il combine la géométrie, la source de S_post, la calibration locale et la complétude de l'historique."
                : "The pure resolver qualifies input-data robustness, not the probability that the model is correct. It combines geometry, the S_post source, local calibration, and history completeness."}
            </p>
            <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-slate-300/75 md:grid-cols-3">
              <li>
                {isFrench
                  ? `Élevée : géométrie fiable (≥ ${PROJECTION_CONFIDENCE_CONSTANTS.reliableGeometryMinimum}), S_post mesuré, au moins ${PROJECTION_CONFIDENCE_CONSTANTS.minimumLocalIntervalsForStrongEvidence} intervalles locaux valides et historique complet.`
                  : `High: reliable geometry (≥ ${PROJECTION_CONFIDENCE_CONSTANTS.reliableGeometryMinimum}), measured S_post, at least ${PROJECTION_CONFIDENCE_CONSTANTS.minimumLocalIntervalsForStrongEvidence} valid local intervals, and complete history.`}
              </li>
              <li>
                {isFrench
                  ? `Moyenne : au moins ${PROJECTION_CONFIDENCE_CONSTANTS.minimumSolidEvidenceForMedium} preuves solides, sans réunir toutes les conditions du niveau élevé.`
                  : `Medium: at least ${PROJECTION_CONFIDENCE_CONSTANTS.minimumSolidEvidenceForMedium} solid proofs without meeting every high-level condition.`}
              </li>
              <li>
                {isFrench
                  ? "Faible : niveau par défaut pour un baseline de modèle, une géométrie approximative ou un historique insuffisant/partiel."
                  : "Low: default for a model baseline, approximate geometry, or insufficient/partial history."}
              </li>
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              {isFrench
                ? "Cette confiance est affichée sans modifier la palette, l'opacité ou l'épaisseur de la carte. Le ledger d'erreur futur sera la source de validation statistique ; la confiance ne la remplace pas."
                : "This confidence is displayed without changing the map palette, opacity, or stroke width. The future error ledger will provide statistical validation; confidence does not replace it."}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.08] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/80">
              {isFrench ? "Limite d'interprétation" : "Interpretation limit"}
            </p>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-amber-50">
              {isFrench
                ? "Heuristique versionnée · pas une mesure en temps réel."
                : "Versioned heuristic · not a real-time measurement."}
            </p>
          </div>

          <ReferenceDocCard
            doc={actionMapDoc}
            schemaLabel={{
              fr: "Documentation produit",
              en: "Product documentation",
            }}
            schemaHref="#methodologie-carte-actions"
            isFrench={isFrench}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-violet-300/20 bg-violet-400/[0.06] p-5">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-white">
            {isFrench ? "Calibration locale" : "Local calibration"}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-300/75">
            {isFrench
              ? "Le runtime peut regrouper conservativement des actions en une identité dérivée de lieu (derivedPlaceKey), remplaçable plus tard par un véritable identifiant canonique. Aucune place_id n'est persistée par ce lot."
              : "The runtime can conservatively group actions under a derived place identity (derivedPlaceKey), replaceable later by a true canonical identifier. This lot persists no place_id."}
          </p>
          <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-slate-300/75">
            <li>
              {isFrench
                ? `≤ ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.nearDistanceMeters} m : distance suffisante ; entre ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.nearDistanceMeters} et ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.labelRequiredDistanceMeters} m : libellés normalisés compatibles requis ; au-delà : aucun rapprochement.`
                : `≤ ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.nearDistanceMeters} m: distance is sufficient; between ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.nearDistanceMeters} and ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.labelRequiredDistanceMeters} m: compatible normalized labels are required; beyond that: no merge.`}
            </li>
            <li>
              {isFrench
                ? `Points et zones uniquement ; les longues polylines/parcours sont exclues. Les intervalles de re-pollution nécessitent au moins ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalDays} jours et un T80 local borné entre ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumT80Days} et ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.maximumT80Days} jours.`
                : `Points and areas only; long polylines/routes are excluded. Repollution intervals require at least ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalDays} days and a local T80 bounded between ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumT80Days} and ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.maximumT80Days} days.`}
            </li>
            <li>
              {isFrench
                ? `La médiane des intervalles valides est informative dès ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalsForOverride - 1} intervalle, mais ne remplace le fallback générique qu'à partir de ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalsForOverride}. Confiance medium à ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.mediumConfidenceIntervals}, high à ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.highConfidenceIntervals}.`
                : `The median of valid intervals is informative from ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalsForOverride - 1} interval, but replaces the generic fallback only from ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalsForOverride}. Medium confidence starts at ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.mediumConfidenceIntervals}; high at ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.highConfidenceIntervals}.`}
            </li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-violet-100/70">
            {isFrench
              ? "Une source partielle (fenêtre, limite ou viewport non exhaustif) ne déclenche jamais cet apprentissage : le modèle générique reste utilisé."
              : "A partial source (window, limit, or non-exhaustive viewport) never activates this learning: the generic model remains in use."}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-white">
            {isFrench ? "Couleurs des actions" : "Action colors"}
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {ACTION_PRIORITY_COLOR_STOPS.map((stop) => (
              <p key={stop.key} className="flex items-center gap-2 text-sm text-slate-300/75">
                <span
                  className="h-3 w-3 rounded-full border border-white/20"
                  style={{ backgroundColor: resolveDynamicColor(stop.threshold) }}
                  aria-hidden="true"
                />
                {stop.label} · repère {stop.threshold}
              </p>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            {isFrench
              ? "Le vert est réservé aux lieux explicitement propres ; il n'est jamais un niveau de faible pollution pour une action."
              : "Green is reserved for explicitly clean places; it is never a low-pollution level for an action."}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-white">
            {isFrench ? "Grammaire géométrique" : "Geometry grammar"}
          </h3>
          <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-slate-300/75">
            <li>Ligne pleine : parcours déclaré/connu.</li>
            <li>Ligne pointillée : parcours reconstruit/indicatif.</li>
            <li>Polygon rempli : zone réelle ou indicative, selon l&apos;opacité.</li>
            <li>Point : localisation seule.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export function MethodologiePageClient({
  freePlanServices,
  impactTotals,
  impactSnapshots,
  impactGeneratedAt,
  impactLaunchedAt,
  githubStats,
  impactElectricity,
  impactWater,
}: MethodologiePageClientProps) {
  const { locale } = useSitePreferences();
  const isFrench = locale === "fr";
  const methodology = buildActionImpactMethodology();
  const { sources, version } = methodology;
  const { t } = useTranslation("methodologie");
  const classes = getBlockClasses("impact");
  const electricity =
    impactElectricity ?? buildElectricityEstimate({ monthlyElectricityKwh: null }, null);
  const water =
    impactWater ??
    buildWaterEstimate({
      monthlyElectricityKwh: null,
      monthlyDirectWaterConsumptionLiters: null,
      monthlyEvaporatedWaterLiters: null,
    });

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

        <ActionMapMethodologySection isFrench={isFrench} />

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
                Les KPI terrain suivent le calcul runtime versionné. Les valeurs déclarées et les estimations sont distinguées, puis les proxys sont appliqués à la masse ou aux mégots retenus. Périmètre : {methodology.scope}
              </p>
              <div className="flex gap-4">
                <div className="rounded-xl bg-white/5 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-400/60">
                  Version {version}
                </div>
                <div className="rounded-xl bg-red-500 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-red-500/20">
                  Proxy versionné
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: isFrench ? "Version" : "Version", val: version, icon: <BookOpen size={16} /> },
                { label: isFrench ? "Sources" : "Sources", val: "Configuration runtime", icon: <Zap size={16} /> },
                { label: isFrench ? "Périmètre" : "Scope", val: isFrench ? "Approuvé + filtres" : "Approved + filters", icon: <Scaling size={16} /> },
                { label: isFrench ? "Nature" : "Nature", val: isFrench ? "Proxys, pas mesures" : "Proxies, not measurements", icon: <Sparkles size={16} /> },
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
            { icon: <Zap className="text-red-400" />, title: "Calcul Instantané", desc: "Application des proxys versionnés" },
            { icon: <ShieldCheck className="text-red-400" />, title: isFrench ? "Impact documenté" : "Documented impact", desc: isFrench ? "Lecture des KPI et de leurs limites" : "Reading KPIs and their limits" },
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
            title={t("cards.waste.title")}
            formula={methodology.formulas.wasteKg}
            description={t("cards.waste.desc")}
            source={t("cards.waste.source")}
            color="red"
            icon={<Trash2 size={24} />}
          />

          <MethodologyCard
            title={t("cards.butts.title")}
            formula={methodology.formulas.butts}
            description={t("cards.butts.desc")}
            source={t("cards.butts.source")}
            color="red"
            icon={<BookOpen size={24} />}
          />

          <MethodologyCard
            title={t("cards.volunteers.title")}
            formula={methodology.formulas.volunteers}
            description={t("cards.volunteers.desc")}
            source={t("cards.volunteers.source")}
            color="slate"
            icon={<Heart size={24} />}
          />

          <MethodologyCard
            title={t("cards.water.title")}
            formula={methodology.formulas.water}
            description={t("cards.water.desc")}
            source={t("cards.water.source", { src: sources.water })}
            color="red"
            icon={<BookOpen size={24} />}
          />

          <MethodologyCard
            title={t("cards.co2.title")}
            formula={methodology.formulas.co2e}
            description={t("cards.co2.desc")}
            source={t("cards.co2.source", { src: sources.co2 })}
            color="red"
            icon={<Scaling size={24} />}
          />

          <MethodologyCard
            title={t("cards.surface.title")}
            formula={methodology.formulas.surface}
            description={t("cards.surface.desc")}
            source={t("cards.surface.source", { src: sources.surface })}
            color="slate"
            icon={<Info size={24} />}
          />

          <MethodologyCard
            title={t("cards.map.title")}
            formula={isFrench ? "Indice cartographique = calibration terrain (hors KPI impact canonique)" : "Map index = field calibration (outside canonical impact KPIs)"}
            description={t("cards.map.desc")}
            source={t("cards.map.source")}
            color="red"
            icon={<Scaling size={24} />}
          />

          <MethodologyCard
            title={t("cards.roi.title")}
            formula={methodology.formulas.euro}
            description={t("cards.roi.desc")}
            source={t("cards.roi.source", { src: sources.roi })}
            color="slate"
            icon={<Zap size={24} />}
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
                ? "C'est pourquoi certains indicateurs sont des proxys versionnés : ils donnent un ordre de grandeur reproductible, mais ne constituent ni une mesure instrumentale ni une certification scientifique."
                : "This is why some indicators are versioned proxies: they provide a reproducible order of magnitude, but are neither instrument measurements nor scientific certification."}
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
              {isFrench ? "Empreinte technique des services suivis" : "Technical footprint of tracked services"}
            </h2>
            <p className="mx-auto max-w-3xl text-lg font-medium leading-relaxed text-red-100/50">
              {isFrench
                ? "Ce bloc mesure l'empreinte technique et infrastructurelle des services suivis. Il est séparé des KPI d'impact terrain calculés à partir des actions approuvées."
                : "This block measures the technical and infrastructure footprint of tracked services. It is separate from terrain impact KPIs calculated from approved actions."}
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
              <section className="rounded-[2.5rem] border border-red-400/20 bg-red-400/5 p-8">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-200/60">
                  Méthode électrique
                </p>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-white">
                  CO₂e électrique : statut du calcul
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-red-100/65">
                  Facteur configuré : {electricity.factorKgCo2ePerKwh} kgCO₂e/kWh
                  ({electricity.source === "input" ? "signal électrique branché" : "référence " + electricity.note}).
                </p>
                <p className="mt-3 text-sm leading-relaxed text-red-100/55">
                  {electricity.calculation === "measured_kwh_to_co2e"
                    ? "La valeur affichée provient d'un calcul kWh × facteur électrique; elle n'est pas ajoutée une seconde fois au proxy total."
                    : electricity.calculation === "proxy_equivalent"
                      ? "La valeur affichée est un équivalent électrique estimé à partir d’un proxy CO₂e. Elle ne représente pas une consommation mesurée."
                      : "À compléter : aucun kWh réel ni proxy électrique exploitable n'est disponible."}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-red-100/45">
                  Le facteur sera remplacé lorsqu’une localisation électrique réelle du fournisseur sera connue.
                </p>
              </section>
              <section className="rounded-[2.5rem] border border-red-400/20 bg-red-400/5 p-8">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-200/60">
                  Méthode eau
                </p>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-white">
                  Eau estimée : composantes et limites
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-red-100/65">
                  Eau directe consommée sur site : {water.directWaterConsumptionLiters === null ? "à compléter" : "signal fourni"}. Eau indirecte liée à l’électricité : {water.indirectElectricityWaterLiters === null ? "à compléter" : "kWh × facteur configuré"}. Le facteur actuel est {water.factorLitersPerKwh} L/kWh ({water.factorSourceLabel}) et reste un proxy remplaçable lorsqu’une localisation électrique réelle est connue.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-red-100/55">
                  L’eau reste dans le cycle hydrologique global, mais l’eau évaporée est consommée localement car elle n’est plus immédiatement disponible dans le même bassin. Retrait et consommation ne sont pas interchangeables : l’eau retournée dépend du lieu, du moment, de la température et de la qualité. La pression dépend aussi du stress hydrique et des conflits locaux, pas seulement des litres.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-red-100/45">
                  {water.provenance.join(" ")}
                </p>
              </section>
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
