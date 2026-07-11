"use client";

import type { ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { WeatherWarningBar } from "@/components/ui/weather-warning-bar";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { normalizeProfileRole, toProfile, type AppProfile } from "@/lib/profiles";

type AppShellSurfaceProps = {
  children: ReactNode;
};

function resolveProfileFromUser(
  user: ReturnType<typeof useUser>["user"] | null | undefined,
  fallback: AppProfile,
): AppProfile {
  if (!user) {
    return fallback;
  }

  const metadata = user.publicMetadata as Record<string, unknown> | undefined;
  const rawRole =
    typeof metadata?.["role"] === "string"
      ? metadata["role"]
      : typeof metadata?.["profile"] === "string"
        ? metadata["profile"]
        : null;
  const normalizedRole = normalizeProfileRole(rawRole);

  return normalizedRole ? toProfile(normalizedRole) : fallback;
}

export function AppShellSurface({ children }: AppShellSurfaceProps) {
  const { displayMode } = useSitePreferences();
  const { user } = useUser();
  const currentProfile = resolveProfileFromUser(user, "benevole");

  return (
    <div
      className="flex min-h-screen w-full flex-col bg-transparent transition-all duration-300"
      data-display-mode={displayMode}
      data-user-profile={currentProfile}
    >
      <WeatherWarningBar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
