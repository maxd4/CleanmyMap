"use client";

import dynamic from "next/dynamic";

const DeferredNetworkToastHost = dynamic(
  () => import("@/components/ui/network-toast").then((module) => module.NetworkToastHost),
  { ssr: false, loading: () => null },
);

const DeferredGamificationCelebrationHost = dynamic(
  () =>
    import("@/components/gamification/GamificationCelebrationHost").then(
      (module) => module.GamificationCelebrationHost,
    ),
  { ssr: false, loading: () => null },
);

const DeferredVibrantBackground = dynamic(
  () =>
    import("@/components/ui/vibrant-background-no-ssr").then(
      (module) => module.VibrantBackgroundNoSSR,
    ),
  { ssr: false, loading: () => null },
);

const DeferredSiteTooltips = dynamic(
  () => import("@/components/ui/site-tooltips").then((module) => module.SiteTooltips),
  { ssr: false, loading: () => null },
);

const DeferredConditionalAnalytics = dynamic(
  () =>
    import("@/components/ui/conditional-analytics").then(
      (module) => module.ConditionalAnalytics,
    ),
  { ssr: false, loading: () => null },
);

const DeferredCookieConsentBanner = dynamic(
  () =>
    import("@/components/ui/cookie-consent-banner").then(
      (module) => module.CookieConsentBanner,
    ),
  { ssr: false, loading: () => null },
);

export function DeferredGlobalChrome() {
  return (
    <>
      <DeferredNetworkToastHost />
      <DeferredGamificationCelebrationHost />
      <DeferredVibrantBackground />
      <DeferredSiteTooltips />
      <DeferredConditionalAnalytics />
      <DeferredCookieConsentBanner />
    </>
  );
}

const DeferredHomeFooter = dynamic(
  () => import("@/components/accueil/home-footer-no-ssr").then((module) => module.HomeFooterNoSSR),
  { ssr: false, loading: () => null },
);

export function DeferredGlobalFooter() {
  return <DeferredHomeFooter />;
}
