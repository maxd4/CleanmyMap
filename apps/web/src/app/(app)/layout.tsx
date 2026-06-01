import type { ReactNode } from "react";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { toProfile } from "@/lib/profiles";
import { getServerDisplayModePreference } from "@/lib/server-preferences";

import { WeatherWarningBar } from "@/components/ui/weather-warning-bar";

export default async function AppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { userId, clerkReachable } = await getSafeAuthSession();
  const { displayMode } = await getServerDisplayModePreference();

  let role: Awaited<ReturnType<typeof getCurrentUserRoleLabel>> | "anonymous" =
    "anonymous";

  if (userId) {
    role = clerkReachable
      ? await getCurrentUserRoleLabel().catch(() => ("anonymous" as const))
      : "anonymous" as const;
  }

  const currentProfile = toProfile(role);

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
