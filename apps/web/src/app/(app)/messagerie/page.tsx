import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/sections/rubriques/section-renderer";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getSectionClerkAccessMode } from "@/lib/clerk-access";
import { getSectionRubriqueById } from "@/lib/sections-registry";
import { getServerLocale } from "@/lib/server-preferences";

const sectionId = "messagerie";

export async function generateMetadata(): Promise<Metadata> {
  const section = getSectionRubriqueById(sectionId);

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

export default async function MessageriePage() {
  const section = getSectionRubriqueById(sectionId);

  if (!section) {
    notFound();
  }

  const accessMode = getSectionClerkAccessMode(section.id);
  const { userId, clerkReachable } = await getSafeAuthSession();
  const locale = await getServerLocale();

  if (!userId && accessMode === "blur") {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title={locale === "fr" ? section.label.fr : section.label.en}
        description={
          locale === "fr"
            ? clerkReachable
              ? "Cette fonctionnalité nécessite une connexion Clerk."
              : "Connexion Clerk temporairement indisponible. La vue reste lisible."
            : clerkReachable
              ? "This feature requires Clerk sign-in."
              : "Clerk sign-in is temporarily unavailable. This view stays readable."
        }
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
        title={locale === "fr" ? section.label.fr : section.label.en}
        description={
          locale === "fr"
            ? "Cette vue reste lisible, mais les actions sont réservées aux comptes connectés."
            : "This view stays readable, but actions are reserved for signed-in accounts."
        }
      >
        <SectionRenderer section={section} />
      </ClerkRequiredGate>
    );
  }

  return <SectionRenderer section={section} />;
}
