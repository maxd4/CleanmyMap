import { ConditionalAnalytics } from"@/components/ui/conditional-analytics";
import type { Metadata } from"next";
import { AppNavigationRibbon } from"@/components/navigation/app-navigation-ribbon";
import { PostHogProvider } from"@/components/posthog-provider";
import { CookieConsentBanner } from"@/components/ui/cookie-consent-banner";
import { ClerkLocalizationProvider } from"@/components/auth/clerk-localization-provider";
import { VibrantBackgroundNoSSR } from"@/components/ui/vibrant-background-no-ssr";
import { HomeFooterNoSSR } from"@/components/accueil/home-footer-no-ssr";
import { SitePreferencesProvider } from"@/components/ui/site-preferences-provider";
import { SiteTooltips } from"@/components/ui/site-tooltips";
import { NetworkToastHost } from"@/components/ui/network-toast";
import { OrganizationJsonLd, WebSiteJsonLd, FAQJsonLd } from"@/components/seo/structured-data/";
import { ProjectPageviewTracker } from"@/components/analytics/project-pageview-tracker";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from"@/lib/authz";
import { getSafeAuthSession } from"@/lib/auth/safe-session";
import { getClerkRuntimeConfig } from"@/lib/clerk-session-config";
import { getProfileLabel, toProfile } from"@/lib/profiles";
import { getServerDisplayModePreference, getServerLocale } from"@/lib/server-preferences";
import { metadata as appMetadata } from"@/lib/metadata";
import { headers } from "next/headers";
import"./globals.css";
import { resolveBackdropToneKey } from "@/lib/ui/backdrop-tone";
import { getButtonThemeCssVariables } from "@/lib/ui/button-theme";
import type { FooterVariant } from "@/lib/ui/footer-variant";

export const metadata: Metadata = appMetadata;

export const revalidate = 3600; // 1 hour Cache for public landing page

export default async function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 const identity = await getCurrentUserIdentity();
 const clerkRuntime = getClerkRuntimeConfig();
  const useClerkProxy = Boolean(clerkRuntime.proxyUrl);
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
  const requestHeaders = await headers();
  const initialBackdropToneKey = resolveBackdropToneKey(
    requestHeaders.get("x-cleanmymap-backdrop-tone"),
  );
  const initialButtonThemeVariables = getButtonThemeCssVariables(initialBackdropToneKey);
  const initialFooterVariant = requestHeaders.get("x-cleanmymap-footer-variant") as FooterVariant | null;

return (
    <html className="h-full antialiased" suppressHydrationWarning data-theme="mixed">
  <head>
    <OrganizationJsonLd />
    <WebSiteJsonLd />
    <FAQJsonLd />
    {initialButtonThemeVariables ? (
      <style
        id="cmm-initial-theme"
        dangerouslySetInnerHTML={{
          __html: `:root{${Object.entries(initialButtonThemeVariables)
            .map(([k, v]) => `${k}:${v};`)
            .join("")}}`,
        }}
      />
    ) : null}
  </head>
  <body
    className="relative isolate min-h-full overflow-x-hidden bg-background text-foreground font-sans"
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
 proxyUrl={clerkRuntime.proxyUrl}
 domain={useClerkProxy ? undefined : clerkRuntime.domain}
 isSatellite={useClerkProxy ? undefined : clerkRuntime.isSatellite}
 satelliteAutoSync={useClerkProxy ? undefined : clerkRuntime.satelliteAutoSync}
 allowedRedirectOrigins={clerkRuntime.allowedRedirectOrigins}
 >
<PostHogProvider>
  <ProjectPageviewTracker />
  <NetworkToastHost />
  <VibrantBackgroundNoSSR initialToneKey={initialBackdropToneKey} />
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
  <HomeFooterNoSSR initialVariant={initialFooterVariant ?? undefined} />
  </PostHogProvider>
 </ClerkLocalizationProvider>
 </SitePreferencesProvider>
 </body>
 </html>
 );
}
