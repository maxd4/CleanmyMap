import { CmmCard } from "@/components/ui/cmm-card";
import type { CachanSyntheticClosureProjection } from "@/lib/spogomi/cachan-closure";

function numberLabel(value: number, decimals = 2) {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: decimals });
}

export function SpogomiCachanClosureSummary({ projection }: { projection: CachanSyntheticClosureProjection }) {
  return <>
    <CmmCard tone="amber" variant="glass" className="space-y-4 p-5">
      <div>
        <p className="cmm-text-small font-black uppercase tracking-[0.15em] text-amber-800">Simulation clôturée · lecture seule</p>
        <h2 className="text-2xl font-black text-slate-950">{projection.edition.title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-800">{projection.edition.locationLabel} · {projection.edition.date} · fuseau {projection.edition.timezone}</p>
      </div>
      <dl className="grid gap-3 text-sm text-slate-800 sm:grid-cols-4">
        <div><dt className="font-black text-slate-950">État</dt><dd>Terminée fictive</dd></div>
        <div><dt className="font-black text-slate-950">Places présentes</dt><dd>{projection.presentParticipants} / {projection.placesCount}</dd></div>
        <div><dt className="font-black text-slate-950">Équipes</dt><dd>{projection.teamCount}</dd></div>
        <div><dt className="font-black text-slate-950">Divisions</dt><dd>{projection.divisionCount}</dd></div>
      </dl>
      <ol className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
        {projection.edition.chronology.map((step) => <li key={step.step} className="rounded-lg border border-amber-100 bg-white/70 p-2"><span className="font-black text-slate-950">{step.step}</span><br />{step.at}</li>)}
      </ol>
      <p className="text-sm font-bold text-amber-950">{projection.syntheticNotice}</p>
    </CmmCard>

    <section className="space-y-4" aria-labelledby="cachan-closure-rankings-title">
      <div><h2 id="cachan-closure-rankings-title" className="text-2xl font-black text-slate-950">Classements de simulation</h2><p className="mt-1 text-sm text-slate-800">Les classements sportif et mégots/participant sont calculés séparément dans chaque division. Aucun n&apos;est officiel.</p></div>
      <div className="grid gap-5 lg:grid-cols-2">
        {projection.divisions.map((division) => <CmmCard key={division.divisionRef} tone="emerald" variant="glass" className="space-y-4 p-5">
          <div><p className="cmm-text-small font-black uppercase tracking-[0.15em] text-emerald-800">{division.divisionType === "world_cup" ? "World Cup" : "Casual"}</p><h3 className="text-xl font-black text-emerald-950">{division.divisionRef}</h3><p className="text-sm text-slate-700">Règlement synthétique : {division.regulationRef}</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><h4 className="font-black text-slate-950">Sportif</h4><ol className="mt-2 space-y-2 text-sm text-slate-800">{division.sportRanking.map((entry) => <li key={entry.teamRef} className="rounded-lg border border-emerald-100 bg-white/75 p-2"><span className="font-black">{entry.rank}. {entry.teamRef}</span><br />{numberLabel(entry.score)} points · {numberLabel(entry.massGrams, 0)} g</li>)}</ol></div>
            <div><h4 className="font-black text-slate-950">Mégots / participant</h4><ol className="mt-2 space-y-2 text-sm text-slate-800">{division.buttsPerParticipantRanking.map((entry) => <li key={entry.teamRef} className="rounded-lg border border-amber-100 bg-white/75 p-2"><span className="font-black">{entry.rank}. {entry.teamRef}</span><br />{numberLabel(entry.value)} mégots · {entry.directCigaretteButtCount} comptés</li>)}</ol></div>
          </div>
        </CmmCard>)}
      </div>
    </section>

    <CmmCard tone="slate" variant="glass" className="space-y-4 p-5">
      <div><h2 className="text-2xl font-black text-slate-950">Bilan environnemental synthétique</h2><p className="mt-1 text-sm text-slate-800">Les totaux sont dérivés une seule fois des mesures de la projection ; la masse des mégots et leur comptage direct restent distincts.</p></div>
      <dl className="grid gap-3 text-sm text-slate-800 sm:grid-cols-3"><div><dt className="font-black text-slate-950">Masse totale</dt><dd>{numberLabel(projection.environmentalTotals.totalMassGrams, 0)} g</dd></div><div><dt className="font-black text-slate-950">Masse de mégots</dt><dd>{numberLabel(projection.environmentalTotals.cigaretteButtMassGrams, 0)} g</dd></div><div><dt className="font-black text-slate-950">Mégots comptés</dt><dd>{projection.environmentalTotals.directCigaretteButtCount}</dd></div></dl>
      <ul className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">{projection.environmentalTotals.byDivision.map((division) => <li key={division.divisionRef} className="rounded-lg border border-slate-200 bg-white/70 p-3"><span className="font-black text-slate-950">{division.divisionRef}</span> · {numberLabel(division.totalMassGrams, 0)} g · {division.directCigaretteButtCount} mégots comptés</li>)}</ul>
    </CmmCard>
  </>;
}
