import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EXPLORER_ROUTE } from "@/lib/accueil-pilotage-routes";

export const metadata: Metadata = {
  title: "CleanMyMap | Urban Cleanup & Citizen Action",
  description:
    "CleanMyMap is a national citizen platform for urban cleanup in France. Report pollution, organize cleanwalks, and declare your cleanup actions across regions, departments, and cities. Ecology, sustainable development, citizen action.",
  keywords: [
    "CleanMyMap",
    "CMM",
    "cleanwalk",
    "urban cleanup",
    "pollution reporting",
    "environmental action",
    "France",
    "citizen engagement",
    "sustainable development",
    "volunteer",
    "litter collection",
    "urban cleanliness",
    "region",
    "department",
    "city",
  ],
  alternates: {
    canonical: "/en",
    languages: {
      "fr-FR": "/",
      "en-US": "/en",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/en",
    siteName: "CleanMyMap",
    title: "CleanMyMap - Urban cleanup & citizen action",
    description:
      "The national citizen platform for urban cleanup in France. Report pollution, organize cleanwalks, and act for the environment. Sustainable development, volunteer action, community coordination.",
    images: [
      {
        url: "/brand/nouveau-logo.svg",
        width: 1200,
        height: 630,
        alt: "CleanMyMap - Urban cleanup map and cleanwalks in France",
      },
    ],
  },
};

export default function EnglishHomePage() {
  redirect(EXPLORER_ROUTE);
}
