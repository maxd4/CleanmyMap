"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  getActiveSpaceForPath,
  getNavigationSpacesForProfile,
} from "@/lib/navigation";
import type { AppProfile } from "@/lib/profiles";

type BlockSwitcherProps = {
  currentProfile: AppProfile;
};

export function BlockSwitcher({ currentProfile }: BlockSwitcherProps) {
  const pathname = usePathname();
  const { locale, displayMode } = useSitePreferences();
  const spaces = getNavigationSpacesForProfile(currentProfile, displayMode, locale);
  const activeSpaceId = getActiveSpaceForPath(currentProfile, pathname, displayMode);

  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/40 bg-white/60 backdrop-blur-md px-2 py-1.5 shadow-sm scrollbar-none">
      {spaces.map((space) => {
        const firstHref = space.items[0]?.href ?? "/dashboard";
        const isActive = space.id === activeSpaceId;
        return (
          <Link
            key={space.id}
            href={firstHref}
            title={space.label[locale]}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 transition shrink-0 ${
              isActive
                ? "bg-emerald-100 text-emerald-900"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <span className="text-base leading-none">{space.icon}</span>
            <span className={`text-[9px] font-semibold uppercase tracking-wide leading-none hidden sm:block ${isActive ? "text-emerald-800" : "text-slate-400"}`}>
              {space.label[locale].split(" ")[0]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
