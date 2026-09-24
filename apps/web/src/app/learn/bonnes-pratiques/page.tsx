import type { Metadata } from "next";
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
        <div className="space-y-2">
          <h1 className="cmm-page-header-title text-slate-950">Bonnes pratiques</h1>
          <p className="cmm-page-header-subtitle text-slate-700">Lecture progressive</p>
          <p className="cmm-text-body max-w-3xl">
            Repères concrets pour trier, composter et réduire les déchets au quotidien.
          </p>
        </div>
      }
    />
  );
}
