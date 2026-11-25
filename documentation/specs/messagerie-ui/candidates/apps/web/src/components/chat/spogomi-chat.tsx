"use client";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { ArrowLeft, CalendarDays, Send } from "lucide-react";
import { useChatSurfaceActivity } from "./chat-surface-activity-context";
import { SPOGOMI_CHAT_ROOMS, spogomiRoomLabels, spogomiDirectorySchema, spogomiThreadSchema, isSpogomiRoomWritable, type SpogomiRoom, type SpogomiChatEvent } from "@/lib/chat/spogomi-chat-contract";

const endpoint = "/api/chat/spogomi";
async function readJson(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Discussion indisponible.");
  return response.json();
}
export function useSpogomiRoomDirectory(owner: string | undefined) {
  const active = useChatSurfaceActivity();
  const [page, setPage] = useState<{ owner: string; cursor: string } | null>(null);
  const cursor = page?.owner === owner ? page?.cursor : undefined;
  const key = owner && active ? [endpoint, owner, cursor ?? ""] as const : null;
  const result = useSWR(key, async () => spogomiDirectorySchema.parse(await readJson(
    endpoint + (cursor ? "?" + new URLSearchParams({ after: cursor }) : ""),
  )), { refreshInterval: 30_000, revalidateOnFocus: true, keepPreviousData: false });
  const data = key && !result.error ? result.data : undefined;
  return {
    events: data?.events ?? [],
    error: Boolean(result.error),
    loading: Boolean(key && result.isLoading),
    canNext: Boolean(data?.nextCursor),
    canReset: Boolean(cursor),
    next: () => { if (owner && data?.nextCursor) setPage({ owner, cursor: data.nextCursor }); },
    reset: () => setPage(null),
    retry: () => { void result.mutate(); },
  };
}
type Selection = { eventId: string; room: SpogomiRoom } | null;
export function SpogomiRoomDirectory({ directory, selected, onSelect }: {
  directory: ReturnType<typeof useSpogomiRoomDirectory>;
  selected: Selection;
  onSelect: (eventId: string, room: SpogomiRoom) => void;
}) {
  if (!directory.events.length && !directory.canReset && !directory.error) return null;
  return <section className="border-t border-rose-200/60 pt-3 space-y-3">
    {directory.error ? <button type="button" className="text-sm underline" onClick={directory.retry}>Réessayer le chargement des événements</button> : null}
    {directory.events.length ? <h3 className="text-xs font-bold uppercase tracking-wide text-rose-700">Mes événements SPOGOMI</h3> : null}
    {directory.events.map(event => <div key={event.id} className="rounded-xl border border-rose-200/60 p-2">
      <h4 className="flex gap-2 items-start font-semibold text-sm"><CalendarDays size={16} aria-hidden="true" />{event.name}</h4>
      <p className="text-xs opacity-75">{new Date(event.startsAt).toLocaleDateString("fr-FR")}</p>
      <div className="mt-2 space-y-1">{SPOGOMI_CHAT_ROOMS.map(room => {
        const active = selected?.eventId === event.id && selected.room === room;
        return <button key={room} type="button" aria-pressed={active} onClick={() => onSelect(event.id, room)}
          className={`block w-full text-left rounded-lg px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 ${active ? "bg-[var(--cmm-family-primary,#9d174d)] text-white" : "hover:bg-rose-100/50"}`}>{spogomiRoomLabels[room]}</button>;
      })}</div>
    </div>)}
    {directory.canReset ? <button type="button" onClick={directory.reset} className="text-sm underline">Première page</button> : null}
    {directory.canNext ? <button type="button" onClick={directory.next} className="text-sm underline">Autres événements</button> : null}
  </section>;
}

export function SpogomiRoomPane({ owner, event, room, onBack }: {
  owner: string; event: SpogomiChatEvent; room: SpogomiRoom; onBack: () => void;
}) {
  const active = useChatSurfaceActivity();
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<{ createdAt: string; id: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const params = new URLSearchParams({ eventId: event.id, room });
  if (cursor) { params.set("beforeAt", cursor.createdAt); params.set("beforeId", cursor.id); }
  if (search) params.set("q", search);
  const result = useSWR(active ? [endpoint, owner, params.toString()] : null,
    async () => spogomiThreadSchema.parse(await readJson(endpoint + "?" + params)),
    { refreshInterval: cursor || search ? 0 : 20_000, revalidateOnFocus: true, keepPreviousData: false });
  const thread = active && !result.error ? result.data : undefined;
  const writable = Boolean(thread && isSpogomiRoomWritable(thread.event) && !cursor && !search);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!writable || !content.trim() || sending) return;
    setSending(true); setSendError(false);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, room, content }) });
      if (!response.ok) throw new Error("Envoi indisponible");
      setContent(""); await result.mutate();
    } catch { setSendError(true); void result.mutate(); }
    finally { setSending(false); }
  }
  return <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--bg-elevated)]">
    <header className="flex items-center gap-3 border-b border-rose-200/60 p-4">
      <button type="button" onClick={onBack} className="rounded-lg p-2 md:hidden" aria-label="Retour aux salons"><ArrowLeft size={20} /></button>
      <div className="min-w-0"><p className="text-xs font-semibold text-rose-700">SPOGOMI · {event.name}</p>
        <h2 className="font-bold text-lg">{spogomiRoomLabels[room]}</h2></div>
      <button type="button" onClick={onBack} className="ml-auto hidden text-sm underline md:block">Retour</button>
    </header>
    <form className="flex gap-2 px-4 py-3 border-b border-rose-200/40" onSubmit={e => { e.preventDefault(); setSearch(query.trim().length >= 2 ? query.trim() : ""); setCursor(null); }}>
      <input aria-label="Rechercher dans ce salon" className="min-w-0 flex-1 rounded-lg border border-[var(--border-default)] bg-transparent p-2 text-sm" value={query} maxLength={100} onChange={e => setQuery(e.target.value)} placeholder="Rechercher dans ce salon" />
      <button type="submit" className="text-sm font-medium">Rechercher</button>
      {search ? <button type="button" className="text-sm underline" onClick={() => { setQuery(""); setSearch(""); setCursor(null); }}>Effacer</button> : null}
    </form>
    <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite">
      {result.error ? <p role="alert">Discussion indisponible. <button type="button" className="underline" onClick={() => void result.mutate()}>Réessayer</button></p> : null}
      {result.isLoading ? <p>Chargement…</p> : null}
      {cursor ? <button type="button" onClick={() => setCursor(null)} className="text-sm underline">Messages récents</button> : null}
      {thread?.nextCursor ? <button type="button" onClick={() => setCursor(thread.nextCursor)} className="block text-sm underline">Messages précédents</button> : null}
      {thread && !thread.messages.length ? <p className="text-center py-12 text-sm opacity-75">{search ? "Aucun résultat." : "Commencez la discussion de cet événement."}</p> : null}
      {thread?.messages.map(message => <article key={message.id} className={`max-w-[85%] w-fit rounded-2xl px-4 py-3 border border-[var(--border-default)] ${message.senderId === owner ? "ml-auto bg-rose-100/70 text-slate-950" : "bg-[var(--bg-elevated)]"}`}>
        <p className="text-xs font-semibold">{message.senderId === owner ? "Vous" : message.senderName} · {new Date(message.createdAt).toLocaleString("fr-FR")}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.content}</p>
      </article>)}
    </div>
    <form onSubmit={submit} className="shrink-0 border-t border-rose-200/60 p-4">
      <textarea aria-label="Message SPOGOMI" value={content} onChange={e => setContent(e.target.value)} disabled={!writable || sending} rows={4} maxLength={2000}
        placeholder={writable ? "Écrire dans ce salon…" : "Discussion en lecture seule"} className="w-full min-h-24 max-h-56 resize-y rounded-xl border border-[var(--border-default)] bg-transparent p-3 text-sm" />
      <div className="flex items-center justify-between gap-2 pt-2"><span className="text-xs opacity-75">{content.length}/2000</span>
        <button type="submit" disabled={!writable || sending || !content.trim()} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-emerald-800 text-white disabled:opacity-50"><Send size={16} />Envoyer</button></div>
      {sendError ? <p role="alert" className="text-sm text-rose-700">Envoi impossible. Réessayez.</p> : null}
    </form>
  </section>;
}
