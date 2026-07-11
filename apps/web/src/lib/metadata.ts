import type { Metadata } from "next";
import { env } from "@/lib/env";

const appUrl = env["NEXT_PUBLIC_APP_URL"] || "https://cleanmymap.fr";

const KEYWORDS_BASE = [
  "CleanMyMap",
  "dépollution urbaine",
  "cleanwalk",
  "carte citoyenne",
  "signalement de déchets",
  "action écologique",
  "France",
];

const KEYWORDS_ECO = [
  "écologie",
  "développement durable",
  "environnement",
  "transition écologique",
  "impact environnemental",
  "économie circulaire",
];

const KEYWORDS_ACTION = [
  "action citoyenne",
  "bénévolat",
  "collecte de déchets",
  "nettoyage urbain",
  "participation citoyenne",
];

const KEYWORDS_COMMUNITY = [
  "communauté",
  "coordination",
  "partenariat",
  "entraide",
  "valorisation des déchets",
];

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "CleanMyMap | Carte citoyenne de dépollution urbaine",
    template: "%s | CleanMyMap",
  },
  description:
    "CleanMyMap est la plateforme citoyenne de dépollution urbaine en France. Signalez les pollutions, organisez des cleanwalks et suivez vos actions de nettoyage avec une carte claire et des résultats mesurables.",
  keywords: [
    ...KEYWORDS_BASE,
    ...KEYWORDS_ECO,
    ...KEYWORDS_ACTION,
    ...KEYWORDS_COMMUNITY,
    "collecte urbaine",
    "bénévolat environnement",
    "signalement local",
    "impact terrain",
    "territoire",
  ],
  authors: [{ name: "CleanMyMap", url: appUrl }],
  creator: "CleanMyMap",
  publisher: "CleanMyMap",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: appUrl,
    languages: {
      "fr-FR": appUrl,
      "en-US": `${appUrl}/en`,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: appUrl,
    siteName: "CleanMyMap",
    title: "CleanMyMap - Carte de dépollution citoyenne",
    description:
      "La carte citoyenne de dépollution urbaine partout en France. Signalez, nettoyez et organisez vos cleanwalks avec un site distinct, clair et orienté impact.",
    images: [
      {
        url: `${appUrl}/brand/logo-cleanmymap.svg`,
        width: 1200,
        height: 630,
        alt: "CleanMyMap - Carte citoyenne de dépollution urbaine en France",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CleanMyMap - Carte citoyenne de dépollution",
    description:
      "La carte citoyenne de dépollution urbaine partout en France. Signalez, nettoyez et suivez vos actions.",
    images: [`${appUrl}/brand/logo-cleanmymap.svg`],
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
