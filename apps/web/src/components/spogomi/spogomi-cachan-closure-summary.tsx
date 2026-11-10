import { CmmCard } from "@/components/ui/cmm-card";
import type {
  CachanSyntheticClosureProjection,
  CachanSyntheticDivisionProjection,
} from "@/lib/spogomi/cachan-closure";

type DivisionFilter = "casual" | "world_cup";

function numberLabel(value: number, decimals = 2) {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: decimals });
}

function divisionsFor(
  projection: CachanSyntheticClosureProjection,
  divisionFilter?: DivisionFilter,
) {
  return divisionFilter
    ? projection.divisions.filter(
        (division) => division.divisionType === divisionFilter,
      )
    : projection.divisions;
}

export function SpogomiCachanOverview({
  projection,
}: {
  projection: CachanSyntheticClosureProjection;
}) {
  return (
    <CmmCard tone="amber" variant="glass" className="space-y-4 p-5">
      <div>
        <p className="cmm-text-small font-black uppercase tracking-[0.15em] text-amber-800">
          Simulation clôturée · lecture seule
        </p>
        <h2 className="text-2xl font-black text-slate-950">
          {projection.edition.title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-800">
          {projection.edition.locationLabel} · {projection.edition.date} ·
          fuseau {projection.edition.timezone}
        </p>
      </div>
      <dl className="grid gap-3 text-sm text-slate-800 sm:grid-cols-4">
        <div>
          <dt className="font-black text-slate-950">État</dt>
          <dd>Terminée fictive</dd>
        </div>
        <div>
          <dt className="font-black text-slate-950">Places présentes</dt>
          <dd>
            {projection.presentParticipants} / {projection.placesCount}
          </dd>
        </div>
        <div>
          <dt className="font-black text-slate-950">Équipes</dt>
          <dd>{projection.teamCount}</dd>
        </div>
        <div>
          <dt className="font-black text-slate-950">Divisions</dt>
          <dd>{projection.divisionCount}</dd>
        </div>
      </dl>
      <ol className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
        {projection.edition.chronology.map((step) => (
          <li
            key={step.step}
            className="rounded-lg border border-amber-100 bg-white/70 p-2"
          >
            <span className="font-black text-slate-950">{step.step}</span>
            <br />
            {step.at}
          </li>
        ))}
      </ol>
      <p className="text-sm font-bold text-amber-950">
        {projection.syntheticNotice}
      </p>
    </CmmCard>
  );
}

export function SpogomiCachanTeams({
  projection,
  teams,
}: {
  projection: CachanSyntheticClosureProjection;
  teams: Array<{ team_ref: string; division_ref: string; place_ids: string[] }>;
}) {
  return (
    <section
      id="spogomi-tab-teams"
      className="scroll-mt-6 space-y-4"
      aria-labelledby="cachan-teams-title"
    >
      <div>
        <h2
          id="cachan-teams-title"
          className="text-2xl font-black text-slate-950"
        >
          Équipes participantes
        </h2>
        <p className="mt-1 text-sm text-slate-700">
          Compositions, présences et résultats synthétiques vérifiés ; aucune
          donnée nominative n’est exposée.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {teams.map((team) => {
          const finalTeam = projection.divisions
            .flatMap((division) => division.teams)
            .find((item) => item.teamRef === team.team_ref);
          return (
            <CmmCard
              key={team.team_ref}
              tone="emerald"
              variant="glass"
              className="space-y-3 p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-black text-emerald-950">{team.team_ref}</h3>
                <span className="cmm-text-small font-bold text-slate-700">
                  {finalTeam?.compositionStatus} · {finalTeam?.attendanceStatus}
                </span>
              </div>
              <p className="text-sm text-slate-700">
                Division :{" "}
                {finalTeam?.divisionType === "world_cup"
                  ? "World Cup"
                  : "Casual"}
              </p>
              <p className="text-sm text-slate-700">
                Présents vérifiés : {finalTeam?.presentParticipants ?? 0} ·
                places synthétiques : {team.place_ids.join(", ")}
              </p>
              <p className="cmm-text-small text-slate-600">
                Résultat : {finalTeam?.score ?? "indisponible"} points ·{" "}
                {finalTeam?.directCigaretteButtCount ?? 0} mégots comptés
                directement
              </p>
            </CmmCard>
          );
        })}
      </div>
    </section>
  );
}

export function SpogomiCachanRankings({
  projection,
  divisionFilter,
}: {
  projection: CachanSyntheticClosureProjection;
  divisionFilter?: DivisionFilter;
}) {
  return (
    <section
      id="spogomi-tab-rankings"
      className="scroll-mt-6 space-y-4"
      aria-labelledby="cachan-closure-rankings-title"
    >
      <div>
        <h2
          id="cachan-closure-rankings-title"
          className="text-2xl font-black text-slate-950"
        >
          Classements de simulation
        </h2>
        <p className="mt-1 text-sm text-slate-800">
          Les classements sportif et mégots/participant sont calculés séparément
          dans chaque division. Aucun n’est officiel.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {divisionsFor(projection, divisionFilter).map((division) => (
          <DivisionRanking key={division.divisionRef} division={division} />
        ))}
      </div>
    </section>
  );
}

function DivisionRanking({
  division,
}: {
  division: CachanSyntheticDivisionProjection;
}) {
  return (
    <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5">
      <div>
        <p className="cmm-text-small font-black uppercase tracking-[0.15em] text-emerald-800">
          {division.divisionType === "world_cup" ? "World Cup" : "Casual"}
        </p>
        <h3 className="text-xl font-black text-emerald-950">
          {division.divisionRef}
        </h3>
        <p className="text-sm text-slate-700">
          Règlement synthétique : {division.regulationRef}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="font-black text-slate-950">Sportif</h4>
          <ol className="mt-2 space-y-2 text-sm text-slate-800">
            {division.sportRanking.map((entry) => (
              <li
                key={entry.teamRef}
                className="rounded-lg border border-emerald-100 bg-white/75 p-2"
              >
                <span className="font-black">
                  {entry.rank}. {entry.teamRef}
                </span>
                <br />
                {numberLabel(entry.score)} points ·{" "}
                {numberLabel(entry.massGrams, 0)} g
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h4 className="font-black text-slate-950">Mégots / participant</h4>
          <ol className="mt-2 space-y-2 text-sm text-slate-800">
            {division.buttsPerParticipantRanking.map((entry) => (
              <li
                key={entry.teamRef}
                className="rounded-lg border border-amber-100 bg-white/75 p-2"
              >
                <span className="font-black">
                  {entry.rank}. {entry.teamRef}
                </span>
                <br />
                {numberLabel(entry.value)} mégots/participant ·{" "}
                {entry.directCigaretteButtCount} mégots comptés directement
              </li>
            ))}
          </ol>
        </div>
      </div>
    </CmmCard>
  );
}

export function SpogomiCachanBalance({
  projection,
  divisionFilter,
}: {
  projection: CachanSyntheticClosureProjection;
  divisionFilter?: DivisionFilter;
}) {
  const divisionTotals = divisionFilter
    ? projection.environmentalTotals.byDivision.filter(
        (division) =>
          projection.divisions.find(
            (candidate) => candidate.divisionRef === division.divisionRef,
          )?.divisionType === divisionFilter,
      )
    : projection.environmentalTotals.byDivision;
  const totalMass = divisionFilter
    ? divisionTotals.reduce((sum, division) => sum + division.totalMassGrams, 0)
    : projection.environmentalTotals.totalMassGrams;
  const buttMass = divisionFilter
    ? divisionTotals.reduce(
        (sum, division) => sum + division.cigaretteButtMassGrams,
        0,
      )
    : projection.environmentalTotals.cigaretteButtMassGrams;
  const buttCount = divisionFilter
    ? divisionTotals.reduce(
        (sum, division) => sum + division.directCigaretteButtCount,
        0,
      )
    : projection.environmentalTotals.directCigaretteButtCount;
  return (
    <section id="spogomi-balance" className="scroll-mt-6">
      <CmmCard tone="slate" variant="glass" className="space-y-4 p-5">
        <div>
          <h2 className="text-2xl font-black text-slate-950">
            Bilan environnemental synthétique
          </h2>
          <p className="mt-1 text-sm text-slate-800">
            Les totaux sont dérivés une seule fois des mesures de la projection
            ; la masse des mégots et leur comptage direct restent distincts.
          </p>
        </div>
        <dl className="grid gap-3 text-sm text-slate-800 sm:grid-cols-3">
          <div>
            <dt className="font-black text-slate-950">Masse totale</dt>
            <dd>{numberLabel(totalMass, 0)} g</dd>
          </div>
          <div>
            <dt className="font-black text-slate-950">Masse de mégots</dt>
            <dd>{numberLabel(buttMass, 0)} g</dd>
          </div>
          <div>
            <dt className="font-black text-slate-950">Mégots comptés</dt>
            <dd>{buttCount}</dd>
          </div>
        </dl>
        <ul className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {divisionTotals.map((division) => (
            <li
              key={division.divisionRef}
              className="rounded-lg border border-slate-200 bg-white/70 p-3"
            >
              <span className="font-black text-slate-950">
                {division.divisionRef}
              </span>{" "}
              · {numberLabel(division.totalMassGrams, 0)} g ·{" "}
              {division.directCigaretteButtCount} mégots comptés
            </li>
          ))}
        </ul>
      </CmmCard>
    </section>
  );
}

export function SpogomiCachanClosureSummary({
  projection,
}: {
  projection: CachanSyntheticClosureProjection;
}) {
  return (
    <>
      <SpogomiCachanOverview projection={projection} />
      <SpogomiCachanRankings projection={projection} />
      <SpogomiCachanBalance projection={projection} />
    </>
  );
}
