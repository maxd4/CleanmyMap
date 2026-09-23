export const FUNDING_CATEGORIES = ["equipment", "development"] as const;

export type FundingCategory = (typeof FUNDING_CATEGORIES)[number];

export type OnParticipeFundingDestination =
  | { configured: false; url: null }
  | { configured: true; url: string };

export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveOnParticipeFundingDestination(
  value: string | undefined,
): OnParticipeFundingDestination {
  const url = value?.trim();
  return url && isHttpsUrl(url)
    ? { configured: true, url }
    : { configured: false, url: null };
}

export const FUNDING_CATEGORY_LABELS: Record<FundingCategory, { fr: string; en: string }> = {
  equipment: {
    fr: "Matériel pour les actions terrain",
    en: "Equipment for field actions",
  },
  development: {
    fr: "Développement et fonctionnement",
    en: "Development and operations",
  },
};

export const FUNDING_CATEGORY_DESCRIPTIONS: Record<FundingCategory, { fr: string; en: string }> = {
  equipment: {
    fr: "Pinces, gants, sacs, pesons et balances, gilets, tri, prototypes FabLab et logistique des actions.",
    en: "Grabbers, gloves, bags, scales, vests, sorting, FabLab prototypes and field logistics.",
  },
  development: {
    fr: "Hébergement, domaine, services numériques, outils et dépenses nécessaires au développement. Le développement repose largement sur du bénévolat : chaque contribution ne rémunère pas un programmeur.",
    en: "Hosting, domain, digital services, tools and expenses needed for development. Development relies heavily on volunteering: each contribution does not pay a programmer.",
  },
};

export const FUNDING_PRESET_AMOUNTS_CENTS = [1000, 2500, 5000, 10000] as const;
export const DEFAULT_FUNDING_AMOUNT_CENTS = 2500;
export const MIN_FUNDING_AMOUNT_CENTS = 100;
export const MAX_FUNDING_AMOUNT_CENTS = 1_000_000;

export function isFundingCategory(value: unknown): value is FundingCategory {
  return typeof value === "string" && FUNDING_CATEGORIES.includes(value as FundingCategory);
}

export function formatFundingAmount(amountCents: number, locale: "fr" | "en" = "fr"): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}
