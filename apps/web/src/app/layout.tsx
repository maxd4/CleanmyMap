import type { Metadata } from "next";
import { PostHogProvider } from "@/components/posthog-provider";
import { ClerkLocalizationProvider } from "@/components/auth/clerk-localization-provider";
import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";
import { OrganizationJsonLd, WebSiteJsonLd, FAQJsonLd } from "@/components/seo/structured-data/";
import { RootLayoutChrome } from "@/components/layout/root-layout-chrome";
import { DeferredGlobalFooter } from "@/components/layout/deferred-global-chrome";
import { getClerkRuntimeConfig } from "@/lib/clerk-session-config";
import { metadata as appMetadata } from "@/lib/metadata";
import "./globals.css";
import { PROFIL_ROUTE } from "@/lib/accueil-pilotage-routes";

export const metadata: Metadata = appMetadata;

export const revalidate = 3600; // 1 hour Cache for public landing page
const clerkRuntime = getClerkRuntimeConfig();
const useClerkProxy = Boolean(clerkRuntime.proxyUrl);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="h-full antialiased" suppressHydrationWarning data-theme="mixed">
      <head>
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <FAQJsonLd />
      </head>
      <body className="relative isolate flex min-h-screen flex-col overflow-x-hidden bg-background font-sans text-foreground">
        <SitePreferencesProvider>
          <ClerkLocalizationProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl={PROFIL_ROUTE}
            signUpFallbackRedirectUrl="/onboarding/localisation"
            afterSignOutUrl="/"
            publishableKey={clerkRuntime.publishableKey}
            proxyUrl={clerkRuntime.proxyUrl}
            domain={useClerkProxy ? undefined : clerkRuntime.domain}
            isSatellite={useClerkProxy ? undefined : clerkRuntime.isSatellite}
            satelliteAutoSync={
              useClerkProxy ? undefined : clerkRuntime.satelliteAutoSync
            }
            allowedRedirectOrigins={clerkRuntime.allowedRedirectOrigins}
          >
            <PostHogProvider>
              <RootLayoutChrome />
              <main className="cmm-site-frame flex flex-1 flex-col pt-2 sm:pt-0">
                {children}
              </main>
              <DeferredGlobalFooter />
            </PostHogProvider>
          </ClerkLocalizationProvider>
        </SitePreferencesProvider>
      </body>
    </html>
  );
}
