import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import LearnComprendrePageContent from "./client";

export const metadata: Metadata = buildPageMetadata("/learn/comprendre", {
  title: "Vulgarisation",
  description:
    "Repères scientifiques, ordres de grandeur et méthodologie pour comprendre l'impact environnemental avant d'agir.",
  robots: { index: true, follow: true },
});

// The editorial guide is public, stable and contains no user-scoped server data.
export const revalidate = 86400;

export default function LearnVulgarisationPage() {
  return <LearnComprendrePageContent />;
}
