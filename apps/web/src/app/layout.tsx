import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { AccountIdentityChip } from "@/components/account/account-identity-chip";
import { PostHogProvider } from "@/components/posthog-provider";
import { ClerkLocalizationProvider } from "@/components/auth/clerk-localization-provider";
import { VibrantBackground } from "@/components/ui/vibrant-background";
import { SitePreferencesControls } from "@/components/ui/site-preferences-controls";
import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getClerkRuntimeConfig } from "@/lib/clerk-session-config";
import { getServerDisplayModePreference } from "@/lib/server-preferences";
import { metadata as appMetadata } from "@/lib/metadata";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "./globals.css";

export const metadata: Metadata = appMetadata;

export const revalidate = 3600; // 1 hour Cache for public landing page

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const identity = await getCurrentUserIdentity();
  const clerkRuntime = getClerkRuntimeConfig();
  const displayModePreference = await getServerDisplayModePreference();

  return (
    <html className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground font-sans">
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
              <VibrantBackground />
              <header className="sticky top-0 z-30 border-b border-white/10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl shadow-sm transition-all duration-300">
                <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8">
                  <Link href="/" className="flex items-center gap-2 hover:opacity-95 transition-opacity">
                    <Image
                      src="/brand/nouveau-logo.png"
                      alt="Logo CleanMyMap"
                      width={42}
                      height={24}
                      className="h-6 w-auto sm:h-7"
                      priority
                    />
                    <h1 className="whitespace-nowrap text-[11px] font-bold tracking-[0.18em] text-slate-900 dark:text-white uppercase sm:text-sm">
                      Agir-Cartographier-Préserver
                    </h1>
                  </Link>
                  <div className="flex items-center gap-4">
                    <Link
                      href="/explorer"
                      className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 sm:inline-flex"
                    >
                      Explorer
                    </Link>
                    <SitePreferencesControls />
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                    <Show when="signed-out">
                      <div className="flex items-center gap-2">
                        <SignInButton mode="modal"><button className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Sign in</button></SignInButton>
                        <SignUpButton mode="modal"><button className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10">Sign up</button></SignUpButton>
                      </div>
                    </Show>
                    <Show when="signed-in">
                      <div className="flex items-center gap-3">
                        {identity ? (
                          <AccountIdentityChip identity={identity} />
                        ) : null}
                        <NotificationBell />
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
