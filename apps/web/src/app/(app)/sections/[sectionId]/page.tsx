import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/sections/section-renderer";
import { getSectionRouteParams, isSectionRouteEnabled, normalizeSectionId } from "@/lib/sections-registry";

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

  return <SectionRenderer sectionId={normalizedSectionId} />;
}
