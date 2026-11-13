import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

import { EnvironmentalPolicyExplorer } from "./environmental-policy-explorer";
import { ENVIRONMENTAL_POLICY_REGISTRY, getPublishedEnvironmentalPolicies } from "@/lib/learning/policies/environmental-policy-registry";

const reviewed = (record: (typeof ENVIRONMENTAL_POLICY_REGISTRY)[number]) => ({
  ...record,
  reviewStatus: "verified" as const,
  lastVerifiedAt: "2026-11-13",
  validation: { ...record.validation, status: "published" as const, lastReviewedAt: "2026-11-13", reviewedBy: "Human editor" },
  milestones: record.milestones.map((milestone) => ({ ...milestone, verificationStatus: milestone.verificationStatus === "needs_review" ? "verified" as const : milestone.verificationStatus })),
});

describe("EnvironmentalPolicyExplorer", () => {
  it("renders the priority world view, filters and the honest empty state", () => {
    const markup = renderToStaticMarkup(<EnvironmentalPolicyExplorer publishedPolicies={[]} />);

    expect(markup).toContain("Politiques environnementales");
    expect(markup).toContain("Monde");
    expect(markup).toContain("France");
    expect(markup).toContain("Rechercher");
    expect(markup).toContain("État juridique");
    expect(markup).toContain("couverture est initiale et non exhaustive");
    expect(markup).toContain("Sources consultées le 13 novembre 2026");
    expect(markup).toContain("Aucune fiche publiée pour le moment.");
    expect(markup).toContain("revue humaine effective");
  });

  it("renders records supplied by the server boundary", () => {
    const record = ENVIRONMENTAL_POLICY_REGISTRY.find((candidate) => candidate.id === "eu-packaging-packaging-waste-regulation")!;
    const publishedPolicies = getPublishedEnvironmentalPolicies([reviewed(record)]);
    const markup = renderToStaticMarkup(<EnvironmentalPolicyExplorer publishedPolicies={publishedPolicies} />);

    expect(markup).toContain(record.title.fr);
    expect(markup).toContain(record.measure.fr);
    expect(markup).not.toContain("Aucune fiche publiée pour le moment.");
  });

  it("does not import the registry or select publication in the client component", () => {
    const source = readFileSync(new URL("./environmental-policy-explorer.tsx", import.meta.url), "utf8");

    expect(source).not.toMatch(/import\s+\{[^}]*ENVIRONMENTAL_POLICY_REGISTRY/);
    expect(source).not.toContain("getPublishedEnvironmentalPolicies");
  });
});
