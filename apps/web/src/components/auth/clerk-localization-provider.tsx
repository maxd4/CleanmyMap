"use client";

import { ClerkProvider } from"@clerk/nextjs";
import { frFR, enUS } from"@clerk/localizations";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import { ReactNode } from"react";

interface ClerkLocalizationProviderProps {
 children: ReactNode;
 signInUrl?: string;
 signUpUrl?: string;
 signInFallbackRedirectUrl?: string;
 signUpFallbackRedirectUrl?: string;
 afterSignOutUrl?: string;
 domain?: string;
 isSatellite?: boolean;
 satelliteAutoSync?: boolean;
 allowedRedirectOrigins?: string[];
}

export function ClerkLocalizationProvider({
 children,
 ...props
}: ClerkLocalizationProviderProps) {
 const { locale } = useSitePreferences();

 return (
 <ClerkProvider
 {...props}
 localization={locale ==="fr" ? frFR : enUS}
 appearance={{
 baseTheme: undefined, // Will be handled by Tailwind/CSS
 variables: {
 colorPrimary:"#10b981", // Emerald 500
 },
 elements: {
 card:"shadow-2xl border border-white/20 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80",
 headerTitle:"cmm-text-primary",
 headerSubtitle:"cmm-text-muted dark:cmm-text-muted",
 socialButtonsBlockButton:" bg-white dark:bg-slate-800",
 formButtonPrimary:"bg-emerald-600 hover:bg-emerald-700 transition-all",
 }
 }}
 >
 {children}
 </ClerkProvider>
 );
}
