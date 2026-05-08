import {
 Show,
 UserButton,
} from"@clerk/nextjs";
import { ConditionalAnalytics } from"@/components/ui/conditional-analytics";
import Image from"next/image";
import Link from"next/link";
import { LogIn, UserPlus, Map as MapIcon } from "lucide-react";
import type { Metadata } from"next";
import { headers } from"next/headers";
import { Inter, Outfit } from"next/font/google";
import { AccountIdentityChip } from"@/components/account/account-identity-chip";
import { AppNavigationRibbon } from"@/components/navigation/app-navigation-ribbon";
import { PostHogProvider } from"@/components/posthog-provider";
import { CookieConsentBanner } from"@/components/ui/cookie-consent-banner";
import { ClerkLocalizationProvider } from"@/components/auth/clerk-localization-provider";
import { VibrantBackground } from"@/components/ui/vibrant-background";
import { SitePreferencesProvider } from"@/components/ui/site-preferences-provider";
import { SiteTooltips } from"@/components/ui/site-tooltips";
import { PageTransition } from"@/components/ui/page-transition";
import { NetworkToastHost } from"@/components/ui/network-toast";
import { NotificationBell } from"@/components/navigation/notification-bell";
import { OrganizationJsonLd, WebSiteJsonLd, FAQJsonLd } from"@/components/seo/structured-data/";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from"@/lib/authz";
import { getSafeAuthSession } from"@/lib/auth/safe-session";
import { getClerkRuntimeConfig } from"@/lib/clerk-session-config";
import { getProfileLabel, toProfile } from"@/lib/profiles";
import { getServerDisplayModePreference, getServerLocale } from"@/lib/server-preferences";
import { metadata as appMetadata } from"@/lib/metadata";
import type { CSSProperties } from "react";
import"leaflet/dist/leaflet.css";
import"leaflet-draw/dist/leaflet.draw.css";
import"./globals.css";

/* Font configuration - Optimized loading via next/font */
const outfit = Outfit({
 subsets: ["latin"],
 display:"swap",
 variable:"--font-outfit",
 weight: ["400","500","600","700"],
});

const inter = Inter({
 subsets: ["latin"],
 display:"swap",
 variable:"--font-inter",
 weight: ["400","500","600","700"],
});

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
  const requestHeaders = await headers();
  const isAppShell = requestHeaders.get("x-cleanmymap-app-shell") ==="1";
  const hideGlobalHeader =
  requestHeaders.get("x-cleanmymap-hide-global-header") ==="1";
  const appRibbonTopOffset = "0rem";
  const appHeaderTopOffset = hideGlobalHeader ? "0rem" : "4.75rem";

return (
        <html className={`h-full antialiased ${outfit.variable} ${inter.variable}`} suppressHydrationWarning data-theme="mixed">
  <head>
    <OrganizationJsonLd />
    <WebSiteJsonLd />
    <FAQJsonLd />
  </head>
  <body
    className="min-h-full bg-background text-foreground font-sans"
   style={
     {
      "--app-ribbon-top-offset": appRibbonTopOffset,
      "--app-header-top-offset": appHeaderTopOffset,
     } as CSSProperties
   }
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
  <NetworkToastHost />
  <VibrantBackground />
  <SiteTooltips />
  <AppNavigationRibbon
  currentProfile={currentProfile}
  profileLabel={profileLabel}
  identity={identity}
  />
  {!isAppShell && !hideGlobalHeader ? (
  <header className="sticky top-[var(--app-header-top-offset,0rem)] z-30 border-b border-white/[0.06] bg-[#0f172a]/95 shadow-sm backdrop-blur-xl transition-all duration-300">
   <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 overflow-x-auto px-4 py-3 scrollbar-none sm:px-8"> <Link href="/" className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-95">
 <Image
 src="/brand/logo-cleanmymap-officiel.svg"
 alt="Logo CleanMyMap"
 width={160}
 height={48}
 className="h-6 w-auto sm:h-7"
 priority
 />
 </Link>
 <div className="flex min-w-max items-center gap-3 sm:gap-4">
  <Link
  href="/explorer"
  className="hidden items-center gap-2 rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-muted)] px-3 py-1.5 cmm-text-small cmm-text-secondary font-semibold transition hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-cyan-200 sm:inline-flex"
  >
  <MapIcon size={14} />
  Explorer
  </Link>
 <div className="h-4 w-px bg-[color:var(--border-default)]" />
 <Show when="signed-out">
  <div className="flex items-center gap-2">
  <Link
  href="/sign-in"
  className="flex items-center gap-2 cmm-text-small cmm-text-secondary font-semibold transition-colors hover:text-cyan-200"
  >
   <LogIn size={16} />
   Connexion
  </Link>
  <Link
  href="/sign-up"
  className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 cmm-text-small font-semibold text-white shadow-md shadow-emerald-600/10 transition-all hover:bg-emerald-700"
  >
   <UserPlus size={16} />
   Rejoindre
  </Link>
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
 userButtonAvatarBox:"h-8 w-8 ring-2 ring-emerald-500/20",
 },
 }}
 />
 </div>
 </Show>
 </div>
 </div>
 </header>
 ) : null}
 <main className="flex flex-col flex-1">
 <PageTransition>
 {children}
 </PageTransition>
 </main>
<ConditionalAnalytics />
  <CookieConsentBanner />
  </PostHogProvider>
 </ClerkLocalizationProvider>
 </SitePreferencesProvider>
 </body>
 </html>
 );
}
