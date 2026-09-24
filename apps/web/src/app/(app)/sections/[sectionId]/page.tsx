import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
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
  LEGACY_JOIN_FORM_ROUTE,
} from "@/lib/sections/join-action-routes";
import { buildActionCreationPanelHref } from "@/lib/actions/action-creation-routes";
import {
  PUBLIC_INDEXABLE_SECTION_IDS,
  PUBLIC_NOINDEX_SECTION_IDS,
} from "@/lib/seo/indexability";

type SectionPageProps = {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildDirectMessageRedirect(
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const query = new URLSearchParams({ tab: "dm" });
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "tab" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }
  return `/sections/messagerie?${query.toString()}`;
}

export function generateStaticParams() {
  return getSectionRouteParams();
}

export async function generateMetadata({
  params,
}: SectionPageProps): Promise<Metadata> {
  const { sectionId } = await params;
  const normalizedSectionId = sectionId.toLowerCase();
  if (
    normalizedSectionId === "dm" ||
    normalizedSectionId === "guide" ||
    normalizedSectionId === "route" ||
    normalizedSectionId === "weather" ||
    normalizedSectionId === LEGACY_JOIN_FORM_ROUTE.split("/").at(-1)
  ) {
    return {
      robots: { index: false, follow: false },
    };
  }
  const section = getSectionRubriqueById(normalizedSectionId);

  if (!section) {
    return {
      title: "Section introuvable",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const locale = await getServerLocale();
  const localizedLabel = locale === "fr" ? section.label.fr : section.label.en;
  const localizedDescription =
    locale === "fr" ? section.description.fr : section.description.en;
  const isIndexable = PUBLIC_INDEXABLE_SECTION_IDS.has(section.id);
  const isPublicNoindex = PUBLIC_NOINDEX_SECTION_IDS.has(section.id);
  const robots = isIndexable
    ? { index: true, follow: true }
    : isPublicNoindex
      ? { index: false, follow: true, nocache: true }
      : { index: false, follow: false, nocache: true };

  return {
    title: localizedLabel,
    description: localizedDescription,
    robots,
    ...(isIndexable
      ? { alternates: { canonical: `/sections/${section.id}` } }
      : {}),
  };
}

export default async function SectionPage({ params, searchParams }: SectionPageProps) {
  const { sectionId } = await params;
  const normalizedSectionId = sectionId.toLowerCase();

  if (normalizedSectionId === LEGACY_JOIN_FORM_ROUTE.split("/").at(-1)) {
    permanentRedirect(buildLegacyJoinActionRedirect(await searchParams));
  }

  if (normalizedSectionId === "dm") {
    permanentRedirect(buildDirectMessageRedirect(await searchParams));
  }

  if (normalizedSectionId === "guide" || normalizedSectionId === "weather") {
    permanentRedirect(
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
