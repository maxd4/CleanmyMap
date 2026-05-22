import { ConditionalAnalytics } from"@/components/ui/conditional-analytics";
import type { Metadata } from"next";
import { AppNavigationRibbon } from"@/components/navigation/app-navigation-ribbon";
import { PostHogProvider } from"@/components/posthog-provider";
import { CookieConsentBanner } from"@/components/ui/cookie-consent-banner";
import { ClerkLocalizationProvider } from"@/components/auth/clerk-localization-provider";
import { VibrantBackground } from"@/components/ui/vibrant-background";
import { SitePreferencesProvider } from"@/components/ui/site-preferences-provider";
import { SiteTooltips } from"@/components/ui/site-tooltips";
import { NetworkToastHost } from"@/components/ui/network-toast";
import { OrganizationJsonLd, WebSiteJsonLd, FAQJsonLd } from"@/components/seo/structured-data/";
import { ProjectPageviewTracker } from"@/components/analytics/project-pageview-tracker";
import { HomeFooter } from "@/components/accueil";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from"@/lib/authz";
import { getSafeAuthSession } from"@/lib/auth/safe-session";
import { getClerkRuntimeConfig } from"@/lib/clerk-session-config";
import { getProfileLabel, toProfile } from"@/lib/profiles";
import { getServerDisplayModePreference, getServerLocale } from"@/lib/server-preferences";
import { metadata as appMetadata } from"@/lib/metadata";
import { headers } from "next/headers";
import type { CSSProperties } from "react";
import"./globals.css";
import { resolveBackdropToneKey } from "@/lib/ui/backdrop-tone";

export const metadata: Metadata = appMetadata;

export const revalidate = 3600; // 1 hour Cache for public landing page

export default async function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 const identity = await getCurrentUserIdentity();
 const clerkRuntime = getClerkRuntimeConfig();
  const { userId, clerkReachable } = await getSafeAuthSession();
  const displayModePreference = await getServerDisplayModePreference();
  const locale = await getServerLocale();
  const role = clerkReachable
  ? await getCurrentUserRoleLabel().catch(() =>"anonymous" as const)
  : ("anonymous" as const);
  const currentProfile = toProfile(role);
  const profileLabel = userId
  ? getProfileLabel(currentProfile, locale)
  : locale ==="fr"
  ?"Visiteur"
  :"Visitor";
  const appRibbonTopOffset = "0rem";
  const requestHeaders = await headers();
  const initialBackdropToneKey = resolveBackdropToneKey(
    requestHeaders.get("x-cleanmymap-backdrop-tone"),
  );

return (
    <html className="h-full antialiased" suppressHydrationWarning data-theme="mixed">
  <head>
    <OrganizationJsonLd />
    <WebSiteJsonLd />
    <FAQJsonLd />
  </head>
  <body
    className="relative isolate min-h-full overflow-x-hidden bg-background text-foreground font-sans"
   style={{ "--app-ribbon-top-offset": appRibbonTopOffset } as CSSProperties}
  >
<SitePreferencesProvider
initialDisplayMode={displayModePreference.displayMode}
initialDisplayModeExplicit={displayModePreference.isExplicit}
>
 <ClerkLocalizationProvider
 signInUrl="/sign-in"
 signUpUrl="/sign-up"
 signInFallbackRedirectUrl="/profil"
 signUpFallbackRedirectUrl="/onboarding/localisation"
 afterSignOutUrl="/"
 domain={clerkRuntime.domain}
 isSatellite={clerkRuntime.isSatellite}
 satelliteAutoSync={clerkRuntime.satelliteAutoSync}
 allowedRedirectOrigins={clerkRuntime.allowedRedirectOrigins}
 >
<PostHogProvider>
  <ProjectPageviewTracker />
  <NetworkToastHost />
  <VibrantBackground initialToneKey={initialBackdropToneKey} />
  <SiteTooltips />
  <AppNavigationRibbon
  currentProfile={currentProfile}
  profileLabel={profileLabel}
  identity={identity}
  />
<main className="flex flex-col flex-1 pt-2 sm:pt-0">
 {children}
</main>
<ConditionalAnalytics />
  <CookieConsentBanner />
  <HomeFooter />
  </PostHogProvider>
 </ClerkLocalizationProvider>
 </SitePreferencesProvider>
 </body>
 </html>
 );
}
