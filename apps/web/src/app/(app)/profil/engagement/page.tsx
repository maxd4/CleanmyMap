import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import { EngagementDossierPage } from "@/components/profil/engagement/engagement-dossier-page";

export const metadata: Metadata = buildPageMetadata("/profil/engagement", {
  title: "Valoriser mon engagement",
  description:
    "Consultez vos participations bénévoles documentées et exportez un dossier Markdown privé.",
  robots: { index: false, follow: false },
});

export default function ProfilEngagementPage() {
  return <EngagementDossierPage />;
}
