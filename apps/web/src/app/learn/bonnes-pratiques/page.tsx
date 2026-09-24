import type { Metadata } from "next";
import { getServerLocale } from "@/lib/server-preferences";
import LearnBonnesPratiquesClient from "./client";

export const metadata: Metadata = {
  title: "Bonnes pratiques",
  description:
    "Repères concrets pour trier, composter et réduire les déchets au quotidien.",
  alternates: { canonical: "/learn/bonnes-pratiques" },
  robots: { index: true, follow: true },
};

export default async function LearnBonnesPratiquesPage() {
  const locale = await getServerLocale();
  return (
    <LearnBonnesPratiquesClient
      staticIntro={
        <h1 className="cmm-page-header-title text-slate-950">
          {locale === "fr" ? "Bonnes pratiques" : "Good practices"}
        </h1>
      }
    />
  );
}
