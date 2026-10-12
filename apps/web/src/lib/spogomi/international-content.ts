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

export type SpogomiExternalEvent = {
  id: string;
  name: Record<Locale, string>;
  country: Record<Locale, string>;
  place: Record<Locale, string>;
  period: Record<Locale, string>;
  year: number;
  state: "confirmed" | "planned";
  sourceUrl: string;
  sourceLabel: string;
  verifiedAt: string;
  cleanMyMapEventId: null;
};

export const SPOGOMI_EDITORIAL_VERIFIED_AT = "2026-10-12";

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
];

export const SPOGOMI_INTERNATIONAL_NEWS: SpogomiInternationalNews[] = [
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
