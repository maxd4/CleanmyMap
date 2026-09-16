"use client";

import Link from"next/link";
import { usePathname } from"next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import {
 getActiveSpaceForPath,
 getNavigationSpacesForProfile,
} from"@/lib/navigation";
import type { AppProfile } from"@/lib/profiles";
import { DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";

type AppBreadcrumbProps = {
 currentProfile: AppProfile;
 profileLabel: string;
};

export function AppBreadcrumb({ currentProfile, profileLabel }: AppBreadcrumbProps) {
 const pathname = usePathname();
 const { locale, displayMode } = useSitePreferences();
 const spaces = getNavigationSpacesForProfile(currentProfile, displayMode, locale);
 const activeSpaceId = getActiveSpaceForPath(currentProfile, pathname, displayMode);
 const activeSpace = spaces.find((s) => s.id === activeSpaceId);
 const activeItem = activeSpace?.items.find(
 (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
 );

 return (
 <nav
 aria-label="Breadcrumb"
 className="flex w-full flex-wrap items-center gap-1.5 rounded-2xl border border-white/40 bg-white/80 px-3 py-2 cmm-text-caption cmm-text-muted shadow-sm backdrop-blur-md"
 >
<Link
 href={DASHBOARD_ROUTE}
 prefetch={false}
 className="inline-flex shrink-0 items-center gap-1.5 font-medium transition hover:text-emerald-700"
>
 <BrandLogo
 variant="compact"
 alt="Logo CleanMyMap"
 className="h-3 w-auto shrink-0"
 sizes="0.75rem"
 />
 CleanMyMap
 </Link>

 <span className="text-slate-300">/</span>

 <span className="min-w-0 break-words cmm-text-muted">{profileLabel}</span>

 {activeSpace && (
 <>
 <span className="text-slate-300">/</span>
 <span className="text-base leading-none">{activeSpace.icon}</span>
 <span className="min-w-0 break-words font-medium cmm-text-secondary">
 {activeSpace.label[locale]}
 </span>
 </>
 )}

 {activeItem && (
 <>
 <span className="text-slate-300">/</span>
 <span className="min-w-0 break-words font-semibold text-emerald-800">
 {activeItem.label[locale]}
 </span>
 </>
 )}
 </nav>
 );
}
