import type { Metadata } from "next";
import { LearnLocalizedHeading } from "@/components/learn/learn-localized-heading";
import LearnBonnesPratiquesClient from "./client";

export const metadata: Metadata = {
  title: "Bonnes pratiques",
  description:
    "Repères concrets pour trier, composter et réduire les déchets au quotidien.",
  alternates: { canonical: "/learn/bonnes-pratiques" },
  robots: { index: true, follow: true },
};

export default function LearnBonnesPratiquesPage() {
  return (
    <LearnBonnesPratiquesClient
      staticIntro={
        <LearnLocalizedHeading fr="Bonnes pratiques" en="Good practices" />
      }
    />
  );
}
