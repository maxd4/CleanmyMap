import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SectionRenderer } from "@/components/sections/rubriques/section-renderer";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import {
  getSectionRubriqueById,
  getSectionRouteParams,
} from "@/lib/sections-registry";
import { getSectionClerkAccessMode } from "@/lib/clerk-access";
import { getServerLocale } from "@/lib/server-preferences";

type SectionPageProps = {
  params: Promise<{ sectionId: string }>;
};

export function generateStaticParams() {
  return getSectionRouteParams();
}

export async function generateMetadata({
  params,
}: SectionPageProps): Promise<Metadata> {
  const { sectionId } = await params;
  const normalizedSectionId = sectionId.toLowerCase();
  const section =
    normalizedSectionId === "guide"
      ? getSectionRubriqueById("weather")
      : getSectionRubriqueById(normalizedSectionId);

  if (!section) {
    return {
      title: "Section introuvable - CleanMyMap",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const locale = await getServerLocale();
  const accessMode = getSectionClerkAccessMode(section.id);
  const localizedLabel = locale === "fr" ? section.label.fr : section.label.en;
  const localizedDescription =
    locale === "fr" ? section.description.fr : section.description.en;
  const isIndexable =
    accessMode === "visible" &&
    section.availability === "available" &&
    section.implementation === "finalized";

  return {
    title: `${localizedLabel} | CleanMyMap`,
    description: localizedDescription,
    robots: {
      index: isIndexable,
      follow: isIndexable,
    },
  };
}

export default async function SectionPage({ params }: SectionPageProps) {
  const { sectionId } = await params;

  if (sectionId === "dm") {
    redirect("/sections/messagerie?tab=dm");
  }

  if (sectionId === "guide") {
    redirect("/sections/weather");
  }

  const section = getSectionRubriqueById(sectionId);

  if (!section) {
    notFound();
  }

  const accessMode = getSectionClerkAccessMode(section.id);
  const { userId } = await getSafeAuthSession();

  if (!userId && accessMode === "blur") {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        lockedPreview={<SectionRenderer section={section} />}
      >
        <SectionRenderer section={section} />
      </ClerkRequiredGate>
    );
  }

  if (!userId && accessMode === "disabled") {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="disabled"
      >
        <SectionRenderer section={section} />
      </ClerkRequiredGate>
    );
  }

  return <SectionRenderer section={section} />;
}
