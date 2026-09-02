import { ArrowRight } from "lucide-react";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import { cn } from "@/lib/utils";
import { getQuizSchoolTrackLabel, QUIZ_SCHOOL_TRACKS } from "@/components/learn/quiz/school/quiz-school-modes";
import {
  QUIZ_SCHOOL_KIT_BANK,
  groupQuizSchoolKitQuestionsByTrack,
} from "@/lib/learning/quiz/school/quiz-school-kit";

const bankByTrack = groupQuizSchoolKitQuestionsByTrack(QUIZ_SCHOOL_KIT_BANK);

const BANK_SUMMARY = [
  { value: "1", label: { fr: "banque partagée", en: "shared bank" } },
  { value: "4", label: { fr: "tracks internes", en: "internal tracks" } },
  { value: "Auto", label: { fr: "sélection par niveau", en: "level-based selection" } },
  { value: "30/60", label: { fr: "formats publics", en: "public formats" } },
] as const;

function QuestionStatusBadge({
  kind,
  label,
  href,
  note,
}: {
  kind?: "source" | "needsReview";
  label?: string;
  href?: string;
  note?: string;
}) {
  if (!kind) return null;

  if (kind === "source" && label && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-800 transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
      >
        {label}
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </a>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-800">
      À vérifier
      {note ? <span className="ml-2 hidden font-medium normal-case tracking-normal text-amber-700 md:inline">{note}</span> : null}
    </span>
  );
}

export function QuizSchoolBankSection({ locale }: { locale: SupportedLocale }) {
  const isFrench = locale === "fr";

  return (
    <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {isFrench ? "Banque en réserve" : "Bank in reserve"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {isFrench ? "Sous-modes disponibles si besoin" : "Sub-modes available if needed"}
          </h3>
          <p className="mt-2 text-sm font-bold text-slate-800 md:text-base">
            {isFrench ? "Une banque partagée, sélectionnée selon le niveau" : "One shared bank, selected by level"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 md:text-base">
            {isFrench
              ? "La banque reste derrière le déroulé principal. Elle sert à ajuster un sous-mode, prolonger le débat ou préparer une séance sans prendre la place du lancement."
              : "The bank sits behind the main flow. It helps adjust a sub-mode, extend the debate or prepare a session without taking over the launch."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {BANK_SUMMARY.map((item) => (
            <div key={item.label.fr} className="rounded-[1.3rem] border border-amber-200 bg-amber-50 px-4 py-3 text-center shadow-sm">
              <p className="text-2xl font-black tracking-tight text-amber-900">{item.value}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{item.label[locale]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {QUIZ_SCHOOL_TRACKS.map((track) => {
          const questions = bankByTrack[track.id];
          return (
            <article key={track.id} className="rounded-[1.6rem] border border-amber-100 bg-amber-50/60 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-inner", track.tone)}>
                  {track.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">{getQuizSchoolTrackLabel(track.id, locale)}</p>
                  <h4 className="mt-1 text-base font-black tracking-tight text-slate-900">{getQuizSchoolTrackLabel(track.id, locale)}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-base">{track.description[locale]}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white bg-white px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{isFrench ? "Temps collectif" : "Collective step"}</span>
                <span className="text-sm font-black text-amber-900">{questions.length} questions</span>
              </div>
            </article>
          );
        })}
      </div>

      <details className="group overflow-hidden rounded-[1.8rem] border border-amber-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 outline-none transition hover:bg-amber-50/60 focus-visible:bg-amber-50/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/70 md:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">{isFrench ? "Détails de la banque" : "Bank details"}</p>
            <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900">{isFrench ? "Ouvrir les questions détaillées" : "Open the detailed questions"}</h4>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-800">Support</span>
        </summary>
        <div className="border-t border-amber-100 p-5 md:p-6">
          <div className="space-y-4">
            {QUIZ_SCHOOL_TRACKS.map((track) => {
              const questions = bankByTrack[track.id];
              return (
                <details key={track.id} className="group overflow-hidden rounded-[2rem] border border-amber-200 bg-white shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 outline-none transition hover:bg-amber-50/60 focus-visible:bg-amber-50/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/70 md:px-6">
                    <div className="flex items-center gap-3">
                      <span className={cn("inline-flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner", track.tone)}>{track.icon}</span>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">{getQuizSchoolTrackLabel(track.id, locale)}</p>
                        <h5 className="mt-1 text-xl font-black tracking-tight text-slate-900">{getQuizSchoolTrackLabel(track.id, locale)}</h5>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{track.description[locale]}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-800">{questions.length} questions</span>
                  </summary>
                  <div className="border-t border-amber-100 p-5 md:p-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                      {questions.map((question, index) => (
                        <article key={question.id} className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{String(index + 1).padStart(2, "0")} · {question.typeLabel}</p>
                              <h6 className="mt-1 text-base font-black leading-snug text-slate-900">{question.question}</h6>
                            </div>
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white text-xs font-black text-amber-900 shadow-sm">{index + 1}</span>
                          </div>
                          <div className="mt-4 space-y-3">
                            <div className="rounded-2xl border border-white bg-white p-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">{isFrench ? "Réponse attendue" : "Expected answer"}</p>
                              <p className="mt-1 text-sm font-bold text-slate-900 md:text-base">{question.answer}</p>
                            </div>
                            <div className="rounded-2xl border border-white bg-white p-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{isFrench ? "Explication courte" : "Short explanation"}</p>
                              <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-base">{question.explanation}</p>
                            </div>
                            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">À retenir</p>
                              <p className="mt-1 text-sm font-medium text-amber-950 md:text-base">{question.takeaway}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <QuestionStatusBadge
                                kind={question.status?.kind}
                                label={question.status?.kind === "source" ? question.status.label : undefined}
                                href={question.status?.kind === "source" ? question.status.href : undefined}
                                note={question.status?.kind === "needsReview" ? question.status.note : undefined}
                              />
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </details>
    </section>
  );
}
