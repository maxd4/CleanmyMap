import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import { GIEC_REPORTS } from "@/data/content/giec-reports";
import { SUSTAINABLE_GOALS } from "@/data/content/sustainable-goals";
import { PLANETARY_BOUNDARIES } from "./planetary-boundaries-data";
import {
  buildImpactMagnitudeSnapshot,
  type ImpactMagnitudeInputs,
} from "@/lib/learning/impact-magnitude";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";

const COMPARATOR_INPUTS: ImpactMagnitudeInputs = {
  cigaretteButts: 10,
  wasteKg: 20,
  volunteerMinutes: 30,
};

function formatValue(locale: LearnLocale, value: number): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    maximumFractionDigits: 1,
  }).format(Number.isInteger(value) ? value : Number(value.toFixed(1)));
}

function getBoundaryStatusLabel(
  locale: LearnLocale,
  status: (typeof PLANETARY_BOUNDARIES)[number]["status"],
): string {
  if (locale === "en") {
    return {
      safe: "safe",
      "increasing-risk": "increasing risk",
      "high-risk": "high risk",
      transgressed: "transgressed",
    }[status];
  }
  return {
    safe: "sûre",
    "increasing-risk": "risque croissant",
    "high-risk": "risque élevé",
    transgressed: "dépassée",
  }[status];
}

export function LearnComprendreSsrContent({ locale }: { locale: LearnLocale }) {
  const fr = locale === "fr";
  const comparator = buildImpactMagnitudeSnapshot(
    COMPARATOR_INPUTS,
    IMPACT_PROXY_CONFIG.factors,
  );
  const highlightedReports = GIEC_REPORTS.slice(0, 3);
  const highlightedBoundaries = PLANETARY_BOUNDARIES.slice(0, 3);
  const highlightedGoals = SUSTAINABLE_GOALS.filter((goal) =>
    [6, 12, 14].includes(goal.id),
  );

  return (
    <section
      aria-labelledby="learn-comprendre-ssr-title"
      className="space-y-6 rounded-[2rem] border border-amber-200/80 bg-white p-5 shadow-sm md:p-6"
    >
      <div className="max-w-3xl space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
          {fr ? "Réponse courte" : "Short answer"}
        </p>
        <h2 id="learn-comprendre-ssr-title" className="text-2xl font-black tracking-tight text-slate-900">
          {fr
            ? "Les repères essentiels avant les graphiques"
            : "The essential cues before the charts"}
        </h2>
        <p className="cmm-text-body">
          {fr
            ? "Cette synthèse reste lisible sans attendre le chargement des interactions. Les graphiques, filtres et calculateurs ci-dessous approfondissent ces mêmes données éditoriales."
            : "This summary stays readable before the interactive layer loads. The charts, filters and calculators below expand on the same editorial data."}
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-[1.5rem] border border-blue-200 bg-blue-50/60 p-5">
          <h3 className="text-xl font-black tracking-tight text-slate-900">
            {fr ? "GIEC" : "IPCC"}
          </h3>
          <p className="cmm-text-body mt-2">
            {fr
              ? "Les rapports du GIEC synthétisent l’état des connaissances sur le changement climatique, ses risques et les leviers d’action."
              : "IPCC reports synthesize knowledge about climate change, its risks and response options."}
          </p>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {highlightedReports.map((report) => (
              <li key={report.id}>
                <strong>{report.title}</strong> ({report.year}) : {report.focus} {report.keyFindings[0]?.description}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-blue-200 pt-3 text-xs text-slate-600">
            {fr
              ? "Source visible : GIEC, années des rapports enregistrées dans la fiche. Limite : résumé de vulgarisation, pas le rapport complet."
              : "Visible source: IPCC, report years recorded in the content. Limit: an educational summary, not the full report."}
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-violet-200 bg-violet-50/60 p-5">
          <h3 className="text-xl font-black tracking-tight text-slate-900">
            {fr ? "Limites planétaires" : "Planetary boundaries"}
          </h3>
          <p className="cmm-text-body mt-2">
            {fr
              ? "Le cadre décrit neuf limites et distingue une valeur présentée, une limite sûre et un niveau de risque."
              : "The framework describes nine boundaries and distinguishes a displayed value, a safe limit and a risk level."}
          </p>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {highlightedBoundaries.map((boundary) => (
              <li key={boundary.id}>
                <strong>{boundary.name}</strong> — {boundary.currentValue} ; {fr ? "limite" : "limit"} {boundary.safeLimit} ; {getBoundaryStatusLabel(locale, boundary.status)}.
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-violet-200 pt-3 text-xs text-slate-600">
            {fr
              ? "Limite de la fiche actuelle : aucune URL ni date de référence n’est renseignée dans le contrat éditorial de ces valeurs ; l’interactif ne remplace donc pas une vérification primaire."
              : "Current content limit: the editorial contract records no reference URL or date for these values; the interactive view is not a substitute for primary verification."}
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/60 p-5">
          <h3 className="text-xl font-black tracking-tight text-slate-900">
            {fr ? "Objectifs de développement durable" : "Sustainable Development Goals"}
          </h3>
          <p className="cmm-text-body mt-2">
            {fr
              ? "Les ODD sont les 17 objectifs adoptés par l’ONU en 2015, avec un horizon 2030. Ils forment un cadre de lecture, pas une mesure automatique de l’impact d’une action."
              : "The SDGs are the 17 goals adopted by the UN in 2015, with a 2030 horizon. They are a framing system, not an automatic measure of an action’s impact."}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {highlightedGoals.map((goal) => (
              <li key={goal.id}>
                <strong>ODD {goal.number} — {goal.title}</strong> : {goal.description}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-emerald-200 pt-3 text-xs text-slate-600">
            {fr
              ? "Source visible : ONU, adoption 2015, telle qu’indiquée par le module. Limite : les liens entre une action locale et un ODD restent une mise en contexte, pas une attribution causale."
              : "Visible source: UN, adopted in 2015, as stated by the module. Limit: links between a local action and an SDG are context, not causal attribution."}
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-amber-200 bg-amber-50/60 p-5">
          <h3 className="text-xl font-black tracking-tight text-slate-900">
            {fr ? "Ordre de grandeur" : "Order of magnitude"}
          </h3>
          <p className="cmm-text-body mt-2">
            {fr
              ? "Pour un exemple de 10 mégots, 20 kg de déchets et 30 minutes de bénévolat, le modèle traduit les entrées en repères d’eau, de CO₂, de surface et de valorisation."
              : "For an example of 10 cigarette butts, 20 kg of waste and 30 minutes of volunteering, the model translates inputs into water, CO₂, area and value cues."}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white/80 p-3"><dt>Eau</dt><dd className="font-black">{formatValue(locale, comparator.waterLiters)} L</dd></div>
            <div className="rounded-xl bg-white/80 p-3"><dt>CO₂eq</dt><dd className="font-black">{formatValue(locale, comparator.co2Kg)} kg</dd></div>
            <div className="rounded-xl bg-white/80 p-3"><dt>{fr ? "Surface" : "Area"}</dt><dd className="font-black">{formatValue(locale, comparator.surfaceM2FromWaste)} m²</dd></div>
            <div className="rounded-xl bg-white/80 p-3"><dt>{fr ? "Valorisation" : "Value"}</dt><dd className="font-black">{formatValue(locale, comparator.streetCleaningSavings.lowerBoundEuros)}–{formatValue(locale, comparator.streetCleaningSavings.upperBoundEuros)} €</dd></div>
          </dl>
          <p className="mt-4 border-t border-amber-200 pt-3 text-xs text-slate-600">
            {fr
              ? `Version ${IMPACT_PROXY_CONFIG.version}. Sources des facteurs : ${IMPACT_PROXY_CONFIG.sources.water} ; ${IMPACT_PROXY_CONFIG.sources.co2}. Limite : ce sont des proxies de pilotage, pas des mesures individualisées ni un bilan carbone complet.`
              : `Version ${IMPACT_PROXY_CONFIG.version}. Factor sources: ${IMPACT_PROXY_CONFIG.sources.water}; ${IMPACT_PROXY_CONFIG.sources.co2}. Limit: these are steering proxies, not individualized measurements or a full carbon footprint.`}
          </p>
        </article>
      </div>
    </section>
  );
}
