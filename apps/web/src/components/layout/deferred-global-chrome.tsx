"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

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

export function isAuthSurfacePath(pathname: string | null): boolean {
  return pathname === "/sign-in" ||
    pathname?.startsWith("/sign-in/") === true ||
    pathname === "/sign-up" ||
    pathname?.startsWith("/sign-up/") === true;
}

function scheduleAfterIdle(callback: () => void): () => void {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const idleCallback = window.requestIdleCallback(callback, { timeout: 2000 });
    return () => window.cancelIdleCallback(idleCallback);
  }

  const timeout = setTimeout(callback, 1000);
  return () => clearTimeout(timeout);
}

export function DeferredGlobalChrome() {
  const pathname = usePathname();
  const isAuthSurface = isAuthSurfacePath(pathname);
  const [shouldLoadDeferredChrome, setShouldLoadDeferredChrome] = useState(
    !isAuthSurface,
  );

  useEffect(() => {
    if (!isAuthSurface || shouldLoadDeferredChrome) {
      return;
    }

    return scheduleAfterIdle(() => setShouldLoadDeferredChrome(true));
  }, [isAuthSurface, shouldLoadDeferredChrome]);

  return (
    <>
      {shouldLoadDeferredChrome ? (
        <>
          <DeferredNetworkToastHost />
          <DeferredGamificationCelebrationHost />
          <DeferredVibrantBackground />
          <DeferredSiteTooltips />
        </>
      ) : null}
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
  const pathname = usePathname();
  const isAuthSurface = isAuthSurfacePath(pathname);
  const [shouldLoadFooter, setShouldLoadFooter] = useState(!isAuthSurface);

  useEffect(() => {
    if (!isAuthSurface || shouldLoadFooter) {
      return;
    }

    return scheduleAfterIdle(() => setShouldLoadFooter(true));
  }, [isAuthSurface, shouldLoadFooter]);

  return shouldLoadFooter ? <DeferredHomeFooter /> : null;
}
