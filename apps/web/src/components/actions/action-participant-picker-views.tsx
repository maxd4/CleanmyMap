import { Info, Loader2, Plus, Search, X } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { getPickerSearchKeyAction, labelForUser, type ChatUserOption, type InvitationStatus } from "./action-participant-picker-model";
import type { ParticipantPickerModel } from "./use-action-participant-picker-model";

export function PickerHeader({ title, description, count, showHelp, onToggleHelp }: { title: string; description: string; count: number; showHelp: boolean; onToggleHelp: () => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1"><div className="flex items-center gap-2"><h4 className="text-sm font-semibold text-emerald-950">{title}</h4><button type="button" onClick={onToggleHelp} aria-label={showHelp ? "Masquer l'aide" : "Afficher l'aide"} aria-expanded={showHelp} className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 transition hover:bg-emerald-50"><Info size={12} /></button></div><p className="text-xs leading-5 text-emerald-900/68">{description}</p></div>
      <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-900">{count} membre{count > 1 ? "s" : ""}</span>
      {showHelp ? <p className="basis-full rounded-2xl border border-emerald-200/70 bg-white/90 px-3 py-2 text-xs leading-5 text-emerald-900/72">Recherchez un pseudo, un nom affiché ou un identifiant utilisateur. Les membres ajoutés ici sont rattachés directement à l&apos;action.</p> : null}
    </div>
  );
}

export function PickerSearch({ id, label = "Ajouter un membre", query, onChange, onFocus, onSearch, onClose }: { id: string; label?: string; query: string; onChange: (value: string) => void; onFocus: () => void; onSearch: () => void; onClose: () => void }) {
  return (
    <label htmlFor={id} className="block space-y-1.5"><span className="text-xs font-semibold text-emerald-950">{label}</span><div className="relative"><Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700/55" /><input id={id} type="search" value={query} onChange={(event) => onChange(event.target.value)} onFocus={onFocus} onClick={onFocus} onKeyDown={(event) => { const action = getPickerSearchKeyAction(event.key); if (action === "submit") { event.preventDefault(); onSearch(); } if (action === "close") { event.preventDefault(); onClose(); } }} placeholder="Pseudo, nom affiché ou ID utilisateur" className="w-full rounded-2xl border border-emerald-200/70 bg-white px-10 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-[#F8FCF8]" /></div></label>
  );
}

export function ParticipantResultsMenu({ model }: { model: ParticipantPickerModel }) {
  return (
    <div className="relative space-y-3 rounded-2xl border border-emerald-200/80 bg-white/95 p-3 shadow-lg" role="region" aria-label="Comptes disponibles">
      {model.loading ? <div className="flex items-center gap-2 text-xs font-medium text-emerald-900/62" aria-live="polite"><Loader2 size={14} className="animate-spin text-emerald-700" />{model.requestMode === "more" ? "Chargement des comptes suivants..." : model.requestMode === "initial" ? "Chargement des comptes..." : "Recherche en cours..."}</div> : null}
      {model.error ? <p className="text-xs font-medium text-rose-700" aria-live="polite" role="alert">{model.error}</p> : null}
      {model.initialized && !model.loading && model.results.length === 0 && !model.error ? <p className="text-xs font-medium text-emerald-900/60">Aucun compte trouvé.</p> : null}
      {model.results.length > 0 ? <div className="space-y-2" role="list">{model.results.map((user) => <ParticipantResult key={user.id} user={user} selected={model.selectedIds.includes(user.id)} onAdd={model.addUser} />)}</div> : null}
      <div className="flex flex-wrap gap-2 border-t border-emerald-100 pt-3"><CmmButton type="button" tone="tertiary" variant="ghost" size="md" className="text-amber-700 hover:text-amber-800" onClick={model.submitSearch} loading={model.requestMode === "search"} disabled={model.requestMode === "more"}><Search size={15} aria-hidden="true" />Rechercher</CmmButton>{model.hasMore && model.nextOffset !== null ? <CmmButton type="button" tone="tertiary" variant="ghost" size="md" className="text-amber-700 hover:text-amber-800" onClick={model.loadMore} loading={model.requestMode === "more"} disabled={model.requestMode === "search" || model.requestMode === "initial"}><Plus size={15} aria-hidden="true" />Afficher +</CmmButton> : null}</div>
    </div>
  );
}

function ParticipantResult({ user, selected, onAdd }: { user: ChatUserOption; selected: boolean; onAdd: (user: ChatUserOption) => void }) {
  return <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white px-3 py-2" role="listitem"><div className="min-w-0"><p className="truncate text-sm font-semibold text-emerald-950">{labelForUser(user)}</p><p className="truncate text-xs text-emerald-900/58">{user.handle ? `@${user.handle}` : user.id}</p></div><button type="button" onClick={() => onAdd(user)} disabled={selected} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={13} />{selected ? "Ajouté" : "Ajouter"}</button></div>;
}

export function SingleAccountResults({ model, onSelect, onSelectOther }: { model: ParticipantPickerModel; onSelect: (user: ChatUserOption) => void; onSelectOther: () => void }) {
  return (
    <div className="space-y-3" role="listbox" aria-label="Comptes utilisateurs">
      {model.loading ? <div className="flex items-center gap-2 text-xs font-medium text-emerald-900/62" aria-live="polite"><Loader2 size={14} className="animate-spin text-emerald-700" />{model.requestMode === "more" ? "Chargement des comptes suivants..." : model.requestMode === "initial" ? "Chargement des comptes..." : "Recherche en cours..."}</div> : null}
      {model.error ? <p className="text-xs font-medium text-rose-700" aria-live="polite" role="alert">{model.error}</p> : null}
      {model.initialized && !model.loading && model.results.length === 0 && !model.error ? <p className="text-xs font-medium text-emerald-900/60">Aucun compte trouvé.</p> : null}
      {model.results.length > 0 ? <div className="space-y-2">{model.results.map((user) => <SingleAccountResult key={user.id} user={user} selected={model.selectedIds.includes(user.id)} onSelect={onSelect} />)}</div> : null}
      <div className="flex flex-wrap gap-2 border-t border-emerald-100 pt-3">
        <CmmButton type="button" tone="tertiary" variant="ghost" size="md" className="text-amber-700 hover:text-amber-800" onClick={model.submitSearch} loading={model.requestMode === "search"} disabled={model.requestMode === "more"}><Search size={15} aria-hidden="true" />Rechercher</CmmButton>
        {model.hasMore && model.nextOffset !== null ? <CmmButton type="button" tone="tertiary" variant="ghost" size="md" className="text-amber-700 hover:text-amber-800" onClick={model.loadMore} loading={model.requestMode === "more"} disabled={model.requestMode === "search" || model.requestMode === "initial"}><Plus size={15} aria-hidden="true" />Afficher +</CmmButton> : null}
      </div>
      <button type="button" role="option" aria-selected="false" className="w-full rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-left text-sm font-semibold text-amber-700 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" onClick={onSelectOther}>
        <span className="block">Autre</span>
        <span className="mt-0.5 block text-xs font-medium text-amber-900/70">Organisateur en attente de compte</span>
      </button>
    </div>
  );
}

function SingleAccountResult({ user, selected, onSelect }: { user: ChatUserOption; selected: boolean; onSelect: (user: ChatUserOption) => void }) {
  return <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white px-3 py-2" role="option" aria-selected={selected}><div className="min-w-0"><p className="truncate text-sm font-semibold text-emerald-950">{labelForUser(user)}</p><p className="truncate text-xs text-emerald-900/58">{user.handle ? `@${user.handle}` : user.id}</p></div><button type="button" onClick={() => onSelect(user)} disabled={selected} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">{selected ? "Sélectionné" : "Sélectionner"}</button></div>;
}

const INVITATION_STATUS_LABELS: Record<InvitationStatus["status"], string> = {
  pending: "En attente",
  accepted: "Acceptée",
  rejected: "Refusée",
  withdrawn: "Retirée",
};

export function SelectedParticipants({ users, onRemove, invitationStatuses = [] }: { users: ChatUserOption[]; onRemove: (userId: string) => void; invitationStatuses?: readonly InvitationStatus[] }) {
  if (users.length === 0) return <p className="text-xs text-emerald-900/58">Aucun membre ajouté pour le moment.</p>;
  const statusByUserId = new Map(invitationStatuses.map((item) => [item.userId, item.status]));
  return <div className="space-y-2"><p className="text-xs font-semibold text-emerald-950">Membres sélectionnés</p><div className="flex flex-wrap gap-2">{users.map((user) => { const status = statusByUserId.get(user.id); return <span key={user.id} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-950"><span className="max-w-[13rem] truncate">{labelForUser(user)}</span>{status ? <span className="text-emerald-800/70">{INVITATION_STATUS_LABELS[status]}</span> : null}<button type="button" onClick={() => onRemove(user.id)} aria-label={`Retirer ${labelForUser(user) || user.id}`} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"><X size={12} /></button></span>; })}</div></div>;
}

export function InvitationStatusList({ statuses, selectedIds }: { statuses: readonly InvitationStatus[]; selectedIds: readonly string[] }) {
  const historical = statuses.filter((item) => !selectedIds.includes(item.userId));
  if (historical.length === 0) return null;
  return <div className="space-y-2" aria-label="Historique des invitations"><p className="text-xs font-semibold text-emerald-950">Historique des invitations</p><ul className="space-y-1.5">{historical.map((item) => <li key={`${item.userId}-${item.status}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><span className="font-medium text-slate-800">Compte {item.userId}</span><span className="font-semibold text-slate-600">{INVITATION_STATUS_LABELS[item.status]}</span></li>)}</ul></div>;
}
