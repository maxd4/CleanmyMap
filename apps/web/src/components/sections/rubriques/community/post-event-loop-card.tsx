"use client";

import { formatFrDate } from"@/components/sections/rubriques/community/helpers";
import type { PostEventLoop } from"@/components/sections/rubriques/community/types";

type CommunityPostEventLoopCardProps = {
 postEventLoop: PostEventLoop;
};

function CommunityPostEventLoopCard(props: CommunityPostEventLoopCardProps) {
 const { postEventLoop } = props;

 return (
 <div className="rounded-xl border border-slate-200 bg-white p-4">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <h2 className="cmm-text-small font-semibold cmm-text-primary">
 Boucle post-evenement (retour d&apos;experience)
 </h2>
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary">
 {postEventLoop.closedCount}/{postEventLoop.total} boucle(s) fermee(s)
 </p>
 </div>
 <p className="mt-1 cmm-text-small cmm-text-secondary">
 Taux de fermeture:{""}
 <span className="font-semibold">
 {postEventLoop.completionRate.toFixed(1)}%
 </span>{""}
 (presence renseignee + post-mortem + action liee).
 </p>
 <ul className="mt-3 space-y-2 cmm-text-small cmm-text-secondary">
 {postEventLoop.missing.map((row) => (
 <li
 key={row.event.id}
 className="rounded-lg border border-slate-200 bg-slate-50 p-3"
 >
 <p className="font-semibold">{row.event.title}</p>
 <p className="cmm-text-caption cmm-text-muted">
 {formatFrDate(row.event.eventDate)} - {row.event.locationLabel}
 </p>
 <p className="mt-1 cmm-text-caption">
 Manques:{""}
 {[
 !row.hasAttendance ?"presence" : null,
 !row.hasPostMortem ?"post-mortem" : null,
 !row.hasLinkedAction ?"action post-evenement" : null,
 ]
 .filter(Boolean)
 .join(",")}
 </p>
 </li>
 ))}
 {postEventLoop.missing.length === 0 ? (
 <li className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
 Toutes les boucles post-evenement sont completes.
 </li>
 ) : null}
 </ul>
 </div>
 );
}

export { CommunityPostEventLoopCard };
