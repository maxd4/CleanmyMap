import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import { ENVIRONMENTAL_POLICY_REGISTRY, getPublishedEnvironmentalPolicies } from "@/lib/learning/policies/environmental-policy-registry";
import { getPublicPresidentialArchive } from "@/lib/learning/policies/presidential-environmental-corpus";
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
  const publishedPolicies = getPublishedEnvironmentalPolicies(ENVIRONMENTAL_POLICY_REGISTRY);
  const presidentialArchive = getPublicPresidentialArchive();

  return <LearnComprendrePageContent publishedPolicies={publishedPolicies} presidentialArchive={presidentialArchive} />;
}
