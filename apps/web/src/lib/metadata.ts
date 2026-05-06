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
  "Paris",
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
  "dépollution urbaine Paris",
  "propreté Paris",
  "carte pollution Paris",
  "cleanwalk Paris",
  "collecte déchets bénévole",
  "signalement détritus",
  "action nettoyage urbain",
  "carte propreté",
  "dépollution citoyenne",
  "nettoyage streets Paris",
];

const KEYWORDS_COMMUNITY_SPECIFIC = [
  "bénévolat environnement",
  "collecte déchets Paris",
  "action écologie Paris",
  "citoyen engagé propreté",
  "community cleanup",
  "volontaire nettoyage",
];

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "CleanMyMap | Dépollution Urbaine Paris & Carte Propréte",
    template: "%s | CleanMyMap - Cleanwalk Paris",
  },
  description:
    "CMM : la carte de propreté Paris. Signalez les pollutions, organisez des cleanwalks, declarez vos actions de depollution. Rejoignez 10 000+ benevoles pour une ville plus propre. Ecologie, developpement durable, action citoyenne.",
  keywords: [
    ...KEYWORDS_BASE,
    ...KEYWORDS_ECO,
    ...KEYWORDS_ACTION,
    ...KEYWORDS_COMMUNITY,
    ...KEYWORDS_CLEANUP,
    ...KEYWORDS_COMMUNITY_SPECIFIC,
    "carte propreté Paris",
    "dépollution Paris",
    "cleanwalk",
    "signalement déchets Paris",
    "action nettoyage Paris",
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
    siteName: "CleanMyMap - Dépollution Paris",
    title: "CleanMyMap - Carte Dépollution & Cleanwalks Paris - Écologie Action",
    description:
      "La carte citoyenne de depollution. Signalez, nettoyez, agissez pour l'environnement. Developpement durable, benevolat, action citoyenne, coordination communautaire.",
    images: [
      {
        url: "/brand/nouveau-logo.png",
        width: 1200,
        height: 630,
        alt: "CleanMyMap - Carte propreté Paris et cleanwalks - Écologie",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CleanMyMap - Dépollution Paris & Carte Propréte",
    description:
      "La carte citoyenne de depollution. Signalez, nettoyez, agissez pour l'environnement.",
    images: ["/brand/nouveau-logo.png"],
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
  manifest: "/manifest.json",
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
    observatory: ["observatoire", "carte publique", "données ouvertes", "statistiques temps reel", "impact environnemental"],
    admin: ["administration", "moderation", "gestion utilisateurs", "coordination"],
    learn: ["apprendre écologie", "bonnes pratiques", "développement durable", "formation bénévole"],
  };
  return pageKeywords[page] || KEYWORDS_BASE;
}

export default metadata;
