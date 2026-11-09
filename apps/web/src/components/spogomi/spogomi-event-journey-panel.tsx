import { ArrowRight, BadgeCheck, CircleAlert, Clock3, LockKeyhole, ListChecks } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { journeyStatusLabel, type SpogomiEventJourney, type SpogomiJourneyStatus, type SpogomiJourneyStep } from "@/lib/spogomi/event-journey";

const STATUS_STYLES: Record<SpogomiJourneyStatus, string> = {
  todo: "border-amber-200 bg-amber-50 text-amber-900",
  pending: "border-sky-200 bg-sky-50 text-sky-900",
  validated: "border-emerald-200 bg-emerald-50 text-emerald-900",
  later: "border-slate-200 bg-slate-50 text-slate-700",
  access_required: "border-violet-200 bg-violet-50 text-violet-900",
  indeterminate: "border-slate-300 bg-white text-slate-700",
};

function StatusIcon({ status }: { status: SpogomiJourneyStatus }) {
  if (status === "validated") return <BadgeCheck size={15} aria-hidden="true" />;
  if (status === "pending" || status === "later") return <Clock3 size={15} aria-hidden="true" />;
  if (status === "access_required") return <LockKeyhole size={15} aria-hidden="true" />;
  if (status === "indeterminate") return <CircleAlert size={15} aria-hidden="true" />;
  return <ListChecks size={15} aria-hidden="true" />;
}

function StatusBadge({ status }: { status: SpogomiJourneyStatus }) {
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-black ${STATUS_STYLES[status]}`}><StatusIcon status={status} />{journeyStatusLabel(status)}</span>;
}

function StepRow({ step }: { step: SpogomiJourneyStep }) {
  const content = <><div className="min-w-0 flex-1"><p className="font-bold text-slate-950">{step.title}</p><p className="cmm-text-small mt-0.5 text-slate-700">{step.description}</p></div><StatusBadge status={step.status} />{step.href && step.status !== "validated" ? <ArrowRight size={16} className="shrink-0 text-emerald-700" aria-hidden="true" /> : null}</>;
  return step.href && step.status !== "validated"
    ? <a href={step.href} className="flex min-w-0 items-start gap-3 rounded-xl border border-black/10 bg-white/70 p-3 transition hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">{content}</a>
    : <div className="flex min-w-0 items-start gap-3 rounded-xl border border-black/10 bg-white/70 p-3">{content}</div>;
}

export function SpogomiEventJourneyPanel({ journey }: { journey: SpogomiEventJourney }) {
  return <section aria-labelledby="spogomi-event-journey-title" className="space-y-4">
    <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5">
      <div>
        <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-emerald-700">Votre prochaine étape</p>
        <h2 id="spogomi-event-journey-title" className="mt-1 text-xl font-black text-emerald-950">{journey.next.title}</h2>
        <p className="cmm-text-body mt-1 text-slate-900">{journey.next.description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3"><StatusBadge status={journey.next.status} />{journey.next.href ? <CmmButton href={journey.next.href} tone="primary" size="sm" variant="pill">Ouvrir cette étape</CmmButton> : null}</div>
      <div className="space-y-2" aria-label="Étapes du parcours compétiteur"><p className="cmm-text-small font-black uppercase tracking-[0.12em] text-slate-600">Autres étapes</p>{journey.steps.map((step) => <StepRow key={step.key} step={step} />)}</div>
    </CmmCard>
    {journey.authorizedSpaces.length ? <CmmCard tone="slate" variant="glass" className="space-y-3 p-5" aria-labelledby="spogomi-authorized-spaces-title">
      <div><h2 id="spogomi-authorized-spaces-title" className="font-black text-slate-950">Espaces autorisés pour cette édition</h2><p className="cmm-text-body mt-1 text-slate-800">Ces accès correspondent aux habilitations actives pour votre compte et restent limités à cette compétition.</p></div>
      <div className="grid gap-2 sm:grid-cols-2">{journey.authorizedSpaces.map((space) => <a key={space.key} href={space.href} className="flex items-start gap-3 rounded-xl border border-black/10 bg-white/75 p-3 font-bold text-slate-950 hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><span className="min-w-0 flex-1"><span className="block">{space.title}</span><span className="cmm-text-small mt-0.5 block font-normal text-slate-700">{space.description}</span></span><ArrowRight size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" /></a>)}</div>
    </CmmCard> : null}
  </section>;
}
