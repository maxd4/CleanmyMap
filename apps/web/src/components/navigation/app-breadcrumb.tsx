"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  getActiveSpaceForPath,
  getNavigationSpacesForProfile,
} from "@/lib/navigation";
import type { AppProfile } from "@/lib/profiles";

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
      className="sticky top-0 z-20 flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/70 backdrop-blur-lg px-3 py-2 text-xs text-slate-500 shadow-sm"
    >
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 hover:text-emerald-700 transition font-medium"
      >
        <Image
          src="/brand/nouveau-logo.png"
          alt="Logo CleanMyMap"
          width={18}
          height={10}
          className="h-3 w-auto"
        />
        CleanMyMap
      </Link>

      <span className="text-slate-300">/</span>

      <span className="text-slate-400 truncate max-w-[80px]">{profileLabel}</span>

      {activeSpace && (
        <>
          <span className="text-slate-300">/</span>
          <span className="text-base leading-none">{activeSpace.icon}</span>
          <span className="font-medium text-slate-700 truncate max-w-[90px]">
            {activeSpace.label[locale]}
          </span>
        </>
      )}

      {activeItem && (
        <>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-emerald-800 truncate max-w-[120px]">
            {activeItem.label[locale]}
          </span>
        </>
      )}
    </nav>
  );
}
