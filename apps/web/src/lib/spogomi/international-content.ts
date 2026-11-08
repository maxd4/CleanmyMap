import type { Locale } from "@/lib/ui/preferences";

export type SpogomiInternationalSource = {
  id: string;
  label: Record<Locale, string>;
  description: Record<Locale, string>;
  href: string;
  verifiedAt: string;
};

export type SpogomiInternationalNews = {
  id: string;
  title: Record<Locale, string>;
  sourceLabel: string;
  publishedAt: string;
  href: string;
  state: "confirmed" | "planned";
};

export type SpogomiHistoricalSource = {
  href: string;
  label: Record<Locale, string>;
};

export type SpogomiHistoricalExample = {
  id: string;
  copyKey: string;
  sourceUrl: string;
  sourceLabel: string;
  additionalSources?: readonly SpogomiHistoricalSource[];
  verifiedAt: string;
};

export type SpogomiExternalEvent = {
  id: string;
  name: Record<Locale, string>;
  country: Record<Locale, string>;
  place: Record<Locale, string>;
  period: Record<Locale, string>;
  year: number;
  state: "confirmed" | "planned" | "date_set";
  sourceUrl: string;
  sourceLabel: string;
  verifiedAt: string;
  cleanMyMapEventId: null;
};

const SPOGOMI_EDITORIAL_VERIFIED_AT = "2026-11-08";

export const SPOGOMI_INTERNATIONAL_SOURCES: SpogomiInternationalSource[] = [
  {
    id: "spogomi-federation",
    label: { fr: "Fédération japonaise SPOGOMI", en: "SPOGOMI Federation" },
    description: {
      fr: "Présentation du mouvement, règles générales et événements publiés par l'organisation de référence.",
      en: "Movement overview, general rules, and published events from the reference organization.",
    },
    href: "https://spogomi.or.jp/",
    verifiedAt: SPOGOMI_EDITORIAL_VERIFIED_AT,
  },
  {
    id: "spogomi-world-cup",
    label: { fr: "Site officiel World Cup", en: "Official World Cup site" },
    description: {
      fr: "Cadre World Cup, actualités officielles et calendrier prévisionnel international.",
      en: "World Cup framework, official news, and the international provisional schedule.",
    },
    href: "https://en.nf-spogomiwc.com/",
    verifiedAt: SPOGOMI_EDITORIAL_VERIFIED_AT,
  },
  {
    id: "spogomi-japanese-rules",
    label: { fr: "Règles générales japonaises", en: "General Japanese rules" },
    description: {
      fr: "Format général : équipes de 2 à 5, 40 minutes de collecte puis 20 minutes de tri ; des adaptations locales sont possibles.",
      en: "General format: teams of 2 to 5, 40 minutes of collection followed by 20 minutes of sorting; local adaptations are possible.",
    },
    href: "https://spogomi.or.jp/rule/",
    verifiedAt: SPOGOMI_EDITORIAL_VERIFIED_AT,
  },
  {
    id: "spogomi-world-cup-terms",
    label: { fr: "Conditions World Cup", en: "World Cup terms" },
    description: {
      fr: "Conditions publiées pour la World Cup : équipe de 3 et règles d'éligibilité, dont le consentement parental.",
      en: "Published World Cup terms: teams of 3 and eligibility rules, including parental consent.",
    },
    href: "https://en.nf-spogomiwc.com/terms/",
    verifiedAt: SPOGOMI_EDITORIAL_VERIFIED_AT,
  },
  {
    id: "artema-rules",
    label: { fr: "Règles ARTEMA", en: "ARTEMA rules" },
    description: {
      fr: "Règles publiées par ARTEMA sur la collecte, le tri, les points, les retards, les avertissements et la disqualification.",
      en: "Rules published by ARTEMA for collection, sorting, scoring, late returns, warnings, and disqualification.",
    },
    href: "https://www.artema-network.com/participer-spogomi",
    verifiedAt: SPOGOMI_EDITORIAL_VERIFIED_AT,
  },
];

export const SPOGOMI_HISTORICAL_EXAMPLES: SpogomiHistoricalExample[] = [
  {
    id: "nice-2024",
    copyKey: "rulesHistoricalExampleNice",
    sourceUrl: "https://www.artema-network.com/spogomi-nice",
    sourceLabel: "ARTEMA — SPOGOMI Nice",
    additionalSources: [
      {
        href: "https://www.artema-network.com/evenements-passes",
        label: { fr: "ARTEMA — bilan des événements passés", en: "ARTEMA — past events report" },
      },
    ],
    verifiedAt: SPOGOMI_EDITORIAL_VERIFIED_AT,
  },
  {
    id: "paris-2025-semifinal",
    copyKey: "rulesHistoricalExampleParis",
    sourceUrl: "https://www.artema-network.com/ja/about-1-1",
    sourceLabel: "ARTEMA — demi-finale Paris",
    verifiedAt: SPOGOMI_EDITORIAL_VERIFIED_AT,
  },
  {
    id: "bobigny-2025-final",
    copyKey: "rulesHistoricalExampleBobigny",
    sourceUrl: "https://en.nf-spogomiwc.com/country/france/",
    sourceLabel: "SPOGOMI World Cup — France",
    verifiedAt: SPOGOMI_EDITORIAL_VERIFIED_AT,
  },
];

export const SPOGOMI_INTERNATIONAL_NEWS: SpogomiInternationalNews[] = [
  {
    id: "world-cup-2027-40-countries",
    title: {
      fr: "40 pays et régions annoncés pour la SPOGOMI World Cup 2027.",
      en: "40 countries and regions announced for The Nippon Foundation SPOGOMI World Cup 2027.",
    },
    sourceLabel: "SPOGOMI World Cup",
    publishedAt: "2026-11-05",
    href: "https://en.nf-spogomiwc.com/wp-content/uploads/sites/2/2026/11/confirmed-in-40-countries-and-regions.pdf",
    state: "confirmed",
  },
  {
    id: "federation-2026-09-09",
    title: {
      fr: "La fédération publie une nouvelle actualité sur le mouvement SPOGOMI.",
      en: "The federation publishes a new update about the SPOGOMI movement.",
    },
    sourceLabel: "SPOGOMI Federation",
    publishedAt: "2026-09-09",
    href: "https://spogomi.or.jp/news/",
    state: "confirmed",
  },
  {
    id: "world-cup-2027",
    title: {
      fr: "La prochaine World Cup est annoncée pour 2027, sous réserve des confirmations officielles.",
      en: "The next World Cup is announced for 2027, pending official confirmations.",
    },
    sourceLabel: "SPOGOMI World Cup",
    publishedAt: "2026-07-28",
    href: "https://en.nf-spogomiwc.com/",
    state: "planned",
  },
];

export const SPOGOMI_EXTERNAL_EVENTS: SpogomiExternalEvent[] = [
  {
    id: "world-cup-2027-japan",
    name: { fr: "SPOGOMI World Cup 2027", en: "SPOGOMI World Cup 2027" },
    country: { fr: "Japon", en: "Japan" },
    place: { fr: "Japon", en: "Japan" },
    period: { fr: "Octobre 2027 — date précise à confirmer", en: "October 2027 — exact date to be confirmed" },
    year: 2027,
    state: "planned",
    sourceUrl: "https://en.nf-spogomiwc.com/",
    sourceLabel: "SPOGOMI World Cup",
    verifiedAt: SPOGOMI_EDITORIAL_VERIFIED_AT,
    cleanMyMapEventId: null,
  },
  {
    id: "world-cup-2027-france",
    name: { fr: "Qualification française World Cup 2027", en: "World Cup 2027 France qualifier" },
    country: { fr: "France", en: "France" },
    place: { fr: "Lieu à confirmer", en: "Location to be confirmed" },
    period: { fr: "5 juin 2027 — lieu à confirmer", en: "June 5, 2027 — location to be confirmed" },
    year: 2027,
    state: "date_set",
    sourceUrl: "https://en.nf-spogomiwc.com/country/france/",
    sourceLabel: "SPOGOMI World Cup — France",
    verifiedAt: SPOGOMI_EDITORIAL_VERIFIED_AT,
    cleanMyMapEventId: null,
  },
];

export function filterSpogomiExternalEvents(
  events: SpogomiExternalEvent[],
  filters: { year?: number | null; country?: string | null },
): SpogomiExternalEvent[] {
  return events.filter((event) => {
    const matchesYear = filters.year == null || event.year === filters.year;
    const matchesCountry = !filters.country || event.country.fr === filters.country;
    return matchesYear && matchesCountry;
  });
}
