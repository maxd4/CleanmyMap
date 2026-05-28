import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EXPLORER_ROUTE } from "@/lib/accueil-pilotage-routes";

export const metadata: Metadata = {
  title: "CleanMyMap | Urban Cleanup & Environmental Action Platform",
  description:
    "CMM: the cleanliness map for Paris and France. Report pollution, organize cleanwalks, declare your cleanup actions. Join 10,000+ volunteers for a cleaner city. Ecology, sustainable development, citizen action.",
  keywords: [
    "CleanMyMap",
    "CMM",
    "cleanwalk",
    "urban cleanup",
    "pollution reporting",
    "environmental action",
    "Paris",
    "citizen engagement",
    "sustainable development",
    "volunteer",
    "litter collection",
    "urban cleanliness",
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
    siteName: "CleanMyMap - Urban Cleanup",
    title: "CleanMyMap - Urban Cleanup & Environmental Action",
    description:
      "The citizen platform for urban cleanup. Report, clean, act for the environment. Sustainable development, volunteer action, community coordination.",
    images: [
      {
        url: "/brand/nouveau-logo.png",
        width: 1200,
        height: 630,
        alt: "CleanMyMap - Urban cleanup map and cleanwalks - Ecology",
      },
    ],
  },
};

export default function EnglishHomePage() {
  redirect(EXPLORER_ROUTE);
}
