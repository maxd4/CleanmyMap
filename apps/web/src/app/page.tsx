import {
  HomeHero,
  HomeNavigationSchema,
  HomeCommunityCredibility,
} from "@/components/accueil";
import {
  buildHomeCommunityActivity,
  computeLandingCounters,
  formatLandingOverviewErrorMessage,
  loadLandingOverview,
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
  let overview = null;
  let overviewLoadError: string | null = null;
  try {
    overview = await loadLandingOverview();
  } catch (error) {
    overviewLoadError = formatLandingOverviewErrorMessage(error);
  }
  const floor = new Date();
  floor.setUTCDate(floor.getUTCDate() - 365);
  const floorDate = floor.toISOString().slice(0, 10);

  const counters: HomeCounters = overview
    ? computeLandingCounters(overview.contracts, floorDate)
    : {
        wasteKg: 0,
        butts: 0,
        volunteers: 0,
        co2AvoidedKg: 0,
        waterSavedLiters: 0,
        euroSaved: 0,
      };

  const hasOverviewData = Boolean(overview);
  const metrics = buildHomeMetrics(counters, hasOverviewData);
  const communityActivity = buildHomeCommunityActivity(
    overview?.contracts ?? [],
    floorDate,
  );
  return (
    <main className="relative min-h-screen overflow-hidden font-sans">
      <div className="relative z-10">
        <HomeHero metrics={metrics} />
        <HomeNavigationSchema />
        <HomeCommunityCredibility
          activity={communityActivity}
          errorMessage={overviewLoadError}
        />
      </div>
    </main>
  );
}
