import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/sections/section-renderer";
import {
  getSectionRouteParams,
  isSectionRouteEnabled,
  normalizeSectionId,
} from "@/lib/sections-registry";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { toProfile } from "@/lib/profiles";
import { isSectionAllowedForProfile } from "@/lib/navigation";

type SectionPageProps = {
  params: Promise<{ sectionId: string }>;
};

export function generateStaticParams() {
  return getSectionRouteParams();
}

export default async function SectionPage({ params }: SectionPageProps) {
  const { sectionId } = await params;
  const normalizedSectionId = normalizeSectionId(sectionId);

  if (!isSectionRouteEnabled(normalizedSectionId)) {
    notFound();
  }

  // Guard: vérifier que la section est autorisée pour le profil de l'utilisateur.
  const activeRole = await getCurrentUserRoleLabel();
  const activeProfile = toProfile(activeRole);
  if (!isSectionAllowedForProfile(normalizedSectionId, activeProfile)) {
    notFound();
  }

  return <SectionRenderer sectionId={normalizedSectionId} />;
}
