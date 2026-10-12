import Link from "next/link";
import { ArrowRight, Medal } from "lucide-react";
import type { SpogomiCollection } from "@/lib/spogomi/collection";
import { getSpogomiBadgePresentation } from "@/lib/spogomi/collection";
import type { SpogomiRecognitionKind } from "@/lib/spogomi/recognition";
import { SpogomiVolunteerShareButton } from "@/components/spogomi/spogomi-volunteer-share-button";

type ProfileVolunteerSummary = {
  confirmedEventCount: number;
  certifiedMissionCount: number;
  certifiedRefereeOrganizerMissionCount: number;
  chronology: Array<{ eventId: string; eventName: string; eventSlug: string | null; eventPublic: boolean; eventDate: string; locationLabel: string; missions: Array<{ id: string; kind: SpogomiRecognitionKind; status: "certified" | "revoked" }> }>;
  certificates: Array<{ certificateReference: string; eventId: string; status: "active" | "revoked" | "replaced"; issuedAt: string }>;
};

const missionLabels: Record<SpogomiRecognitionKind, string> = {
  collector: "Collecte", referee: "Arbitrage", organizer: "Organisation", finish_control: "Contrôle d’arrivée",
  field_safety: "Sécurité terrain", weighing_sorting: "Pesée et tri", logistics_support: "Logistique",
};

export function ProfileSpogomiSummary({ collection, volunteerSummary }: { collection: SpogomiCollection | null; volunteerSummary?: ProfileVolunteerSummary | null }) {
  const latest = collection?.awards.find((award) => award.status === "active") ?? null;
  const latestPresentation = latest ? getSpogomiBadgePresentation(latest.badgeTypeId) : null;
  return (
    <section aria-labelledby="profile-spogomi-title" className="mt-5 rounded-2xl border border-emerald-200/20 bg-[rgba(4,40,29,0.34)] p-5 shadow-[0_18px_36px_-28px_rgba(6,78,59,0.8)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-200"><Medal size={19} aria-hidden="true" /></div>
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200/80">SPOGOMI</p><h2 id="profile-spogomi-title" className="mt-1 text-lg font-black text-white">Vos distinctions certifiées</h2><p className="mt-1 text-sm leading-6 text-emerald-50/75">Ce compteur est séparé de votre badgeTotal et de l’XP globale.</p></div>
        </div>
        <Link href="/sections/gamification#spogomi-collection" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-950 hover:bg-white">Voir la collection <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-emerald-100/15 bg-black/10 px-4 py-3"><dt className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100/65">Badges actifs</dt><dd className="mt-1 text-xl font-black text-white">{collection?.spogomiAwardCount ?? "—"}</dd></div><div className="rounded-xl border border-emerald-100/15 bg-black/10 px-4 py-3"><dt className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100/65">Événements terrain</dt><dd className="mt-1 text-xl font-black text-white">{collection?.spogomiEventsParticipated ?? "—"}</dd></div><div className="rounded-xl border border-emerald-100/15 bg-black/10 px-4 py-3"><dt className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100/65">Dernière distinction</dt><dd className="mt-1 truncate text-sm font-black text-emerald-100">{latestPresentation?.label ?? "Aucune encore"}</dd>{latest ? <p className="mt-1 truncate text-xs text-emerald-50/65">{latest.eventName} · {latest.eventYear}</p> : null}</div></dl>
      {volunteerSummary ? <div className="mt-4 space-y-3 rounded-xl border border-emerald-100/15 bg-black/10 p-4">
        <div className="grid gap-3 sm:grid-cols-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100/65">Participations confirmées</p><p className="mt-1 text-lg font-black text-white">{volunteerSummary.confirmedEventCount}</p></div><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100/65">Missions certifiées</p><p className="mt-1 text-lg font-black text-white">{volunteerSummary.certifiedMissionCount}</p></div><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100/65">Arbitrage / organisation</p><p className="mt-1 text-lg font-black text-white">{volunteerSummary.certifiedRefereeOrganizerMissionCount}</p></div></div>
        {volunteerSummary.chronology.length ? <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100/65">Chronologie des missions</p><ul className="mt-2 space-y-2">{volunteerSummary.chronology.filter((event) => event.missions.some((mission) => mission.status === "certified")).slice(0, 6).map((event) => { const missions = event.missions.filter((mission) => mission.status === "certified"); return <li key={event.eventId} className="rounded-lg border border-emerald-100/10 px-3 py-2 text-sm text-emerald-50/90"><span className="font-black">{event.eventName}</span><span className="ml-2 text-xs text-emerald-50/60">{event.eventDate} · {event.locationLabel}</span><p className="mt-1 text-xs text-emerald-50/70">{missions.map((mission) => missionLabels[mission.kind]).join(" · ")}</p>{event.eventPublic && event.eventSlug ? <div className="mt-2"><SpogomiVolunteerShareButton eventName={event.eventName} eventDate={event.eventDate} mission={missions.map((mission) => missionLabels[mission.kind]).join(" · ")} eventHref={`/spogomi/${encodeURIComponent(event.eventSlug)}`} /></div> : null}</li>; })}</ul></div> : <p className="text-sm text-emerald-50/70">Aucune mission bénévole certifiée pour le moment.</p>}
        {volunteerSummary.certificates.length ? <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100/65">Attestations</p><ul className="mt-2 space-y-2">{volunteerSummary.certificates.slice(0, 6).map((certificate) => <li key={certificate.certificateReference} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100/10 px-3 py-2 text-xs text-emerald-50/80"><span>{certificate.status === "active" ? "Valide" : "Révoquée"} · {certificate.certificateReference}</span>{certificate.status === "active" ? <a className="inline-flex min-h-9 items-center gap-1 font-black text-emerald-200 underline" href={`/api/spogomi/certificates/${encodeURIComponent(certificate.certificateReference)}`}><span className="sr-only">Télécharger </span>PDF</a> : null}</li>)}</ul></div> : null}
      </div> : null}
    </section>
  );
}
