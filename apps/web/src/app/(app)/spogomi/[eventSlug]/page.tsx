import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { CmmCard } from "@/components/ui/cmm-card";
import { SpogomiPublicRouteMap } from "@/components/spogomi/spogomi-public-route-map";
import { SpogomiIdentityLinkCard } from "@/components/spogomi/spogomi-identity-link-card";
import { SpogomiVolunteerContributionsCard } from "@/components/spogomi/spogomi-volunteer-contributions-card";
import { SpogomiPublicResults } from "@/components/spogomi/spogomi-public-results";
import { SpogomiPhotoGallery } from "@/components/spogomi/spogomi-photo-gallery";
import { SpogomiTeamJoinButton } from "@/components/spogomi/spogomi-team-join-button";
import { PageHeader } from "@/components/ui/page-header";
import { loadPublishedSpogomiEventBySlug } from "@/lib/spogomi/public-service";
import { resolvePageFamily } from "@/lib/ui/page-families";

type Props = { params: Promise<{ eventSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventSlug } = await params;
  const event = await loadPublishedSpogomiEventBySlug(eventSlug).catch(() => null);
  if (!event) {
    return { title: "Compétition SPOGOMI indisponible", robots: { index: false, follow: false } };
  }
  return {
    title: event.name,
    description: `Informations publiques de la compétition SPOGOMI ${event.name}.`,
    alternates: { canonical: `/spogomi/${encodeURIComponent(event.slug)}` },
    robots: { index: true, follow: true },
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

export default async function SpogomiPublicEventPage({ params }: Props) {
  const { eventSlug } = await params;
  const event = await loadPublishedSpogomiEventBySlug(eventSlug).catch(() => null);
  if (!event) notFound();

  const lifecycleLabel = event.lifecycle === "upcoming" ? "À venir" : event.lifecycle === "in_progress" ? "En cours" : "Terminé";
  const modeLabel = event.mode === "mixed" ? "Casual & World Cup — deux classements séparés" : event.mode === "world_cup" ? "World Cup — équipes de trois" : "Casual — taille configurée pour l’événement";

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50 px-4 py-10">
      <div className="cmm-page-width space-y-6">
        <Link href="/spogomi" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:underline"><ArrowLeft size={16} />Tous les événements SPOGOMI</Link>
        <PageHeader family={resolvePageFamily(`/spogomi/${event.slug}`)} tone="emerald" title={event.name} subtitle={`${modeLabel} · ${lifecycleLabel}`} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="space-y-6">
            <CmmCard tone="emerald" variant="glass" className="space-y-3 p-5">
              <h2 className="text-xl font-black text-emerald-950">Informations pratiques</h2>
              <p className="flex items-center gap-2 text-sm text-slate-700"><CalendarDays size={16} className="text-emerald-700" />{formatDate(event.startsAt)}{event.endsAt ? ` → ${formatDate(event.endsAt)}` : ""}</p>
              <p className="flex items-center gap-2 text-sm text-slate-700"><MapPin size={16} className="text-emerald-700" />{event.locationLabel}</p>
              {event.actionHref ? <Link href={event.actionHref} className="inline-flex min-h-11 items-center font-bold text-emerald-800 hover:underline">Voir l’action CleanMyMap associée</Link> : <p className="text-sm text-slate-600">L’action CleanMyMap associée n’est pas publiée dans cette vue.</p>}
              <Link href="/sections/messagerie?tab=discussions&channel=community&topicId=spogomi" className="inline-flex min-h-11 items-center font-bold text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Discuter avec la communauté</Link>
              <p className="cmm-text-caption text-slate-700">Ce salon est une discussion communautaire. Le règlement et les résultats officiels sont ceux publiés par l’organisateur habilité.</p>
            </CmmCard>
            {event.organizer ? (
              <CmmCard tone="slate" variant="glass" className="space-y-3 p-5">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Organisateur de l’édition</h2>
                  <p className="cmm-text-body mt-1">Cette visibilité décrit le rôle dans cette édition ; elle ne constitue pas une annonce de partenariat officiel avec CleanMyMap.</p>
                </div>
                <dl className="grid gap-2 text-sm text-slate-700">
                  <div><dt className="font-bold text-slate-950">Structure vérifiée</dt><dd>{event.organizer.verifiedName}</dd></div>
                  <div><dt className="font-bold text-slate-950">Rôle</dt><dd>Organisateur local de l’édition</dd></div>
                  {event.organizer.territory ? <div><dt className="font-bold text-slate-950">Territoire</dt><dd>{event.organizer.territory}</dd></div> : null}
                </dl>
                {event.organizer.officialSiteUrl ? <a href={event.organizer.officialSiteUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-bold text-emerald-800 hover:underline">Site officiel validé</a> : null}
                {event.organizer.partnerProfileHref ? <Link href={event.organizer.partnerProfileHref} className="inline-flex min-h-11 items-center font-bold text-emerald-800 hover:underline">Voir la fiche partenaire dans l’Annuaire</Link> : null}
              </CmmCard>
            ) : null}
            <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5">
              <div><h2 className="text-xl font-black text-emerald-950">Équipes</h2><p className="cmm-text-body mt-1 text-slate-900">Seuls les noms publics d’équipe sont affichés. Le roster nominatif reste privé.</p></div>
              {event.teams.length ? <div className="grid gap-3 sm:grid-cols-2">{event.teams.map((team) => <div key={`${team.divisionId}-${team.teamNumber}`} className="rounded-xl border border-emerald-100 bg-white/75 p-3"><p className="text-xs font-black uppercase tracking-wide text-emerald-700">{team.divisionType === "world_cup" ? "World Cup" : "Casual"}</p><p className="font-bold text-slate-900">{team.publicName}</p><p className="mt-1 text-xs text-slate-500">Équipe {team.teamNumber}</p><div className="mt-3"><SpogomiTeamJoinButton eventId={event.id} teamId={team.id} signInHref={`/sign-in?redirect_url=${encodeURIComponent(`/spogomi/${event.slug}`)}`} /></div></div>)}</div> : <p className="rounded-xl border border-dashed border-emerald-200 p-4 text-sm text-slate-600">La composition publique n’est pas encore disponible.</p>}
            </CmmCard>
            {event.route ? <CmmCard tone="amber" variant="glass" className="space-y-3 p-5"><h2 className="text-xl font-black text-amber-950">Parcours officiel de référence</h2><p className="cmm-text-body text-slate-900">{event.route.fileName} · {event.route.referenceDistanceKm} km calculés depuis le fichier. Cette géométrie ne constitue pas une trace réellement parcourue.</p><SpogomiPublicRouteMap coordinates={event.route.coordinates} /></CmmCard> : <CmmCard tone="slate" variant="glass" className="border-dashed p-5"><p className="font-bold text-slate-900">Aucun parcours officiel publié.</p></CmmCard>}
            <SpogomiPublicResults eventSlug={event.slug} initial={event.results} />
            <SpogomiPhotoGallery photos={event.gallery} />
          </div>
          <aside className="space-y-4" aria-label="Participation et fonctionnalités">
            <SpogomiIdentityLinkCard eventId={event.id} signInHref={`/sign-in?redirect_url=${encodeURIComponent(`/spogomi/${event.slug}`)}`} />
            <SpogomiVolunteerContributionsCard eventId={event.id} signInHref={`/sign-in?redirect_url=${encodeURIComponent(`/spogomi/${event.slug}`)}`} />
            {["Classements indépendants|Les points sportifs et le ratio de mégots utilisent des projections séparées.", "Confidentialité|Seuls les noms publics d’équipe et les résultats publiés sont visibles.", "Participation|La liaison à un compte et la confirmation de participation restent séparées du classement."].map((entry) => {
              const [title, description] = entry.split("|");
              return <CmmCard key={title} tone="slate" variant="glass" className="space-y-2 p-4"><h2 className="font-black text-slate-900">{title}</h2><p className="cmm-text-body text-slate-900">{description}</p></CmmCard>;
            })}
          </aside>
        </div>
      </div>
    </main>
  );
}
