import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SpogomiPreparationWorkspace } from "@/components/spogomi/spogomi-preparation-workspace";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventBySlugForOrganizer } from "@/lib/spogomi/preparation-service";

type Props = { params: Promise<{ eventSlug: string }> };

export const metadata: Metadata = {
  title: "Espace événementiel SPOGOMI",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function SpogomiEventSpacePage({ params }: Props) {
  const { eventSlug } = await params;
  const access = await requireAuthenticatedAccess();
  if (!access.ok) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/spogomi/${eventSlug}/espace`)}`);
  const event = await loadSpogomiEventBySlugForOrganizer(getSupabaseServerClient(true), eventSlug, access.userId);
  if (event === false || !event) notFound();

  return (
    <>
      <nav className="cmm-page-width flex flex-wrap gap-3 px-4 pt-6" aria-label="Navigation SPOGOMI">
        <Link href="/spogomi/mes-evenements" className="font-bold text-emerald-800 hover:underline">Retour à mes événements</Link>
        <Link href="/spogomi/nouveau" className="font-bold text-emerald-800 hover:underline">Nouvelle compétition</Link>
        <Link href="/spogomi" className="font-bold text-emerald-800 hover:underline">Index public SPOGOMI</Link>
      </nav>
      <SpogomiPreparationWorkspace eventId={event.id} />
    </>
  );
}
