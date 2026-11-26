import type { Locale } from "@/lib/ui/preferences";

export type SummaryKpi = {
  id?: string;
  label: string;
  value: string;
  previousValue: string;
  deltaAbsolute?: string;
  deltaPercent?: string;
  interpretation?: "positive" | "negative" | "neutral";
};

type SummaryCopy = { fr: string; en: string };

const SUMMARY_TEXT_COPY: Record<string, SummaryCopy> = {
  "Impact terrain": { fr: "Impact terrain", en: "Field impact" },
  "IUR (Sobriété)": { fr: "IUR (Sobriété)", en: "IUR (Sustainability)" },
  "Qualite data": { fr: "Qualité des données", en: "Data quality" },
  "Non comparable": { fr: "Non comparable", en: "Not comparable" },
  Indisponible: { fr: "Indisponible", en: "Unavailable" },
  "Non renseigné (aucune action)": {
    fr: "Non renseigné (aucune action)",
    en: "Not reported (no actions)",
  },
  "Non renseigné (0% renseigné)": {
    fr: "Non renseigné (0% renseigné)",
    en: "Not reported (0% reported)",
  },
  "Traiter backlog moderation": {
    fr: "Traiter le backlog de modération",
    en: "Clear the moderation backlog",
  },
  "Renforcer geo-tracabilite": {
    fr: "Renforcer la géotraçabilité",
    en: "Strengthen geospatial traceability",
  },
  "Renforcer geo-couverture": {
    fr: "Renforcer la géocouverture",
    en: "Strengthen geographic coverage",
  },
  "Maintenir le pilotage courant": {
    fr: "Maintenir le pilotage courant",
    en: "Maintain current operations",
  },
  "Verifier la disponibilite des donnees": {
    fr: "Vérifier la disponibilité des données",
    en: "Check data availability",
  },
  "La source des actions est indisponible ; aucune recommandation comparative ne peut etre emise.": {
    fr: "La source des actions est indisponible ; aucune recommandation comparative ne peut être émise.",
    en: "The actions source is unavailable; no comparative recommendation can be issued.",
  },
  "Le corpus est tronque ou partiel ; les variations entre periodes ne sont pas comparables.": {
    fr: "Le corpus est tronqué ou partiel ; les variations entre périodes ne sont pas comparables.",
    en: "The loaded dataset is truncated or partial; period-over-period variations are not comparable.",
  },
  "Source des actions indisponible": {
    fr: "Source des actions indisponible",
    en: "Actions source unavailable",
  },
  "Corpus partiel ou tronque": {
    fr: "Corpus partiel ou tronqué",
    en: "Partial or truncated dataset",
  },
  "La source principale des actions a echoue : les indicateurs et comparaisons ne sont pas evaluables.": {
    fr: "La source principale des actions a échoué : les indicateurs et comparaisons ne sont pas évaluables.",
    en: "The primary actions source failed: indicators and comparisons cannot be evaluated.",
  },
  "Le corpus charge est tronque ou partiel : les comparaisons temporelles sont non comparables.": {
    fr: "Le corpus chargé est tronqué ou partiel : les comparaisons temporelles sont non comparables.",
    en: "The loaded dataset is truncated or partial: period comparisons are not comparable.",
  },
  "Aucune alerte prioritaire": {
    fr: "Aucune alerte prioritaire",
    en: "No priority alert",
  },
  "Resorber le backlog de moderation": {
    fr: "Résorber le backlog de modération",
    en: "Clear the moderation backlog",
  },
  "Le delai de moderation et le volume pending degradent la fiabilite de publication.": {
    fr: "Le délai de modération et le volume pending dégradent la fiabilité de publication.",
    en: "Moderation delay and pending volume reduce publication reliability.",
  },
  "Rehausser la qualite des donnees terrain": {
    fr: "Rehausser la qualité des données terrain",
    en: "Improve field data quality",
  },
  "La qualite et la geo-couverture conditionnent la lecture KPI et les exports institutionnels.": {
    fr: "La qualité et la géocouverture conditionnent la lecture KPI et les exports institutionnels.",
    en: "Data quality and geographic coverage shape KPI reading and institutional exports.",
  },
  "Aucune zone prioritaire detectee": {
    fr: "Aucune zone prioritaire détectée",
    en: "No priority area detected",
  },
  "Pas de signal territorial suffisamment robuste sur la fenetre courante.": {
    fr: "Pas de signal territorial suffisamment robuste sur la fenêtre courante.",
    en: "No sufficiently robust territorial signal was found in the current window.",
  },
  "La zone combine impact eleve et pression recurrente sur la periode recente.": {
    fr: "La zone combine impact élevé et pression récurrente sur la période récente.",
    en: "The area combines high impact with recurring pressure over the recent period.",
  },
  "Renforcer la preuve spatiale": {
    fr: "Renforcer la preuve spatiale",
    en: "Strengthen spatial evidence",
  },
  "Les traces geolocalisees conditionnent la defendabilite des analyses de terrain.": {
    fr: "Les traces géolocalisées conditionnent la défendabilité des analyses de terrain.",
    en: "Geolocated traces support the defensibility of field analyses.",
  },
  "Fiabiliser la mesure des déchets": {
    fr: "Fiabiliser la mesure des déchets",
    en: "Make waste measurement reliable",
  },
  "Optimiser le rendement écologique (IUR)": {
    fr: "Optimiser le rendement écologique (IUR)",
    en: "Optimize ecological efficiency (IUR)",
  },
  "L'indice d'utilité réelle est trop bas. L'infrastructure consomme trop par rapport à l'impact terrain généré.": {
    fr: "L'indice d'utilité réelle est trop bas. L'infrastructure consomme trop par rapport à l'impact terrain généré.",
    en: "The real-utility index is too low. Infrastructure consumes too much for the field impact generated.",
  },
  "Nettoyage du registre de données": {
    fr: "Nettoyage du registre de données",
    en: "Clean the data register",
  },
  "Le pilotage ne detecte pas d'urgence immediate sur la fenetre courante.": {
    fr: "Le pilotage ne détecte pas d'urgence immédiate sur la fenêtre courante.",
    en: "No immediate urgency was detected in the current window.",
  },
  "Aucune degradation majeure detectee sur qualite, couverture ou moderation.": {
    fr: "Aucune dégradation majeure détectée sur qualité, couverture ou modération.",
    en: "No major deterioration was detected in quality, coverage, or moderation.",
  },
  "Aucune degradation majeure detectee sur qualite ou couverture; moderation indisponible avec la source actuelle.": {
    fr: "Aucune dégradation majeure détectée sur qualité ou couverture ; modération indisponible avec la source actuelle.",
    en: "No major deterioration was detected in quality or coverage; moderation is unavailable from the current source.",
  },
};

type SummaryTemplate = {
  pattern: RegExp;
  render: (match: RegExpMatchArray, locale: Locale) => string;
};

const SUMMARY_TEMPLATES: SummaryTemplate[] = [
  {
    pattern: /^([+-]?\d+(?:[.,]\d+)?) kg \(([+-]?\d+(?:[.,]\d+)?)% renseigné\)$/,
    render: (match, locale) =>
      locale === "fr"
        ? `${match[1]} kg (${match[2]}% renseigné)`
        : `${match[1]} kg (${match[2]}% reported)`,
  },
  {
    pattern: /^Prioriser (.+)$/,
    render: (match, locale) =>
      locale === "fr" ? `Prioriser ${match[1]}` : `Prioritize ${match[1]}`,
  },
  {
    pattern: /^Delai moderation en degradation \(([+-]?\d+(?:[.,]\d+)?) j, ([+-]?\d+(?:[.,]\d+)?) j actuels\)\.$/,
    render: (match, locale) =>
      locale === "fr"
        ? `Délai de modération en dégradation (${match[1]} j, ${match[2]} j actuels).`
        : `Moderation delay is worsening (${match[1]} d, ${match[2]} d currently).`,
  },
  {
    pattern: /^Qualite data en baisse \(([+-]?\d+(?:[.,]\d+)?) pt, score actuel ([+-]?\d+(?:[.,]\d+)?)%\)\.$/,
    render: (match, locale) =>
      locale === "fr"
        ? `Qualité des données en baisse (${match[1]} pt, score actuel ${match[2]}%).`
        : `Data quality is down (${match[1]} pt, current score ${match[2]}%).`,
  },
  {
    pattern: /^Couverture geoloc en degradation \(([+-]?\d+(?:[.,]\d+)?) pt, couverture actuelle ([+-]?\d+(?:[.,]\d+)?)%\)\.$/,
    render: (match, locale) =>
      locale === "fr"
        ? `Couverture géoloc en dégradation (${match[1]} pt, couverture actuelle ${match[2]}%).`
        : `Geographic coverage is worsening (${match[1]} pt, current coverage ${match[2]}%).`,
  },
  {
    pattern: /^L'IUR est indisponible pour une décision métier : seulement (\d+)\/(\d+) actions \(([+-]?\d+(?:[.,]\d+)?)%\) ont une masse renseignée\.$/,
    render: (match, locale) =>
      locale === "fr"
        ? `L'IUR est indisponible pour une décision métier : seulement ${match[1]}/${match[2]} actions (${match[3]}%) ont une masse renseignée.`
        : `The IUR is unavailable for a business decision: only ${match[1]}/${match[2]} actions (${match[3]}%) have reported mass.`,
  },
  {
    pattern: /^L'IUR est indisponible pour une décision métier : seulement ([+-]?\d+(?:[.,]\d+)?)% des actions ont une masse renseignée\.$/,
    render: (match, locale) =>
      locale === "fr"
        ? `L'IUR est indisponible pour une décision métier : seulement ${match[1]}% des actions ont une masse renseignée.`
        : `The IUR is unavailable for a business decision: only ${match[1]}% of actions have reported mass.`,
  },
  {
    pattern: /^Détection de (\d+) anomalies de saisie \(Impact suspect ou date manquante\)\.$/,
    render: (match, locale) =>
      locale === "fr"
        ? `Détection de ${match[1]} anomalies de saisie (Impact suspect ou date manquante).`
        : `Detected ${match[1]} data-entry anomalies (suspected impact or missing date).`,
  },
];

export function localizeSummaryText(text: string | undefined, locale: Locale): string | undefined {
  if (text === undefined) return undefined;
  const exactCopy = SUMMARY_TEXT_COPY[text];
  if (exactCopy) return exactCopy[locale];

  const template = SUMMARY_TEMPLATES.find(({ pattern }) => pattern.test(text));
  const match = template ? text.match(template.pattern) : null;
  return template && match ? template.render(match, locale) : text;
}

export function localizeSummaryKpi(kpi: SummaryKpi, locale: Locale): SummaryKpi {
  return {
    ...kpi,
    label: localizeSummaryText(kpi.label, locale) ?? kpi.label,
    value: localizeSummaryText(kpi.value, locale) ?? kpi.value,
    previousValue: localizeSummaryText(kpi.previousValue, locale) ?? kpi.previousValue,
    deltaAbsolute: localizeSummaryText(kpi.deltaAbsolute, locale),
    deltaPercent: localizeSummaryText(kpi.deltaPercent, locale),
  };
}
