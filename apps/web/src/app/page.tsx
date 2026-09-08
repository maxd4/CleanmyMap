import {
  HomeHero,
  HomeNavigationSchema,
  HomeCommunityCredibility,
} from "@/components/accueil";
import {
  formatLandingOverviewErrorMessage,
  loadLandingSummary,
} from "@/lib/accueil/data";
import { HOME_ROUTE } from "@/lib/home-routes";
import {
  buildHomeMetrics,
  type HomeCounters,
} from "@/lib/accueil/config";
import type { Metadata } from "next";
import { metadata as appMetadata } from "@/lib/metadata";

// Stable landing content is regenerated hourly; recent activity refreshes independently.
export const revalidate = 3600;

export const metadata: Metadata = {
  ...appMetadata,
  title: "CleanMyMap - Carte de dépollution citoyenne & actions écologiques",
  description:
    "CleanMyMap est la carte citoyenne de dépollution urbaine en France. Signalez les pollutions, organisez des cleanwalks et déclarez vos actions de nettoyage. Développement durable, bénévolat, impact terrain, valorisation des déchets.",
  keywords: [
    ...(appMetadata.keywords ?? []),
    "cleanmymap",
    "cmm",
    "depollution",
    "proprete",
    "france",
    "cleanwalk",
    "carte",
    "signalement",
    "dechets",
    "benevole",
    "nettoyage",
    "environnement",
    "ecologie",
    "developpement durable",
    "action citoyenne",
    "impact terrain",
    "coordination",
    "mutualisation",
    "partenariat",
    "entraide",
    "solidarite",
    "valorisation dechets",
    "recyclage",
    "economie circulaire",
    "zero dechet",
    "collecte populaire",
    "operation proprete",
    "engagement citoyen",
    "region",
    "departement",
    "commune",
  ],
  openGraph: {
    ...appMetadata.openGraph,
    title: "CleanMyMap - Carte de dépollution citoyenne & actions écologiques",
    description:
      "La carte citoyenne de dépollution urbaine partout en France. Signalez, nettoyez, agissez pour l'environnement. Bénévolat, écologie, impact terrain.",
    url: HOME_ROUTE,
    siteName: "CleanMyMap",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/brand/logo-cleanmymap.svg",
        width: 1200,
        height: 630,
        alt: "CleanMyMap - Carte de dépollution citoyenne et cleanwalks en France",
      },
    ],
  },
  twitter: {
    ...appMetadata.twitter,
    card: "summary_large_image",
    title: "CleanMyMap - Dépollution citoyenne & actions écologiques",
    description:
      "La carte citoyenne de dépollution urbaine partout en France - Bénévolat, écologie, impact terrain",
    images: ["/brand/logo-cleanmymap.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function HomePage() {
  let landingSummary = null;
  let overviewLoadError: string | null = null;
  try {
    landingSummary = await loadLandingSummary();
  } catch (error) {
    overviewLoadError = formatLandingOverviewErrorMessage(error);
  }

  const counters: HomeCounters = landingSummary
    ? landingSummary.counters
    : {
        wasteKg: 0,
        butts: 0,
        volunteers: 0,
        co2AvoidedKg: 0,
        waterSavedLiters: 0,
        euroSaved: 0,
      };

  const hasOverviewData = Boolean(landingSummary);
  const metrics = buildHomeMetrics(
    counters,
    hasOverviewData,
    landingSummary?.participantsTotal,
  );
  const impactSnapshot = landingSummary
    ? {
        participantsTotal: landingSummary.participantsTotal,
        actionDistribution: landingSummary.actionDistribution,
        impactTerrain: landingSummary.impactTerrain,
        streetCleaningSavings: landingSummary.streetCleaningSavings,
      }
    : null;
  const communityActivity = landingSummary?.activity ?? {
    visibleActions: 0,
    distinctLocations: 0,
    items: [],
  };
  const communityActivityError =
    overviewLoadError ??
    (landingSummary?.dataAvailability.status === "partial"
      ? "Les données d’activité sont partiellement disponibles."
      : null);
  return (
    <main
      data-homepage-canvas
      className="relative isolate -mx-2 min-h-screen min-w-0 w-[calc(100%+1rem)] overflow-hidden bg-[radial-gradient(circle_at_78%_14%,rgba(167,139,250,0.18),transparent_24%),radial-gradient(circle_at_18%_57%,rgba(245,158,11,0.1),transparent_22%),radial-gradient(circle_at_82%_79%,rgba(16,185,129,0.14),transparent_30%),linear-gradient(180deg,#005743_0%,#087958_16%,#1ea876_28%,#75d3ad_37%,#c8f2df_50%,#f1fbf5_67%,#f7fcf8_84%,#edf8f1_100%)] font-sans text-[#082f24] [zoom:0.9] sm:-mx-4 sm:w-[calc(100%+2rem)]"
    >
      <div className="pointer-events-none absolute -right-28 top-24 h-96 w-96 rounded-full bg-violet-300/20 blur-[120px]" />
      <div className="pointer-events-none absolute -left-40 top-[39rem] h-[28rem] w-[28rem] rounded-full bg-amber-200/20 blur-[130px]" />
      <div className="pointer-events-none absolute right-[-12rem] top-[76rem] h-[34rem] w-[34rem] rounded-full bg-emerald-200/30 blur-[150px]" />
      <div className="relative z-10 min-w-0">
        <HomeHero
          metrics={metrics}
          impactSnapshot={impactSnapshot}
        />
        <HomeNavigationSchema />
        <HomeCommunityCredibility
          activity={communityActivity}
          errorMessage={communityActivityError}
        />
      </div>
    </main>
  );
}
