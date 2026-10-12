import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiTeamResultForm } from "@/lib/spogomi/result-service";
import { SPOGOMI_TEAM_SESSION_COOKIE } from "@/lib/spogomi/team-access";
import { SpogomiTeamResultForm } from "@/components/spogomi/spogomi-team-result-form";

type Props = { params: Promise<{ eventSlug: string }> };

export const metadata: Metadata = {
  title: "Saisie équipe SPOGOMI",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function SpogomiTeamPage({ params }: Props) {
  const { eventSlug } = await params;
  const sessionToken = (await cookies()).get(SPOGOMI_TEAM_SESSION_COOKIE)?.value;
  const form = await loadSpogomiTeamResultForm({ supabase: getSupabaseServerClient(true), sessionToken });
  if (!form || form.event.event_slug !== eventSlug) {
    if (!sessionToken) redirect(`/spogomi/${encodeURIComponent(eventSlug)}`);
    notFound();
  }
  return <SpogomiTeamResultForm form={form} />;
}
