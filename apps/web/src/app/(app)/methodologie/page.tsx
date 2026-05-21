import type { Metadata } from "next";
import Link from "next/link";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { Info, BookOpen, Scaling, Beaker, Sparkles, Zap, Brain, ShieldCheck, MapPin, Download } from "lucide-react";
import { getTranslation } from "@/lib/i18n/server-translation";
import { NationalStatsSection } from "@/components/sections/rubriques/national-stats-section";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import { getServerLocale } from "@/lib/server-preferences";
import { listGovernanceMonthlyReports } from "@/lib/governance/governance-monthly-report-store";
import { StorageBusinessContributionDonut } from "@/components/dashboard/storage-business-contribution-donut";
import { MethodologyCard } from "@/components/methodologie/methodology-card";

export const metadata: Metadata = {
  title: "Méthodologie - Comment nous calculons l'impact | CleanMyMap",
  description:
    "Méthodologie de calcul d'impact environnemental de CleanMyMap. Coefficients CO2, eau, valorisation des déchets. Transparence complète sur les métriques d'action citoyenne.",
  keywords: [
    "méthodologie",
    "calcul impact",
    "CO2 avoided",
    "empreinte carbone",
    "valorisation déchets",
    "impact environnemental",
    "transparence",
    "écologie",
    "développement durable",
  ],
  alternates: {
    canonical: "/methodologie",
  },
};

const METHODLOGY_SECTIONS = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "sources", label: "Sources & gouvernance" },
  { id: "calculation", label: "Chaîne de calcul" },
  { id: "indicators", label: "Méthodes par indicateur" },
  { id: "governance-report", label: "Rapport mensuel" },
  { id: "prioritization", label: "Priorisation" },
  { id: "audit", label: "Audit & export" },
] as const;

const PRIORITIZATION_STEPS = [
  {
    step: "Étape 1",
    title: "Score de risque global par service",
    description:
      "Placer le score détaillé au centre du pilotage et déclencher les seuils d'alerte avant saturation.",
  },
  {
    step: "Étape 2",
    title: "Camembert mensuel par catégorie métier",
    description:
      "Montrer la répartition du stockage par métier pour identifier rapidement la dominante du mois.",
  },
  {
    step: "Étape 3",
    title: "Export PDF mensuel avec résumé de pilotage",
    description:
      "Centraliser la lecture mensuelle dans un PDF interne et publiable pour la gouvernance.",
  },
  {
    step: "Étape 4",
    title: "Alertes automatiques si seuil dépassé",
    description:
      "Déclencher une alerte dès qu'une catégorie ou un service franchit un seuil critique.",
  },
] as const;

function formatMonthLabel(reportMonth: string): string {
  const parsed = new Date(`${reportMonth}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return reportMonth;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function getPublicGovernanceIndicator(usagePercent: number, alertCount: number): string {
  if (usagePercent >= 90 || alertCount >= 3) {
    return "Critique";
  }

  if (usagePercent >= 70 || alertCount > 0) {
    return "Vigilance";
  }

  return "Stable";
}

export default async function MethodologiePage() {
  const { factors, sources, version } = IMPACT_PROXY_CONFIG;
  const locale = await getServerLocale();
  const { t } = getTranslation("methodologie", locale);
  const classes = getBlockClasses("visualize");
  const governanceReports = await listGovernanceMonthlyReports(6).catch(() => []);
  const latestGovernanceReport = governanceReports[0] ?? null;
  const publicGovernanceSummary = latestGovernanceReport
    ? [
        {
          label: "Mois archivé",
          value: formatMonthLabel(latestGovernanceReport.reportMonth),
          hint: "Dernier snapshot mensuel",
        },
        {
          label: "Stockage total",
          value: latestGovernanceReport.payload.storage.totalLabel,
          hint: `Sur ${latestGovernanceReport.payload.storage.quotaLabel}`,
        },
        {
          label: "Quota restant",
          value: latestGovernanceReport.payload.storage.remainingLabel,
          hint: `${latestGovernanceReport.payload.storage.usagePercent.toFixed(1)}% utilisé`,
        },
        {
          label: "Indicateur global",
          value: getPublicGovernanceIndicator(
            latestGovernanceReport.payload.storage.usagePercent,
            latestGovernanceReport.payload.storage.businessContributions.alerts.length,
          ),
          hint: "Lecture synthétique du mois",
        },
        {
          label: "Catégorie dominante",
          value: latestGovernanceReport.payload.storage.topContributionLabel ?? "n/a",
          hint: latestGovernanceReport.payload.storage.businessContributions.alerts.length > 0
            ? `${latestGovernanceReport.payload.storage.businessContributions.alerts.length} alerte${latestGovernanceReport.payload.storage.businessContributions.alerts.length > 1 ? "s" : ""} suivie${latestGovernanceReport.payload.storage.businessContributions.alerts.length > 1 ? "s" : ""}`
            : "Aucune alerte active",
        },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-12 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <header className="space-y-6 text-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-sky-400/20 bg-sky-400/5 px-6 py-2">
          <Beaker size={14} className="text-sky-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400/60">
            {t("header_suptitle")}
          </span>
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-white md:text-7xl">
          {t("header_title")}
        </h1>
        <p className="mx-auto max-w-3xl text-lg font-medium leading-relaxed text-sky-100/40 md:text-xl">
          {t("header_desc")}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {METHODLOGY_SECTIONS.map((section) => (
            <Link
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full border border-sky-400/18 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-sky-100/70 transition hover:border-sky-300/35 hover:bg-sky-400/10 hover:text-white"
            >
              {section.label}
            </Link>
          ))}
        </div>
      </header>

      <section id="overview" className="space-y-6">
        <SectionHeading
          eyebrow="Vue d'ensemble"
          title="Lire le périmètre avant d'entrer dans le détail"
          description="La page commence par les repères globaux qui cadrent la lecture, puis déroule la logique complète de calcul."
        />
        <NationalStatsSection />
      </section>

      <section id="sources" className="space-y-6">
        <SectionHeading
          eyebrow="Sources & gouvernance"
          title="Transparence algorithmique"
          description="Chaque donnée terrain est convertie via des coefficients scientifiques rigoureux issus de l'ADEME et du GIEC."
        />

        <div className={cn(
          "rounded-[3rem] border p-10 md:p-16 relative overflow-hidden transition-all duration-700",
          classes.surface,
          classes.shadow,
        )}>
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <ShieldCheck size={400} className="text-sky-400" />
          </div>

          <div className="relative z-10 grid gap-16 md:grid-cols-2 md:items-center">
            <div className="space-y-8">
              <h3 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white md:text-4xl">
                <Brain className="text-sky-400" />
                Transparence
                <br />
                Algorithmique
              </h3>
              <p className="max-w-md text-lg font-medium leading-relaxed text-sky-100/40">
                Chaque donnée terrain est convertie via des coefficients scientifiques rigoureux issus de l&apos;ADEME et du GIEC.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="rounded-xl border border-white/5 bg-white/5 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-sky-400/60">
                  Version {version}
                </div>
                <div className="rounded-xl bg-sky-500 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-sky-500/20">
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
              ].map((item, i) => (
                <div
                  key={i}
                  className="group flex flex-col gap-3 rounded-[2rem] border border-white/5 bg-white/5 p-6 shadow-sm transition-all hover:border-sky-400/30"
                >
                  <div className="text-sky-400 transition-transform group-hover:scale-110">
                    {item.icon}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30">
                      {item.label}
                    </div>
                    <div className="text-sm font-bold text-sky-100">{item.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="calculation" className="space-y-6">
        <SectionHeading
          eyebrow="Chaîne de calcul"
          title="De la collecte à l'impact certifié"
          description="La logique de traitement reste la même: on saisit, on calcule, puis on certifie la lecture finale."
        />

        <div className="grid grid-cols-1 gap-8 px-4 md:grid-cols-3">
          {[
            { icon: <MapPin className="text-sky-400" />, title: "Collecte Terrain", desc: "Données GPS et volumes saisis via l'App" },
            { icon: <Zap className="text-amber-400" />, title: "Calcul Instantané", desc: "Application des coefficients scientifiques" },
            { icon: <ShieldCheck className="text-emerald-400" />, title: "Impact Certifié", desc: "Visualisation immédiate de l'impact réel" },
          ].map((step, i) => (
            <div
              key={i}
              className="group flex flex-col items-center space-y-6 rounded-[2.5rem] border border-white/5 bg-white/5 p-10 text-center transition-all duration-500 hover:border-white/10"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/5 shadow-inner transition-transform duration-700 group-hover:scale-110">
                {step.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  {step.title}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-sky-100/30">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="method-calculation" className="space-y-6">
        <SectionHeading
          eyebrow="Méthode de calcul"
          title="Deux règles simples pour convertir la collecte"
          description="La page détaille les conversions utilisées dans le formulaire pour transformer les signaux terrain en estimations lisibles."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-[2.5rem] border border-white/5 bg-white/5 p-6 shadow-sm transition-all hover:border-sky-400/25">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-400">
                <Info size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-400/60">Mégots → masse</p>
                <p className="text-sm font-semibold text-white">Conversion opérationnelle</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-sky-100/40">
              0,2 g par mégot sec, avec une correction x1,2 si le mégot est humide et x1,5 s&apos;il est mouillé.
            </p>
          </div>

          <div className="rounded-[2.5rem] border border-white/5 bg-white/5 p-6 shadow-sm transition-all hover:border-emerald-400/25">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400/60">Vision IA</p>
                <p className="text-sm font-semibold text-white">Estimation assistée</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-sky-100/40">
              Analyse des sacs, du remplissage et de la densité. Référence de densité moyenne : 150 kg/m³ pour le tout-venant urbain.
            </p>
          </div>
        </div>
      </section>

      <section id="indicators" className="space-y-6">
        <SectionHeading
          eyebrow="Méthodes par indicateur"
          title="Une logique par KPI"
          description="Chaque carte explique la formule, la lecture et la source derrière l'indicateur."
        />

        <div className="grid gap-10 xl:grid-cols-2">
          <MethodologyCard
            title={t("cards.water.title")}
            formula={t("cards.water.formula", { val: factors.waterLitersPerCigaretteButt })}
            description={t("cards.water.desc", { val: factors.waterLitersPerCigaretteButt })}
            source={t("cards.water.source", { src: sources.water })}
            color="sky"
            icon={<BookOpen size={24} />}
          />
          <MethodologyCard
            title={t("cards.co2.title")}
            formula={t("cards.co2.formula", { val: factors.co2KgPerWasteKg })}
            description={t("cards.co2.desc")}
            source={t("cards.co2.source", { src: sources.co2 })}
            color="emerald"
            icon={<Scaling size={24} />}
          />
          <MethodologyCard
            title={t("cards.surface.title")}
            formula={t("cards.surface.formula", { valkg: factors.surfaceM2PerWasteKg, valmin: factors.surfaceM2PerVolunteerMinute })}
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
            color="rose"
            icon={<Scaling size={24} />}
          />
        </div>
      </section>

      <section id="governance-report" className="space-y-6">
        <SectionHeading
          eyebrow="Rapport mensuel"
          title="La gouvernance expose une synthèse publique mensuelle"
          description="La vue publique reste volontairement compacte: elle montre les repères de pilotage, le lien vers le PDF et l'archive mensuelle, tandis que les détails techniques restent dans l'administration."
        />

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[3rem] border border-sky-400/20 bg-sky-500/8 p-8 md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-400/60">
                  Dernier rapport disponible
                </p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-white">
                  {latestGovernanceReport ? formatMonthLabel(latestGovernanceReport.reportMonth) : "Aucun rapport encore archivé"}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sky-100/45">
                  {latestGovernanceReport
                    ? "Le PDF reprend les mêmes signaux que les panneaux d'administration: impact mensuel, dérive des plans gratuits, stockage Supabase et notes de gouvernance."
                    : "Le premier PDF sera généré automatiquement lors du prochain passage du cron mensuel de stockage."}
                </p>
              </div>

              {latestGovernanceReport ? (
                <a
                  href={`/api/reports/governance-monthly?month=${latestGovernanceReport.reportMonth}`}
                  target="_blank"
                  className="inline-flex items-center gap-3 rounded-[2rem] bg-sky-500 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-sky-500/20 transition-all hover:scale-[1.02] hover:bg-sky-400"
                >
                  <Download size={16} />
                  Télécharger le PDF
                </a>
              ) : null}
            </div>

            {latestGovernanceReport ? (
              <div className="mt-8 space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {publicGovernanceSummary.map((item) => (
                    <div key={item.label} className="rounded-[2rem] border border-white/5 bg-white/5 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-400/55">
                        {item.label}
                      </p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {item.value}
                      </p>
                      <p className="mt-1 text-sm text-sky-100/45">
                        {item.hint}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[2rem] border border-sky-400/20 bg-sky-500/10 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300/70">
                    Message de gouvernance
                  </p>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-sky-100/55">
                    La vue publique montre la tendance du mois, la répartition métier et le document de
                    référence. Les seuils d&apos;alerte, l&apos;historique détaillé et les décisions de
                    pilotage restent traités côté administration.
                  </p>
                </div>

                <StorageBusinessContributionDonut
                  report={latestGovernanceReport.payload.storage.businessContributions}
                  compact
                />

                <div className="rounded-[2rem] border border-white/5 bg-slate-950/30 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-400/55">
                    Lecture publique
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-sky-100/55">
                    {latestGovernanceReport.payload.summary.slice(0, 3).map((note) => (
                      <li key={note}>• {note}</li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-sky-100/30">
                    Les détails métier complets restent réservés à l&apos;administration.
                  </p>
                </div>
              </div>
            ) : null}

            {latestGovernanceReport ? (
              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-sky-100/30">
                Généré le {new Intl.DateTimeFormat("fr-FR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "UTC",
                }).format(new Date(latestGovernanceReport.generatedAt))}
              </p>
            ) : null}
          </div>

          <div className="rounded-[3rem] border border-white/5 bg-white/5 p-8 md:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
              Archive mensuelle
            </p>
            <div className="mt-4 space-y-3">
              {governanceReports.length > 0 ? (
                governanceReports.slice(0, 4).map((report) => (
                  <a
                    key={report.reportMonth}
                    href={`/api/reports/governance-monthly?month=${report.reportMonth}`}
                    target="_blank"
                    className="flex items-center justify-between gap-4 rounded-[2rem] border border-white/5 bg-slate-950/40 px-4 py-4 transition hover:border-sky-400/25 hover:bg-slate-950/55"
                  >
                    <div>
                      <p className="text-sm font-black text-white">
                        {formatMonthLabel(report.reportMonth)}
                      </p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                        {new Intl.DateTimeFormat("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "UTC",
                        }).format(new Date(report.generatedAt))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300/80">
                        PDF
                      </p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/25">
                        Rapport archivé
                      </p>
                    </div>
                  </a>
                ))
              ) : (
                <div className="rounded-[2rem] border border-dashed border-white/10 bg-slate-950/30 p-4 text-sm leading-relaxed text-white/35">
                  Aucun rapport mensuel n&apos;est encore archivé.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="prioritization" className="space-y-6">
        <SectionHeading
          eyebrow="Priorisation d'implémentation"
          title="L'ordre de mise en place du pilotage"
          description="La feuille de route reste courte et lisible: d'abord le risque, ensuite la répartition mensuelle, puis le rapport PDF et enfin les alertes automatiques."
        />

        <div className="rounded-[3rem] border border-sky-400/20 bg-slate-950/35 p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PRIORITIZATION_STEPS.map((item, index) => (
            <article
              key={item.step}
              className="rounded-[2.25rem] border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur-sm"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-400/60">
                {item.step}
              </p>
              <p className="mt-2 text-lg font-black tracking-tight text-white">
                {item.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-sky-100/45">
                {item.description}
              </p>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                {index === 0
                  ? "Priorité haute"
                  : index === 1
                    ? "Visible publiquement"
                    : index === 2
                      ? "Pilotage central"
                  : "Déclenchement conditionnel"}
              </p>
            </article>
          ))}
          </div>
        </div>
      </section>

      <section id="audit" className="space-y-6">
        <SectionHeading
          eyebrow="Audit & export"
          title={t("audit.title")}
          description="Le bloc final rassemble la preuve, la lecture humaine et l'accès au document de référence."
        />

        <div className="group relative overflow-hidden rounded-[3rem] border border-sky-400/20 bg-sky-500/10 p-12">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <ShieldCheck size={200} className="text-sky-400" />
          </div>
          <div className="relative z-10 flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4 text-center md:text-left">
              <h3 className="flex items-center justify-center gap-4 text-3xl font-black tracking-tight text-white md:justify-start">
                <ShieldCheck className="text-sky-400" />
                {t("audit.title")}
              </h3>
              <p className="max-w-xl font-medium leading-relaxed text-sky-100/60">
                {t("audit.desc")}
              </p>
            </div>
            <a
              href="/docs/impact_IA_CleanMyMap.pdf"
              target="_blank"
              className="inline-flex items-center gap-3 rounded-[2rem] bg-sky-500 px-10 py-5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-sky-500/20 transition-all hover:scale-105 hover:bg-sky-400"
            >
              <Download size={16} />
              {t("audit.cta")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-400/60">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">
        {title}
      </h2>
      <p className="max-w-3xl text-sm leading-relaxed text-sky-100/40 md:text-base">
        {description}
      </p>
    </div>
  );
}
