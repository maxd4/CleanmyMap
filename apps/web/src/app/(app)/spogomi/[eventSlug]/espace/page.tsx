import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SpogomiEventCockpit } from "@/components/spogomi/spogomi-event-cockpit";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasSpogomiCapability, resolveSpogomiEventAccessBySlug } from "@/lib/spogomi/authorization";

type Props = { params: Promise<{ eventSlug: string }> };

export const metadata: Metadata = {
  title: "Espace événementiel SPOGOMI",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function SpogomiEventSpacePage({ params }: Props) {
  const { eventSlug } = await params;
  const access = await requireAuthenticatedAccess();
  if (!access.ok) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/spogomi/${eventSlug}/espace`)}`);
  const eventAccess = await resolveSpogomiEventAccessBySlug({
    supabase: getSupabaseServerClient(true),
    eventSlug,
    userId: access.userId,
  });
  if (!eventAccess || (!hasSpogomiCapability(eventAccess, "observe") && !hasSpogomiCapability(eventAccess, "manage"))) notFound();

  return (
    <>
      <nav className="cmm-page-width flex flex-wrap gap-3 px-4 pt-6" aria-label="Navigation SPOGOMI">
        <Link href="/spogomi/mes-evenements" className="font-bold text-emerald-800 hover:underline">Retour à mes événements</Link>
        <Link href="/spogomi/nouveau" className="font-bold text-emerald-800 hover:underline">Nouvelle compétition</Link>
        <Link href="/spogomi" className="font-bold text-emerald-800 hover:underline">Index public SPOGOMI</Link>
      </nav>
      <SpogomiEventCockpit
        event={{
          id: String(eventAccess.event.id),
          name: String(eventAccess.event.name),
          eventSlug: eventAccess.event.event_slug,
          mode: eventAccess.event.mode,
          state: eventAccess.event.state,
          startsAt: eventAccess.event.starts_at,
          endsAt: eventAccess.event.ends_at,
          publicVisibility: eventAccess.event.public_visibility,
        }}
        role={eventAccess.role}
        capabilities={[...eventAccess.capabilities]}
      />
    </>
  );
}
