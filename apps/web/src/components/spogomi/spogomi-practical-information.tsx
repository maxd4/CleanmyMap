import { CalendarDays, Clock3, LifeBuoy, MapPin, Navigation, PackageCheck, Phone, ShieldCheck } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { formatDateTimeInTimeZone } from "@/lib/time/civil-date";
import type { SpogomiPublicPracticalInformation } from "@/lib/spogomi/public-practical-information";

type Props = {
  startsAt: string;
  endsAt: string | null;
  officialTimezone: string;
  locationLabel: string;
  lifecycleLabel: string;
  registrationLabel: string;
  resultsLabel: string;
  practicalInformation?: SpogomiPublicPracticalInformation | null;
};

function formatDate(value: string, timeZone: string): string {
  return formatDateTimeInTimeZone(value, timeZone, { dateStyle: "long", timeStyle: "short" });
}

function formatTime(value: string, timeZone: string): string {
  return formatDateTimeInTimeZone(value, timeZone, { timeStyle: "short" });
}

function divisionLabel(type: "casual" | "world_cup"): string {
  return type === "world_cup" ? "World Cup" : "Casual";
}

function Detail({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-emerald-100 bg-white/70 p-3"><div className="flex items-center gap-2 font-bold text-emerald-950">{icon}<span>{title}</span></div><div className="cmm-text-body mt-1 text-slate-900">{children}</div></div>;
}

export function SpogomiPracticalInformation({
  startsAt,
  endsAt,
  officialTimezone,
  locationLabel,
  lifecycleLabel,
  registrationLabel,
  resultsLabel,
  practicalInformation,
}: Props) {
  const information = practicalInformation ?? {
    meetingPoint: null,
    collectionZone: null,
    unfoldingMessage: null,
    recommendedMaterials: [],
    materialsProvided: [],
    safetyInstructions: null,
    organizationContact: null,
    assistanceProcedure: null,
    schedules: [],
  } satisfies SpogomiPublicPracticalInformation;

  return <section id="spogomi-practical-information"><CmmCard tone="emerald" variant="glass" className="space-y-4 p-5">
    <div>
      <h2 className="text-xl font-black text-emerald-950">Informations pratiques</h2>
      <p className="cmm-text-body mt-1 text-slate-900">Les éléments affichés proviennent de l’édition publiée, du parcours officiel et des informations approuvées par l’organisation.</p>
    </div>
    <dl className="grid gap-2 text-sm sm:grid-cols-3">
      <div className="rounded-xl border border-emerald-100 bg-white/70 p-3"><dt className="font-bold text-slate-700">État</dt><dd className="mt-1 font-black text-slate-950">{lifecycleLabel}</dd></div>
      <div className="rounded-xl border border-emerald-100 bg-white/70 p-3"><dt className="font-bold text-slate-700">Inscriptions</dt><dd className="mt-1 font-black text-slate-950">{registrationLabel}</dd></div>
      <div className="rounded-xl border border-emerald-100 bg-white/70 p-3"><dt className="font-bold text-slate-700">Résultats</dt><dd className="mt-1 font-black text-slate-950">{resultsLabel}</dd></div>
    </dl>
    <div className="grid gap-3 sm:grid-cols-2">
      <Detail icon={<CalendarDays size={17} aria-hidden="true" />} title="Date et horaires généraux"><p>{formatDate(startsAt, officialTimezone)}{endsAt ? ` → ${formatDate(endsAt, officialTimezone)}` : ""}</p><p className="cmm-text-small mt-1">Fuseau officiel : {officialTimezone}</p></Detail>
      <Detail icon={<MapPin size={17} aria-hidden="true" />} title="Lieu"><p>{locationLabel}</p></Detail>
      <Detail icon={<Navigation size={17} aria-hidden="true" />} title="Point de rendez-vous"><p>{information.meetingPoint ?? "Non communiqué sur cette fiche."}</p></Detail>
      <Detail icon={<MapPin size={17} aria-hidden="true" />} title="Zone de ramassage"><p>{information.collectionZone ?? "Non communiquée sur cette fiche."}</p></Detail>
      <Detail icon={<PackageCheck size={17} aria-hidden="true" />} title="Matériel conseillé"><ListOrFallback values={information.recommendedMaterials} fallback="Non communiqué sur cette fiche." /></Detail>
      <Detail icon={<PackageCheck size={17} aria-hidden="true" />} title="Matériel fourni"><ListOrFallback values={information.materialsProvided} fallback="Non communiqué sur cette fiche." /></Detail>
      <Detail icon={<ShieldCheck size={17} aria-hidden="true" />} title="Consignes de sécurité"><p>{information.safetyInstructions ?? "Consignes détaillées non communiquées sur cette fiche."}</p></Detail>
      <Detail icon={<Phone size={17} aria-hidden="true" />} title="Contact de l’organisation"><p>{information.organizationContact ?? "Contact public non communiqué sur cette fiche."}</p></Detail>
      <Detail icon={<LifeBuoy size={17} aria-hidden="true" />} title="Assistance"><p>{information.assistanceProcedure ?? "Procédure d’assistance non communiquée sur cette fiche."}</p></Detail>
      {information.unfoldingMessage ? <Detail icon={<Clock3 size={17} aria-hidden="true" />} title="Déroulement"><p className="whitespace-pre-wrap">{information.unfoldingMessage}</p></Detail> : null}
    </div>
    {information.schedules.length ? <div className="space-y-2"><h3 className="flex items-center gap-2 font-black text-emerald-950"><Clock3 size={17} aria-hidden="true" />Horaires officiels par division</h3><div className="grid gap-2 sm:grid-cols-2">{information.schedules.map((schedule) => <div key={schedule.divisionId} className="rounded-xl border border-emerald-100 bg-white/70 p-3 text-sm"><p className="font-black text-slate-950">{divisionLabel(schedule.divisionType)}</p><dl className="mt-2 grid gap-1 text-slate-800"><div><dt className="inline font-bold">Début :</dt>{" "}<dd className="inline">{formatTime(schedule.officialStartAt, schedule.timezoneName)}</dd></div><div><dt className="inline font-bold">Fin collecte :</dt>{" "}<dd className="inline">{formatTime(schedule.collectionLimitAt, schedule.timezoneName)}</dd></div><div><dt className="inline font-bold">Tri :</dt>{" "}<dd className="inline">{formatTime(schedule.sortingLimitAt, schedule.timezoneName)}</dd></div><div><dt className="inline font-bold">Pesée :</dt>{" "}<dd className="inline">{formatTime(schedule.weighingStartAt, schedule.timezoneName)} → {formatTime(schedule.weighingEndAt, schedule.timezoneName)}</dd></div></dl><p className="cmm-text-small mt-1">Fuseau : {schedule.timezoneName}</p></div>)}</div></div> : <p className="cmm-text-body rounded-xl border border-dashed border-emerald-200 p-3 text-slate-800">Les horaires détaillés par division ne sont pas encore communiqués.</p>}
    <p className="cmm-text-small text-slate-700">Les coordonnées éventuellement réservées aux participants admis ne sont pas affichées sur cette fiche publique.</p>
  </CmmCard></section>;
}

function ListOrFallback({ values, fallback }: { values: string[]; fallback: string }) {
  return values.length ? <ul className="list-disc space-y-1 pl-5">{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p>{fallback}</p>;
}
