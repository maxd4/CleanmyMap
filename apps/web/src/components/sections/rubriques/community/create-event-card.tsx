"use client";

import type { CreateCommunityEventForm } from"@/components/sections/rubriques/community/types";

type CommunityCreateEventCardProps = {
 createForm: CreateCommunityEventForm;
 updateCreateForm: <K extends keyof CreateCommunityEventForm>(
 key: K,
 value: CreateCommunityEventForm[K],
 ) => void;
 onCreateEvent: () => Promise<void>;
 isCreatingEvent: boolean;
 eventsValidating: boolean;
 onReloadEvents: () => Promise<unknown>;
};

function CommunityCreateEventCard(props: CommunityCreateEventCardProps) {
 const {
 createForm,
 updateCreateForm,
 onCreateEvent,
 isCreatingEvent,
 eventsValidating,
 onReloadEvents,
 } = props;

 return (
 <div className="rounded-xl border border-slate-200 bg-white p-4">
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div>
 <h2 className="cmm-text-small font-semibold cmm-text-primary">
 Creer un evenement communautaire
 </h2>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 Creation cote serveur via <code>/api/community/events</code>,
 visible ensuite sur tous les devices.
 </p>
 </div>
 <button
 onClick={() => void onReloadEvents()}
 className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary transition hover:bg-slate-100"
 >
 {eventsValidating ?"Actualisation..." :"Rafraichir agenda"}
 </button>
 </div>

 <div className="mt-3 grid gap-3 md:grid-cols-2">
 <label className="flex flex-col gap-1 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary">
 Titre
 <input
 value={createForm.title}
 onChange={(event) => updateCreateForm("title", event.target.value)}
 placeholder="Nettoyage Canal Saint-Martin"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-small font-normal cmm-text-primary outline-none transition focus:border-emerald-500"
 />
 </label>
 <label className="flex flex-col gap-1 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary">
 Date
 <input
 type="date"
 value={createForm.eventDate}
 onChange={(event) =>
 updateCreateForm("eventDate", event.target.value)
 }
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-small font-normal cmm-text-primary outline-none transition focus:border-emerald-500"
 />
 </label>
 <label className="flex flex-col gap-1 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary">
 Capacite cible
 <input
 type="number"
 min={1}
 value={createForm.capacityTarget}
 onChange={(event) =>
 updateCreateForm("capacityTarget", event.target.value)
 }
 placeholder="Ex: 40"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-small font-normal cmm-text-primary outline-none transition focus:border-emerald-500"
 />
 </label>
 <label className="flex flex-col gap-1 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary md:col-span-2">
 Lieu
 <input
 value={createForm.locationLabel}
 onChange={(event) =>
 updateCreateForm("locationLabel", event.target.value)
 }
 placeholder="Canal Saint-Martin, Paris 10e"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-small font-normal cmm-text-primary outline-none transition focus:border-emerald-500"
 />
 </label>
 <label className="flex flex-col gap-1 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary md:col-span-2">
 Description
 <textarea
 value={createForm.description}
 onChange={(event) =>
 updateCreateForm("description", event.target.value)
 }
 rows={3}
 placeholder="Collecte, zone ciblee, points logistiques."
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-small font-normal cmm-text-primary outline-none transition focus:border-emerald-500"
 />
 </label>
 </div>

 <div className="mt-3">
 <button
 onClick={() => void onCreateEvent()}
 disabled={isCreatingEvent}
 className="rounded-lg bg-emerald-600 px-4 py-2 cmm-text-small font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
 >
 {isCreatingEvent ?"Creation..." :"Creer l'evenement"}
 </button>
 </div>
 </div>
 );
}

export { CommunityCreateEventCard };
