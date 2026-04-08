import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { AccountIdentityChip } from "@/components/account/account-identity-chip";
import { PostHogProvider } from "@/components/posthog-provider";
import { SitePreferencesControls } from "@/components/ui/site-preferences-controls";
import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getClerkRuntimeConfig } from "@/lib/clerk-session-config";
import { metadata as appMetadata } from "@/lib/metadata";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "./globals.css";

export const metadata: Metadata = appMetadata;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const identity = await getCurrentUserIdentity();
  const clerkRuntime = getClerkRuntimeConfig();

  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
          afterSignOutUrl="/"
          touchSession
          dynamic
          domain={clerkRuntime.domain}
          isSatellite={clerkRuntime.isSatellite}
          satelliteAutoSync={clerkRuntime.satelliteAutoSync}
          allowedRedirectOrigins={clerkRuntime.allowedRedirectOrigins}
        >
          <PostHogProvider>
            <SitePreferencesProvider>
              <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Navigation compte</p>
                  <div className="flex items-center gap-2">
                    <SitePreferencesControls />
                    <Show when="signed-out">
                      <SignInButton />
                      <SignUpButton />
                    </Show>
                    <Show when="signed-in">
                      {identity ? <AccountIdentityChip identity={identity} /> : null}
                      <UserButton />
                    </Show>
                  </div>
                </div>
              </header>
              {children}
              <Analytics />
              <SpeedInsights />
            </SitePreferencesProvider>
          </PostHogProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
