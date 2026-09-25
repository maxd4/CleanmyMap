"use client";

import { DeferredWeatherWarningBar } from "@/components/ui/deferred-weather-warning-bar";
import type { ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { resolveActiveProfileFromMetadata, type AppProfile } from "@/lib/profiles";

type AppShellSurfaceProps = {
  children: ReactNode;
};

export function isRouteRecommendationPath(pathname: string | null): boolean {
  return pathname === "/sections/route";
}

function resolveProfileFromUser(
  user: ReturnType<typeof useUser>["user"] | null | undefined,
  fallback: AppProfile,
): AppProfile {
  return resolveActiveProfileFromMetadata(
    user?.publicMetadata as Record<string, unknown> | undefined,
    fallback,
  );
}

export function AppShellSurface({ children }: AppShellSurfaceProps) {
  const { displayMode } = useSitePreferences();
  const { user } = useUser();
  const pathname = usePathname();
  const currentProfile = resolveProfileFromUser(user, "benevole");

  return (
    <div
      className="flex min-h-screen w-full flex-col bg-transparent transition-all duration-300"
      data-display-mode={displayMode}
      data-user-profile={currentProfile}
    >
      <DeferredWeatherWarningBar autoGeolocation={!isRouteRecommendationPath(pathname)} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
