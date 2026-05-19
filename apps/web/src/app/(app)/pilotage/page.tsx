import { redirect } from "next/navigation";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { toProfile } from "@/lib/profiles";
import { getServerLocale } from "@/lib/server-preferences";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import {
  PilotageLockedPage,
  PilotageOverviewPage,
  PilotageRestrictedPage,
  type PilotageLocale,
} from "@/components/pilotage/pilotage-access-screen";

async function loadOverview() {
  const supabase = getSupabaseServerClient();
  return loadPilotageOverview({
    supabase,
    periodDays: 30,
    limit: 1800,
  });
}

export default async function PilotageAccessPage() {
  const { userId } = await getSafeAuthSession();
  const locale = (await getServerLocale()) as PilotageLocale;
  const role = userId
    ? await getCurrentUserRoleLabel().catch(() => "anonymous" as const)
    : ("anonymous" as const);
  const profile = toProfile(role);

  if (userId && profile === "admin") {
    redirect("/admin");
  }

  if (!userId) {
    return <PilotageLockedPage locale={locale} isAuthenticated={false} />;
  }

  if (!["coordinateur", "max"].includes(profile)) {
    return <PilotageRestrictedPage locale={locale} profile={profile} />;
  }

  const overview = await loadOverview().catch(() => null);
  return <PilotageOverviewPage locale={locale} profile={profile} overview={overview} />;
}
