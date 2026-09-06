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

// The landing page can be regenerated periodically while still showing fresh counters.
export const revalidate = 300;

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
  const metrics = buildHomeMetrics(counters, hasOverviewData);
  const communityActivity = landingSummary?.activity ?? {
    visibleActions: 0,
    distinctLocations: 0,
    items: [],
  };
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[radial-gradient(circle_at_72%_10%,rgba(196,181,253,0.42),transparent_24%),radial-gradient(circle_at_32%_48%,rgba(110,231,183,0.52),transparent_34%),linear-gradient(135deg,#005743_0%,#0a936b_42%,#b9f3dc_100%)] font-sans text-[#082f24]">
      <div className="pointer-events-none absolute -right-28 top-24 h-96 w-96 rounded-full bg-violet-300/30 blur-[100px]" />
      <div className="pointer-events-none absolute -left-40 top-[34rem] h-96 w-96 rounded-full bg-emerald-200/45 blur-[110px]" />
      <div className="relative z-10">
        <HomeHero
          metrics={metrics}
          counters={counters}
          actionCount={communityActivity.visibleActions}
        />
        <HomeNavigationSchema />
        <HomeCommunityCredibility
          activity={communityActivity}
          errorMessage={overviewLoadError}
        />
      </div>
    </main>
  );
}
