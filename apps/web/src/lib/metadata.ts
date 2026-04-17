import type { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cleanmymap.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "CleanMyMap | Plateforme bénévoles de dépollution",
    template: "%s | CleanMyMap",
  },
  description:
    "Plateforme citoyenne pour signaler, déclarer et coordonner les actions de dépollution urbaine.",
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
    siteName: "CleanMyMap",
    title: "CleanMyMap | Agir contre la pollution urbaine",
    description:
      "Signalez les points noirs, déclarez vos actions et pilotez votre impact collectif.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CleanMyMap",
    description:
      "Plateforme bénévoles pour la dépollution urbaine et la coordination terrain.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default metadata;
