import type { Metadata } from "next";
import { AppNavigationRibbon } from "@/components/navigation/app-navigation-ribbon";
import { PostHogProvider } from "@/components/posthog-provider";
import { ClerkLocalizationProvider } from "@/components/auth/clerk-localization-provider";
import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";
import { OrganizationJsonLd, WebSiteJsonLd, FAQJsonLd } from "@/components/seo/structured-data/";
import { DeferredGlobalChrome } from "@/components/layout/deferred-global-chrome";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getClerkRuntimeConfig } from "@/lib/clerk-session-config";
import { getProfileLabel, toProfile } from "@/lib/profiles";
import { getServerDisplayModePreference, getServerLocale } from "@/lib/server-preferences";
import { metadata as appMetadata } from "@/lib/metadata";
import { headers } from "next/headers";
import "./globals.css";
import { resolveBackdropToneKey } from "@/lib/ui/backdrop-tone";
import { getButtonThemeCssVariables } from "@/lib/ui/button-theme";
import type { FooterVariant } from "@/lib/ui/footer-variant";
import { PROFIL_ROUTE } from "@/lib/accueil-pilotage-routes";

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
    ? await getCurrentUserRoleLabel().catch(() => "anonymous" as const)
    : ("anonymous" as const);
  const currentProfile = toProfile(role);
  const profileLabel = userId
    ? getProfileLabel(currentProfile, locale)
    : locale === "fr"
      ? "Visiteur"
      : "Visitor";
  const requestHeaders = await headers();
  const initialBackdropToneKey = resolveBackdropToneKey(
    requestHeaders.get("x-cleanmymap-backdrop-tone"),
  );
  const initialButtonThemeVariables = getButtonThemeCssVariables(
    initialBackdropToneKey,
  );
  const initialFooterVariant = requestHeaders.get(
    "x-cleanmymap-footer-variant",
  ) as FooterVariant | null;

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
      <body className="relative isolate min-h-full overflow-x-hidden bg-background font-sans text-foreground">
        <SitePreferencesProvider
          initialDisplayMode={displayModePreference.displayMode}
          initialDisplayModeExplicit={displayModePreference.isExplicit}
        >
          <ClerkLocalizationProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl={PROFIL_ROUTE}
            signUpFallbackRedirectUrl="/onboarding/localisation"
            afterSignOutUrl="/"
            proxyUrl={clerkRuntime.proxyUrl}
            domain={useClerkProxy ? undefined : clerkRuntime.domain}
            isSatellite={useClerkProxy ? undefined : clerkRuntime.isSatellite}
            satelliteAutoSync={
              useClerkProxy ? undefined : clerkRuntime.satelliteAutoSync
            }
            allowedRedirectOrigins={clerkRuntime.allowedRedirectOrigins}
          >
            <PostHogProvider>
              <DeferredGlobalChrome
                initialBackdropToneKey={initialBackdropToneKey}
                initialFooterVariant={initialFooterVariant}
              />
              <AppNavigationRibbon
                currentProfile={currentProfile}
                profileLabel={profileLabel}
                identity={identity}
              />
              <main className="cmm-site-frame flex flex-1 flex-col pt-2 sm:pt-0">
                {children}
              </main>
            </PostHogProvider>
          </ClerkLocalizationProvider>
        </SitePreferencesProvider>
      </body>
    </html>
  );
}
