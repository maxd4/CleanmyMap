import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import LearnBonnesPratiquesClient from "./client";

export const metadata: Metadata = buildPageMetadata("/learn/bonnes-pratiques", {
  title: "Bonnes pratiques",
  description:
    "Repères concrets pour trier, composter et réduire les déchets au quotidien.",
  robots: { index: true, follow: true },
});

export default function LearnBonnesPratiquesPage() {
  return <LearnBonnesPratiquesClient />;
}
