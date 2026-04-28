import { getNavigationSpacesForProfile } from '@/lib/navigation';
import {
  HomeHero,
  HomeImpactSummary,
  HomePillars,
  HomeBenefits,
  HomeCommunityActivity,
  HomeFooter,
  OriginCredibility,
} from '@/components/home';
import { loadLandingOverview, computeLandingCounters } from '@/lib/home/data';
import { sortItemsForPreview, BLOCK_PREVIEW_PRIORITY } from '@/lib/home/navigation';
import {
  buildHomeMetrics,
  buildHomePillars,
  HOME_BENEFITS,
  type HomeCounters,
} from '@/lib/home/config';

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

  const homepageSpaces = getNavigationSpacesForProfile('benevole', 'exhaustif', 'fr');
  const homepageSpaceMap = new Map(homepageSpaces.map((space) => [space.id, space]));
  
  const getSpacePreview = (spaceId: keyof typeof BLOCK_PREVIEW_PRIORITY) => {
    const ordered = sortItemsForPreview(
      spaceId,
      homepageSpaceMap.get(spaceId)?.items ?? [],
    );
    return {
      mobile: ordered.slice(0, 2).map((item) => item.label.fr),
      desktop: ordered.slice(0, 3).map((item) => item.label.fr),
    };
  };

  const pillars = buildHomePillars(getSpacePreview);

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 font-sans">
      <HomeHero />
      <HomeImpactSummary metrics={metrics} />
      <HomePillars pillars={pillars} />
      <HomeBenefits benefits={HOME_BENEFITS} />
      <HomeCommunityActivity />
      <OriginCredibility />
      <HomeFooter />
    </div>
  );
}
