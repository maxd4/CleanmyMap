import {
  HomeHero,
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  ...appMetadata,
  title: "CleanMyMap - Carte Dépollution Paris & Actions Citoyennes Écologie",
  description:
    "CMM Paris : la carte citoyenne de propreté et depollution. Signalez les pollutions, organisez des cleanwalks, declarez vos actions de nettoyage. Developpement durable, benevolat, impact terrain, valorisation des dechets.",
  keywords: [
    ...(appMetadata.keywords ?? []),
    "cleanmymap",
    "cmm",
    "depollution",
    "proprete",
    "paris",
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
  ],
  openGraph: {
    ...appMetadata.openGraph,
    title: "CleanMyMap - Carte Dépollution Paris & Actions Citoyennes Écologie",
    description:
      "La carte citoyenne de propreté Paris. Signalez, nettoyez, agissez pour l'environnement. Benevolat, ecologie, impact terrain.",
    url: HOME_ROUTE,
    siteName: "CleanMyMap",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/brand/logo-cleanmymap.svg",
        width: 1200,
        height: 630,
        alt: "CleanMyMap - Carte propreté Paris et cleanwalks",
      },
    ],
  },
  twitter: {
    ...appMetadata.twitter,
    card: "summary_large_image",
    title: "CleanMyMap - Écologie Action Paris",
    description:
      "La carte citoyenne de depollution - Benevolat, ecologie, impact terrain",
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
        <HomeCommunityCredibility
          activity={communityActivity}
          errorMessage={overviewLoadError}
        />
      </div>
    </main>
  );
}
