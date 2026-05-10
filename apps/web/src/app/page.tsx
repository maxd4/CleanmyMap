import { getNavigationSpacesForProfile } from '@/lib/navigation';
import {
  HomeHero,
  HomePillars,
  HomeBenefits,
  HomeCommunityActivity,
  HomeFooter,
  OriginCredibility,
} from '@/components/accueil';
import {
  buildHomeCommunityActivity,
  computeLandingCounters,
  loadLandingOverview,
} from '@/lib/accueil/data';
import { sortItemsForPreview, BLOCK_PREVIEW_PRIORITY } from '@/lib/accueil/navigation';
import {
  buildHomeMetrics,
  buildHomePillars,
  HOME_BENEFITS,
  type HomeCounters,
} from '@/lib/accueil/config';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CleanMyMap - Carte Dépollution Paris & Actions Citoyennes Écologie',
  description: 'CMM Paris : la carte citoyenne de propreté et depollution. Signalez les pollutions, organisez des cleanwalks, declarez vos actions de nettoyage. Developpement durable, benevolat, impact terrain, valorisation des dechets.',
  keywords: [
    'cleanmymap', 'cmm', 'depollution', 'proprete', 'paris', 'cleanwalk', 'carte',
    'signalement', 'dechets', 'benevole', 'nettoyage', 'environnement',
    'ecologie', 'developpement durable', 'action citoyenne', 'impact terrain',
    'coordination', 'mutualisation', 'partenariat', 'entraide', 'solidarite',
    'valorisation dechets', 'recyclage', 'economie circulaire', 'zero dechet',
    'collecte populaire', 'opERATION propretE', 'engagement citoyen'
  ],
  openGraph: {
    title: 'CleanMyMap - Carte Dépollution Paris & Actions Citoyennes Écologie',
    description: 'La carte citoyenne de propreté Paris. Signalez, nettoyez, agissez pour l\'environnement. Benevolat, ecologie, impact terrain.',
    url: 'https://cleanmymap.fr',
    siteName: 'CleanMyMap',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CleanMyMap - Écologie Action Paris',
    description: 'La carte citoyenne de depollution - Benevolat, ecologie, impact terrain',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default async function HomePage() {
  const overview = await loadLandingOverview().catch(() => null);
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

  const accueilSpaces = getNavigationSpacesForProfile('benevole', 'exhaustif', 'fr');
  const accueilSpaceMap = new Map(accueilSpaces.map((space) => [space.id, space]));
  
  const getSpacePreview = (spaceId: keyof typeof BLOCK_PREVIEW_PRIORITY) => {
    const ordered = sortItemsForPreview(
      spaceId,
      accueilSpaceMap.get(spaceId)?.items ?? [],
    );
    return {
      mobile: ordered.slice(0, 2).map((item) => item.label.fr),
      desktop: ordered.slice(0, 3).map((item) => item.label.fr),
    };
  };

  const pillars = buildHomePillars(getSpacePreview);

  return (
    <div className="min-h-screen overflow-hidden bg-[#061223] font-sans">
      <HomeHero metrics={metrics} />
      <HomePillars pillars={pillars} />
      <HomeBenefits benefits={HOME_BENEFITS} />
      <HomeCommunityActivity activity={communityActivity} />
      <OriginCredibility />
    </div>
  );
}
