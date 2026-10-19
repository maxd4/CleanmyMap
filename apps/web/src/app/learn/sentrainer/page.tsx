import type { Metadata } from "next";
import { LearnLocalizedHeading } from "@/components/learn/learn-localized-heading";
import { buildPageMetadata } from "@/lib/metadata";
import LearnSentrainerClient from "./client";

export const metadata: Metadata = buildPageMetadata("/learn/sentrainer", {
  title: "S'entraîner",
  description:
    "Sessions courtes et questions mélangées pour ancrer les repères écologiques.",
  robots: { index: true, follow: true },
});

export default function LearnSentrainerPage() {
  return (
    <LearnSentrainerClient
      staticIntro={
        <LearnLocalizedHeading fr="S’entraîner" en="Practice" />
      }
    />
  );
}
