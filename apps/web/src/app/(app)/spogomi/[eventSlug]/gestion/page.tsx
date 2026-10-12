import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventBySlugForOrganizer } from "@/lib/spogomi/preparation-service";
import { SpogomiPreparationWorkspace } from "@/components/spogomi/spogomi-preparation-workspace";

type Props = { params: Promise<{ eventSlug: string }> };
export const metadata: Metadata = { title: "Gestion SPOGOMI", robots: { index: false, follow: false, noarchive: true } };

export default async function SpogomiManagementPage({ params }: Props) {
  const { eventSlug } = await params;
  const access = await requireAuthenticatedAccess();
  if (!access.ok) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/spogomi/${eventSlug}/gestion`)}`);
  const event = await loadSpogomiEventBySlugForOrganizer(getSupabaseServerClient(true), eventSlug, access.userId);
  if (event === false || !event) notFound();
  return <SpogomiPreparationWorkspace eventId={event.id} />;
}
