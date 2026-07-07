import { Answer, Locale } from "./recycling-assistant.types";

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function includesAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => text.includes(normalizeText(pattern)));
}

export function localizedAnswer(locale: Locale, frAnswer: Answer, enAnswer: Answer): Answer {
  return locale === "fr" ? frAnswer : enAnswer;
}

export const QUICK_PROMPTS: Record<Locale, string[]> = {
  fr: [
    "ampoule usagée",
    "cartouche d'encre vide",
    "chaussures usées",
    "mégot",
    "carton gras de pizza",
    "déchets alimentaires / compost",
  ],
  en: [
    "used light bulb",
    "empty ink cartridge",
    "worn-out shoes",
    "cigarette butt",
    "greasy pizza box",
    "food scraps / compost",
  ],
};

export const batteryKeywords = [
  "pile",
  "piles",
  "batterie",
  "batteries",
  "accu",
  "accus",
  "battery",
  "batteries",
  "power bank",
];

export const ampouleKeywords = [
  "ampoule",
  "ampoules",
  "lampe",
  "lampes",
  "neon",
  "neons",
  "néon",
  "néons",
  "tube fluorescent",
  "tubes fluorescents",
  "fluorescent",
  "led",
  "ampoule led",
  "ampoules led",
];

export const cartridgeKeywords = [
  "cartouche",
  "cartouches",
  "cartouche d encre",
  "cartouche d'encre",
  "cartouche encre",
  "toner",
  "toners",
  "cartouche imprimante",
  "cartouches imprimante",
];

export const shoeKeywords = [
  "chaussure",
  "chaussures",
  "basket",
  "baskets",
  "sneaker",
  "sneakers",
  "bottine",
  "bottines",
  "botte",
  "bottes",
  "sandale",
  "sandales",
];

export const megotKeywords = [
  "megot",
  "megots",
  "mégot",
  "mégots",
  "cigarette",
  "cigarettes",
  "tabac",
];

export const greasyCardboardKeywords = [
  "carton gras",
  "carton graisse",
  "carton graisseux",
  "carton de pizza",
  "boite a pizza",
  "boîte à pizza",
  "pizza box",
  "boite a tacos",
  "boîte à tacos",
];

export const foodWasteKeywords = [
  "dechets alimentaires",
  "déchets alimentaires",
  "biodéchets",
  "biodechets",
  "compost",
  "compostage",
  "restes alimentaires",
  "epluchures",
  "épluchures",
  "nourriture",
  "marc de cafe",
  "marc de café",
];

export const dedicatedCollectionKeywords = [
  "textile",
  "textiles",
  "vetement",
  "vêtement",
  "vêtements",
  "deee",
  "petit electro",
  "petit électro",
  "medicament",
  "médicament",
  "medicaments",
  "médicaments",
];

export const decheterieKeywords = [
  "decheterie",
  "déchèterie",
  "dechetterie",
  "déchetterie",
  "meuble",
  "matelas",
  "canape",
  "canapé",
  "armoire",
  "chaise",
  "table",
  "bureau",
  "gros electro",
  "gros électro",
  "electromenager",
  "électroménager",
  "frigo",
  "lave linge",
  "lavage linge",
  "tele",
  "télé",
  "tv",
  "ecran",
  "écran",
  "gravat",
  "gravats",
  "peinture",
  "solvant",
  "huile",
  "aerosol",
  "aérosol",
];

export const glassKeywords = [
  "verre",
  "bocal",
  "bocaux",
  "bouteille en verre",
  "pot en verre",
  "pots en verre",
];

export const packagingKeywords = [
  "bouteille plastique",
  "bouteille en plastique",
  "canette",
  "carton",
  "papier",
  "boite a chaussures",
  "boite de chaussures",
  "boîte à chaussures",
  "shoe box",
  "emballage",
  "packaging",
  "barquette",
  "flacon",
];

export const reportKeywords = [
  "dans ma rue",
  "dans-ma-rue",
  "dansmarue",
  "declarer",
  "déclarer",
  "signalement",
  "report",
  "application",
];

export const publicSpaceKeywords = [
  "rue",
  "trottoir",
  "route",
  "parc",
  "square",
  "allee",
  "allée",
  "voirie",
  "espace public",
  "depot sauvage",
  "dépôt sauvage",
  "corbeille",
  "poubelle publique",
  "mobilier",
  "encombrant",
];
