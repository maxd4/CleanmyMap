import type { Metadata } from "next";
import { env } from "@/lib/env";

const appUrl = env.NEXT_PUBLIC_APP_URL || "https://cleanmymap.fr";

const KEYWORDS_BASE = [
  "CleanMyMap",
  "CMM",
  "cleanwalk",
  "dépollution",
  "propreté",
  "carte",
  "France",
];

const KEYWORDS_ECO = [
  "écologie",
  "développement durable",
  "environnement",
  "transition écologique",
  "impact environnemental",
  "empreinte carbone",
  "zéro déchet",
  "économie circulaire",
  "ressources naturelles",
  "protection nature",
];

const KEYWORDS_ACTION = [
  "action citoyenne",
  "bénévolat",
  "engagement",
  "volontaire",
  "participation citoyenne",
  "mobilisation",
  "collecte déchets",
  "nettoyage urbain",
  "opération propreté",
  "opération nettoyage",
];

const KEYWORDS_COMMUNITY = [
  "communauté",
  "entraide",
  "coordination",
  "mutualisation",
  "partenariat",
  "collaboration",
  "solidarité",
  "terrain",
  "impact terrain",
  "valorisation déchets",
  "réemploi",
  "recyclage",
];

const KEYWORDS_CLEANUP = [
  "dépollution urbaine",
  "propreté urbaine",
  "carte pollution",
  "cleanwalk",
  "collecte déchets bénévole",
  "signalement détritus",
  "action nettoyage urbain",
  "carte propreté",
  "dépollution citoyenne",
  "nettoyage urbain",
];

const KEYWORDS_COMMUNITY_SPECIFIC = [
  "bénévolat environnement",
  "collecte déchets France",
  "action écologie",
  "citoyen engagé propreté",
  "community cleanup",
  "volontaire nettoyage",
];

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "CleanMyMap | Dépollution urbaine & carte citoyenne",
    template: "%s | CleanMyMap - Écologie & impact terrain",
  },
  description:
    "CleanMyMap est une plateforme nationale de dépollution urbaine et d'action citoyenne. Signalez les pollutions, organisez des cleanwalks et coordonnez vos actions de nettoyage partout en France. Écologie, développement durable, bénévolat et impact terrain.",
  keywords: [
    ...KEYWORDS_BASE,
    ...KEYWORDS_ECO,
    ...KEYWORDS_ACTION,
    ...KEYWORDS_COMMUNITY,
    ...KEYWORDS_CLEANUP,
    ...KEYWORDS_COMMUNITY_SPECIFIC,
    "carte propreté",
    "dépollution France",
    "cleanwalk",
    "signalement déchets",
    "action nettoyage",
    "bénévolat propreté",
    "citoyen environnement",
    "collecte urbaine",
    "impact environnemental",
    "coordination bénévolat",
    "mutualisation résultats",
    "valorisation déchets",
    "terrain écologie",
    "partenariat environnement",
    "entraide citoyenne",
    "région",
    "département",
    "commune",
  ],
  authors: [{ name: "CleanMyMap", url: "https://cleanmymap.fr" }],
  creator: "CleanMyMap",
  publisher: "CleanMyMap",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "fr-FR": "/",
      "en-US": "/en",
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/",
    siteName: "CleanMyMap - Dépollution citoyenne",
    title: "CleanMyMap - Carte de dépollution citoyenne & cleanwalks",
    description:
      "La carte citoyenne de dépollution urbaine partout en France. Signalez, nettoyez, agissez pour l'environnement. Développement durable, bénévolat, action citoyenne, coordination communautaire.",
    images: [
      {
        url: "/brand/logo-cleanmymap.svg",
        width: 1200,
        height: 630,
        alt: "CleanMyMap - Carte de dépollution citoyenne et cleanwalks en France",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CleanMyMap - Dépollution citoyenne & carte propreté",
    description:
      "La carte citoyenne de dépollution urbaine partout en France. Signalez, nettoyez, agissez pour l'environnement.",
    images: ["/brand/logo-cleanmymap.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/brand/pictogramme-cleanmymap.svg",
    apple: "/brand/pictogramme-cleanmymap.svg",
    shortcut: "/brand/pictogramme-cleanmymap.svg",
  },
  manifest: "/api/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CleanMyMap",
  },
};

export function generateSeoKeywords(page: string): string[] {
  const pageKeywords: Record<string, string[]> = {
    home: [...KEYWORDS_BASE, ...KEYWORDS_ECO, ...KEYWORDS_ACTION],
    dashboard: ["mon dashboard", "mes actions", "mon impact", "statistiques benevole", "impact terrain"],
    reports: ["rapport impact", "statistiques", "kpis depollution", "bilan propreté", "valorisation résultats"],
    admin: ["administration", "moderation", "gestion utilisateurs", "coordination"],
    learn: ["apprendre écologie", "bonnes pratiques", "développement durable", "formation bénévole"],
  };
  return pageKeywords[page] || KEYWORDS_BASE;
}

export default metadata;
