import Link from "next/link";
import { ArrowRight, Medal } from "lucide-react";
import type { SpogomiCollection } from "@/lib/spogomi/collection";
import { getSpogomiBadgePresentation } from "@/lib/spogomi/collection";

export function ProfileSpogomiSummary({ collection }: { collection: SpogomiCollection | null }) {
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
    </section>
  );
}
