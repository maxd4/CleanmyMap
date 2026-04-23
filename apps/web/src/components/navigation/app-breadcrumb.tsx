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
      className="mx-auto flex w-full max-w-7xl items-center gap-1.5 rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-xs text-slate-500 shadow-sm backdrop-blur-md"
    >
      <Link
        href="/dashboard"
        className="inline-flex shrink-0 items-center gap-1.5 font-medium transition hover:text-emerald-700"
      >
        <Image
          src="/brand/nouveau-logo.png"
          alt="Logo CleanMyMap"
          width={18}
          height={10}
          className="h-3 w-auto shrink-0"
        />
        CleanMyMap
      </Link>

      <span className="text-slate-300">/</span>

      <span className="max-w-[80px] truncate text-slate-400">{profileLabel}</span>

      {activeSpace && (
        <>
          <span className="text-slate-300">/</span>
          <span className="text-base leading-none">{activeSpace.icon}</span>
          <span className="max-w-[90px] truncate font-medium text-slate-700">
            {activeSpace.label[locale]}
          </span>
        </>
      )}

      {activeItem && (
        <>
          <span className="text-slate-300">/</span>
          <span className="max-w-[120px] truncate font-semibold text-emerald-800">
            {activeItem.label[locale]}
          </span>
        </>
      )}
    </nav>
  );
}
