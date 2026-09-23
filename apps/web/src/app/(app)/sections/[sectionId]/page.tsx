import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SectionRenderer } from "@/components/sections/rubriques/section-renderer";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { env } from "@/lib/env";
import {
  getSectionRubriqueById,
  getSectionRouteParams,
} from "@/lib/sections-registry";
import { getServerLocale } from "@/lib/server-preferences";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";
import {
  buildLegacyJoinActionRedirect,
  CANONICAL_JOIN_ACTION_SECTION_ID,
  LEGACY_JOIN_FORM_ROUTE,
} from "@/lib/sections/join-action-routes";
import { buildActionCreationPanelHref } from "@/lib/actions/action-creation-routes";

type SectionPageProps = {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return getSectionRouteParams();
}

export async function generateMetadata({
  params,
}: SectionPageProps): Promise<Metadata> {
  const { sectionId } = await params;
  const normalizedSectionId = sectionId.toLowerCase();
  const metadataSectionId = normalizedSectionId === LEGACY_JOIN_FORM_ROUTE.split("/").at(-1)
    ? CANONICAL_JOIN_ACTION_SECTION_ID
    : normalizedSectionId;
  const section =
    metadataSectionId === "guide"
      ? getSectionRubriqueById("weather")
      : getSectionRubriqueById(metadataSectionId);

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
  const accessMode = section.anonymousPresentation;
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

export default async function SectionPage({ params, searchParams }: SectionPageProps) {
  const { sectionId } = await params;
  const normalizedSectionId = sectionId.toLowerCase();

  if (normalizedSectionId === LEGACY_JOIN_FORM_ROUTE.split("/").at(-1)) {
    redirect(buildLegacyJoinActionRedirect(await searchParams));
  }

  if (sectionId === "dm") {
    redirect("/sections/messagerie?tab=dm");
  }

  if (normalizedSectionId === "guide" || normalizedSectionId === "weather") {
    redirect(
      buildActionCreationPanelHref(
        "meteo",
        await searchParams,
      ),
    );
  }

  const section = getSectionRubriqueById(sectionId);

  if (!section) {
    notFound();
  }

  const accessMode = section.anonymousPresentation;
  const sectionSearchParams = await searchParams;
  const returnQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(sectionSearchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) returnQuery.append(key, item);
    } else if (value !== undefined) {
      returnQuery.set(key, value);
    }
  }
  const sectionReturnRoute = `/sections/${section.id}${returnQuery.size ? `?${returnQuery}` : ""}`;
  const signInHref = buildSignInRedirectHref(sectionReturnRoute);
  const fundingOnParticipeUrl =
    section.id === "funding" || section.id === "open-data"
      ? env.FUNDING_ONPARTICIPE_URL
      : undefined;
  const { userId } = await getSafeAuthSession();

  if (!userId && accessMode === "blur") {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        signInHref={signInHref}
        lockedPreview={<SectionRenderer section={section} fundingOnParticipeUrl={fundingOnParticipeUrl} />}
      >
        <SectionRenderer section={section} fundingOnParticipeUrl={fundingOnParticipeUrl} />
      </ClerkRequiredGate>
    );
  }

  if (!userId && accessMode === "disabled") {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="disabled"
        signInHref={signInHref}
      >
        <SectionRenderer section={section} fundingOnParticipeUrl={fundingOnParticipeUrl} />
      </ClerkRequiredGate>
    );
  }

  return <SectionRenderer section={section} fundingOnParticipeUrl={fundingOnParticipeUrl} />;
}
