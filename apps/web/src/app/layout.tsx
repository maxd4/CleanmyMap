import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { AccountIdentityChip } from "@/components/account/account-identity-chip";
import { PostHogProvider } from "@/components/posthog-provider";
import { ClerkLocalizationProvider } from "@/components/auth/clerk-localization-provider";
import { VibrantBackground } from "@/components/ui/vibrant-background";
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
    <html className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground font-sans">
        <SitePreferencesProvider>
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
              <VibrantBackground />
              <header className="sticky top-0 z-30 border-b border-white/10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl shadow-sm transition-all duration-300">
                <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-600/20">C</div>
                    <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white uppercase">
                      CleanmyMap
                    </h1>
                  </div>
                  <div className="flex items-center gap-4">
                    <SitePreferencesControls />
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                    <Show when="signed-out">
                      <div className="flex items-center gap-2">
                        <SignInButton mode="modal">
                          <button className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                            Sign in
                          </button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                          <button className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10">
                            Sign up
                          </button>
                        </SignUpButton>
                      </div>
                    </Show>
                    <Show when="signed-in">
                      <div className="flex items-center gap-3">
                        {identity ? (
                          <AccountIdentityChip identity={identity} />
                        ) : null}
                        <UserButton 
                          appearance={{
                            elements: {
                              userButtonAvatarBox: "h-8 w-8 ring-2 ring-emerald-500/20"
                            }
                          }}
                        />
                      </div>
                    </Show>
                  </div>
                </div>
              </header>
              <main>
                {children}
              </main>
              <Analytics />
              <SpeedInsights />
            </PostHogProvider>
          </ClerkLocalizationProvider>
        </SitePreferencesProvider>
      </body>
    </html>
  );
}
