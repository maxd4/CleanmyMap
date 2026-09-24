import type { Metadata } from "next";
import { getServerLocale } from "@/lib/server-preferences";
import LearnSentrainerClient from "./client";

export const metadata: Metadata = {
  title: "S'entraîner",
  description:
    "Sessions courtes et questions mélangées pour ancrer les repères écologiques.",
  alternates: { canonical: "/learn/sentrainer" },
  robots: { index: true, follow: true },
};

export default async function LearnSentrainerPage() {
  const locale = await getServerLocale();
  return (
    <LearnSentrainerClient
      staticIntro={
        <h1 className="cmm-page-header-title text-slate-950">
          {locale === "fr" ? "S’entraîner" : "Practice"}
        </h1>
      }
    />
  );
}
