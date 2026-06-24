import Link from "next/link";
import { SourceBadge, StatCard } from "@/components/ui/page-structure";
import { cn } from "@/lib/utils";
import type { QuizPedagogicalMetricsSnapshot } from "@/lib/learning/quiz-pedagogical-metrics";

function formatRate(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatCount(count: number): string {
  return new Intl.NumberFormat("fr-FR").format(count);
}

function BarRow({
  label,
  value,
  max,
  helper,
  tone = "amber",
  href,
}: {
  label: string;
  value: number;
  max: number;
  helper: string;
  tone?: "amber" | "emerald" | "rose" | "sky";
  href?: string;
}) {
  const width = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;
  const barTone =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "rose"
        ? "bg-rose-500"
        : tone === "sky"
          ? "bg-sky-500"
          : "bg-amber-500";

  const content = (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-950">{label}</p>
          <p className="text-xs text-stone-500">{helper}</p>
        </div>
        <p className="shrink-0 text-sm font-black text-stone-700">{formatCount(value)}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
        <div className={cn("h-full rounded-full", barTone)} style={{ width: `${width}%` }} />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-stone-300 hover:bg-stone-50">
        {content}
      </Link>
    );
  }

  return <div className="rounded-2xl border border-stone-200 bg-white p-4">{content}</div>;
}

export function QuizPedagogicalMetricsPanel({
  snapshot,
}: {
  snapshot: QuizPedagogicalMetricsSnapshot;
}) {
  const topQuestions = snapshot.questionStats.slice(0, 5);
  const easyQuestions = snapshot.easyQuestions.slice(0, 5);
  const hardQuestions = snapshot.hardQuestions.slice(0, 5);
  const weakSkills = snapshot.weakSkills.slice(0, 5);
  const frequentErrors = snapshot.frequentErrors.slice(0, 5);
  const topMode = [...snapshot.modeStats].sort((left, right) => right.sessions - left.sessions || right.attempts - left.attempts)[0] ?? null;
  const maxModeSessions = Math.max(1, ...snapshot.modeStats.map((mode) => mode.sessions));
  const maxQuestionAttempts = Math.max(1, ...snapshot.questionStats.slice(0, 5).map((question) => question.attempts));

  return (
    <section className="space-y-6 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-[0_16px_40px_-32px_rgba(69,45,28,0.18)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-stone-500">Tableau de bord pédagogique</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-950">
            Métriques d&apos;apprentissage
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Vue agrégée et anonyme. Elle aide à repérer les questions trop faciles, trop échouées, les modes les plus joués, les compétences fragiles et les erreurs les plus fréquentes.
          </p>
        </div>
        {topMode ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Mode le plus joué</p>
            <p className="mt-1 text-base font-black text-emerald-950">{topMode.label}</p>
            <p className="mt-1 text-xs font-medium text-emerald-900/75">
              {formatCount(topMode.sessions)} session{topMode.sessions > 1 ? "s" : ""} · {formatRate(topMode.accuracy)} de réussite
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tentatives"
          value={formatCount(snapshot.totalAttempts)}
          tone="amber"
          description="Total des réponses agrégées sur la banque."
          badge={<SourceBadge tone="amber">Agrégé</SourceBadge>}
        />
        <StatCard
          label="Réussite globale"
          value={formatRate(snapshot.overallAccuracy)}
          tone="emerald"
          description="Ratio réponses justes / réponses totales."
          badge={<SourceBadge tone="emerald">Global</SourceBadge>}
        />
        <StatCard
          label="Questions faciles"
          value={formatCount(snapshot.easyQuestions.length)}
          tone="sky"
          description="Au moins 8 tentatives et 85% de réussite ou plus."
          badge={<SourceBadge tone="sky">Seuil haut</SourceBadge>}
        />
        <StatCard
          label="Questions en difficulté"
          value={formatCount(snapshot.hardQuestions.length)}
          tone="rose"
          description="Au moins 6 tentatives et 35% de réussite ou moins."
          badge={<SourceBadge tone="rose">Seuil bas</SourceBadge>}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Questions les plus jouées</p>
            <p className="mt-1 text-sm text-stone-600">Score par question basé sur les tentatives agrégées.</p>
          </div>
          <div className="space-y-3">
            {topQuestions.length > 0 ? (
              topQuestions.map((question) => (
                <BarRow
                  key={question.questionId}
                  label={question.question}
                  value={question.attempts}
                  max={maxQuestionAttempts}
                  helper={`${formatRate(question.accuracy)} · ${question.categoryLabel} · ${question.pedagogicalTypeLabel}`}
                  tone={question.isTooHard ? "rose" : question.isTooEasy ? "emerald" : "amber"}
                  href={`/admin/quiz-bank#${question.questionId}`}
                />
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-500">
                Aucune donnée agrégée pour l&apos;instant.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Modes joués</p>
            <p className="mt-1 text-sm text-stone-600">La longueur de barre reflète le nombre de sessions.</p>
          </div>
          <div className="space-y-3">
            {snapshot.modeStats.map((mode) => (
              <BarRow
                key={mode.id}
                label={mode.label}
                value={mode.sessions}
                max={maxModeSessions}
                helper={`${formatCount(mode.attempts)} tentatives · ${formatRate(mode.accuracy)}`}
                tone={mode.id === "mixte" ? "sky" : "amber"}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Questions trop faciles</p>
            <p className="mt-1 text-sm text-stone-600">À reformuler ou à rendre plus piégeuses.</p>
          </div>
          <div className="space-y-3">
            {easyQuestions.length > 0 ? (
              easyQuestions.map((question) => (
                <BarRow
                  key={question.questionId}
                  label={question.question}
                  value={question.attempts}
                  max={Math.max(1, ...easyQuestions.map((item) => item.attempts))}
                  helper={`${formatRate(question.accuracy)} · ${formatCount(question.attempts)} tentatives`}
                  tone="emerald"
                  href={`/admin/quiz-bank#${question.questionId}`}
                />
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-500">
                Aucune question classée trop facile.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Questions trop échouées</p>
            <p className="mt-1 text-sm text-stone-600">Signalent souvent un piège trop dur ou une explication insuffisante.</p>
          </div>
          <div className="space-y-3">
            {hardQuestions.length > 0 ? (
              hardQuestions.map((question) => (
                <BarRow
                  key={question.questionId}
                  label={question.question}
                  value={question.attempts}
                  max={Math.max(1, ...hardQuestions.map((item) => item.attempts))}
                  helper={`${formatRate(question.accuracy)} · ${formatCount(question.wrongCount)} erreurs`}
                  tone="rose"
                  href={`/admin/quiz-bank#${question.questionId}`}
                />
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-500">
                Aucune question classée trop échouée.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Compétences les moins maîtrisées</p>
            <p className="mt-1 text-sm text-stone-600">Compétences avec assez d&apos;essais pour être interprétables.</p>
          </div>
          <div className="space-y-3">
            {weakSkills.length > 0 ? (
              weakSkills.map((skill) => (
                <BarRow
                  key={skill.skill}
                  label={skill.label}
                  value={skill.attempts}
                  max={Math.max(1, ...weakSkills.map((item) => item.attempts))}
                  helper={`${formatRate(skill.accuracy)} · ${formatCount(skill.wrongCount)} erreurs`}
                  tone="amber"
                />
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-500">
                Aucune compétence fragile pour l&apos;instant.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Types d&apos;erreurs fréquents</p>
            <p className="mt-1 text-sm text-stone-600">Agrégés à partir des réponses fausses seulement.</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {frequentErrors.length > 0 ? (
              frequentErrors.map((error) => (
                <div key={error.errorType} className="rounded-2xl border border-stone-200 bg-white p-4">
                  <p className="text-sm font-semibold text-stone-950">{error.errorType}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {formatCount(error.count)} occurrence{error.count > 1 ? "s" : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-500">
                Aucune erreur agrégée pour le moment.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Lecture rapide</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
            <li>• Une question trop facile ou trop échouée mérite une reformulation ou un meilleur piège.</li>
            <li>• Les modes les plus joués montrent où le quiz est réellement utilisé.</li>
            <li>• Les compétences faibles doivent être recoupées avec les rubriques d&apos;apprentissage associées.</li>
            <li>• Les erreurs fréquentes indiquent un défaut de compréhension plus qu&apos;un simple mauvais choix.</li>
            <li>• Les métriques restent agrégées, sans identifiant utilisateur ni réponse brute conservée.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/documentation/features/quiz-quality-control.md" className="rounded-full border border-stone-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-600 transition hover:border-stone-300">
              Grille qualité
            </Link>
            <Link href="/documentation/features/quiz-authoring-guide.md" className="rounded-full border border-stone-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-600 transition hover:border-stone-300">
              Guide d&apos;authoring
            </Link>
          </div>
        </div>
      </section>
    </section>
  );
}
