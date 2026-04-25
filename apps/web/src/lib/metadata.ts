import type { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cleanmymap.fr";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "CleanMyMap | Cartographie Citoyenne et Dépollution Urbaine",
    template: "%s | CleanMyMap - Agir pour l'environnement",
  },
  description:
    "La plateforme citoyenne pour cartographier la pollution, organiser des collectes de déchets et coordonner les actions de dépollution bénévole en France.",
  keywords: [
    "CleanMyMap",
    "dépollution urbaine",
    "cartographie citoyenne",
    "collecte de déchets",
    "écologie participative",
    "signalement pollution",
    "bénévolat environnement",
    "nettoyage planète",
  ],
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
    siteName: "CleanMyMap - Protection de l'environnement",
    title: "CleanMyMap | Cartographie Citoyenne et Dépollution",
    description:
      "Rejoignez le mouvement : signalez les points noirs de pollution et participez à des actions de nettoyage collectif partout en France.",
    images: [
      {
        url: "/brand/nouveau-logo.png",
        width: 1200,
        height: 630,
        alt: "CleanMyMap - Agir ensemble pour une ville propre",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CleanMyMap - L'appli pour dépolluer nos villes",
    description:
      "Plateforme de coordination pour les bénévoles engagés dans la dépollution urbaine.",
    images: ["/brand/nouveau-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
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

export default metadata;
