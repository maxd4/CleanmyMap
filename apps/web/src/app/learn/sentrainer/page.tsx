import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import LearnSentrainerClient from "./client";

export const metadata: Metadata = buildPageMetadata("/learn/sentrainer", {
  title: "S'entraîner",
  description:
    "Sessions courtes et questions mélangées pour ancrer les repères écologiques.",
  robots: { index: true, follow: true },
});

export default function LearnSentrainerPage() {
  return <LearnSentrainerClient />;
}
