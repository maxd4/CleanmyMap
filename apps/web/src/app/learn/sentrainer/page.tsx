import type { Metadata } from "next";
import LearnSentrainerClient from "./client";

export const metadata: Metadata = {
  title: "S'entraîner",
  description:
    "Sessions courtes et questions mélangées pour ancrer les repères écologiques.",
  alternates: { canonical: "/learn/sentrainer" },
  robots: { index: true, follow: true },
};

export default function LearnSentrainerPage() {
  return (
    <LearnSentrainerClient
      staticIntro={
        <div className="space-y-2">
          <h1 className="cmm-page-header-title text-slate-950">S&apos;entraîner</h1>
          <p className="cmm-page-header-subtitle text-slate-700">
            Ancrer les repères par la répétition
          </p>
          <p className="cmm-text-body max-w-3xl">
            Sessions courtes et questions mélangées pour ancrer les repères écologiques.
          </p>
        </div>
      }
    />
  );
}
