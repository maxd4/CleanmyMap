import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { SpogomiCountdown } from "./spogomi-countdown";

export function SpogomiFutureCard() {
  return (
    <section className="rounded-[1.25rem] border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-4 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.24)] sm:p-5" aria-labelledby="spogomi-future-card-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-800" aria-hidden="true"><Trophy size={18} /></span>
          <div className="min-w-0 space-y-1">
            <h3 id="spogomi-future-card-title" className="text-base font-black text-emerald-950">Compétitions SPOGOMI</h3>
      <p className="text-sm leading-relaxed text-slate-900">Découvrez les compétitions publiées et leurs parcours CleanMyMap associés.</p>
            <SpogomiCountdown startsAt={null} />
          </div>
        </div>
        <Link href="/spogomi" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-black text-emerald-900 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          Découvrir SPOGOMI <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
