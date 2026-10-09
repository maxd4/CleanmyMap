"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Dispatch, KeyboardEvent, RefObject, SetStateAction } from "react";
import { Info, Loader2, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CmmButton } from "@/components/ui/cmm-button";

type ActionAccountOption = {
  id: string;
  handle: string | null;
  display_name: string | null;
};

type ChatUserOption = ActionAccountOption;

type ParticipantPickerProps = {
  currentUserId: string;
  value: string[];
  onChange: (next: string[]) => void;
  endpoint?: string;
  includeCurrentUser?: boolean;
  title?: string;
  description?: string;
  className?: string;
};

type ParticipantPage = {
  items: ChatUserOption[];
  nextOffset: number | null;
  hasMore: boolean;
};

function labelForUser(user: ChatUserOption | null | undefined): string {
  return user?.display_name?.trim() || user?.handle?.trim() || user?.id || "";
}

async function fetchParticipantPage(
  endpoint: string,
  requestedQuery: string,
  offset: number,
  signal?: AbortSignal,
  includeCurrentUser = false,
): Promise<ParticipantPage> {
  const params = new URLSearchParams({ offset: String(offset) });
  if (requestedQuery) params.set("q", requestedQuery);
  if (includeCurrentUser) params.set("includeCurrentUser", "1");
  const response = await fetch(`${endpoint}?${params.toString()}`, { cache: "no-store", signal });
  const payload = (await response.json()) as
    | { users?: ChatUserOption[]; nextOffset?: number | null; hasMore?: boolean; error?: string }
    | null;
  if (!response.ok) throw new Error(payload?.error || "La recherche de membres a échoué.");
  const items = Array.isArray(payload?.users)
    ? [...new Map(payload.users.filter((item) => item?.id).map((item) => [item.id, item])).values()]
    : [];
  return {
    items,
    nextOffset: typeof payload?.nextOffset === "number" ? payload.nextOffset : null,
    hasMore: Boolean(payload?.hasMore),
  };
}

function useOutsideMenuClose(
  menuOpen: boolean,
  pickerRef: RefObject<HTMLElement | null>,
  setMenuOpen: (open: boolean) => void,
) {
  useEffect(() => {
    if (!menuOpen) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [menuOpen, pickerRef, setMenuOpen]);
}

function useHydrateSelectedUsers(
  selectedIds: string[],
  knownUsers: Record<string, ChatUserOption>,
  setKnownUsers: Dispatch<SetStateAction<Record<string, ChatUserOption>>>,
  endpoint: string,
  includeCurrentUser: boolean,
) {
  useEffect(() => {
    let active = true;
    const missingIds = selectedIds.filter((userId) => !knownUsers[userId]);
    if (missingIds.length === 0) return () => { active = false; };
    void Promise.all(missingIds.slice(0, 6).map(async (userId) => {
      const page = await fetchParticipantPage(endpoint, userId, 0, undefined, includeCurrentUser).catch(() => null);
      return page?.items.find((candidate) => candidate.id === userId) ?? null;
    })).then((resolved) => {
      if (!active) return;
      const next = Object.fromEntries(resolved.filter((item): item is ChatUserOption => Boolean(item)).map((item) => [item.id, item]));
      if (Object.keys(next).length > 0) setKnownUsers((previous) => ({ ...previous, ...next }));
    });
    return () => { active = false; };
  }, [endpoint, includeCurrentUser, knownUsers, selectedIds, setKnownUsers]);
}

function useParticipantPickerModel({
  currentUserId,
  value,
  onChange,
  endpoint,
  includeCurrentUser,
  pickerRef,
}: Pick<ParticipantPickerProps, "currentUserId" | "value" | "onChange"> & {
  endpoint: string;
  includeCurrentUser: boolean;
  pickerRef: RefObject<HTMLElement | null>;
}) {
  const searchInputId = useId();
  const requestControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChatUserOption[]>([]);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [hasMore, setHasMore] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestMode, setRequestMode] = useState<"initial" | "search" | "more" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [knownUsers, setKnownUsers] = useState<Record<string, ChatUserOption>>({});
  const selectedIds = useMemo(
    () => [...new Set(value.map((userId) => userId.trim()).filter((userId) => userId && (includeCurrentUser || userId !== currentUserId)))],
    [currentUserId, includeCurrentUser, value],
  );
  const selectedUsers = useMemo(
    () => selectedIds.map((userId) => knownUsers[userId] ?? { id: userId, handle: null, display_name: null }),
    [knownUsers, selectedIds],
  );

  const loadAccounts = useCallback(async (requestedQuery: string, offset: number, append: boolean) => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setRequestMode(append ? "more" : requestedQuery ? "search" : "initial");
    setError(null);
    try {
      const page = await fetchParticipantPage(endpoint, requestedQuery, offset, controller.signal, includeCurrentUser);
      if (requestId !== requestIdRef.current) return;
      setResults((previous) => append
        ? [...new Map([...previous, ...page.items].map((item) => [item.id, item])).values()]
        : page.items);
      setKnownUsers((previous) => ({ ...previous, ...Object.fromEntries(page.items.map((item) => [item.id, item])) }));
      setSubmittedQuery(requestedQuery);
      setNextOffset(page.nextOffset);
      setHasMore(page.hasMore);
      setInitialized(true);
    } catch (fetchError) {
      if ((fetchError as { name?: string }).name === "AbortError" || requestId !== requestIdRef.current) return;
      setError(fetchError instanceof Error && fetchError.message ? fetchError.message : "La recherche de membres a échoué.");
      if (!append) {
        setResults([]);
        setSubmittedQuery(requestedQuery);
        setNextOffset(null);
        setHasMore(false);
        setInitialized(true);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRequestMode(null);
      }
    }
  }, [endpoint, includeCurrentUser]);

  useEffect(() => () => { requestControllerRef.current?.abort(); }, []);
  useOutsideMenuClose(menuOpen, pickerRef, setMenuOpen);
  useHydrateSelectedUsers(selectedIds, knownUsers, setKnownUsers, endpoint, includeCurrentUser);

  function submitSearch() {
    setMenuOpen(true);
    void loadAccounts(query.trim().slice(0, 120), 0, false);
  }

  function openMenu() {
    setMenuOpen(true);
    if (!initialized && !loading) void loadAccounts("", 0, false);
  }

  function loadMore() {
    if (loading || !hasMore || nextOffset === null) return;
    setMenuOpen(true);
    void loadAccounts(submittedQuery, nextOffset, true);
  }

  function addUser(user: ChatUserOption) {
    if (!includeCurrentUser && user.id === currentUserId) {
      setMessage("Vous ne pouvez pas vous ajouter vous-même.");
      return;
    }
    if (selectedIds.includes(user.id)) {
      setMessage("Ce membre est déjà sélectionné.");
      return;
    }
    onChange([...selectedIds, user.id]);
    setKnownUsers((previous) => ({ ...previous, [user.id]: user }));
    setMessage(null);
  }

  function removeUser(userId: string) {
    onChange(selectedIds.filter((candidate) => candidate !== userId));
    setMessage(null);
  }

  return {
    searchInputId, query, setQuery, results, selectedIds, selectedUsers,
    menuOpen, setMenuOpen, loading, requestMode, error, initialized, hasMore, nextOffset,
    showHelp, setShowHelp, message, submitSearch, openMenu, loadMore, addUser, removeUser,
  };
}

export function ActionParticipantPicker({
  currentUserId,
  value,
  onChange,
  endpoint = "/api/chat/users",
  includeCurrentUser = false,
  title = "Membres de l'action",
  description = "Ajoutez des comptes CleanMyMap déjà existants avant l'envoi.",
  className,
}: ParticipantPickerProps) {
  const pickerRef = useRef<HTMLElement>(null);
  const model = useParticipantPickerModel({ currentUserId, value, onChange, endpoint, includeCurrentUser, pickerRef });
  return (
    <section ref={pickerRef} className={cn("rounded-[1.4rem] border border-emerald-200/70 bg-[#ECF8EF] px-4 py-4 shadow-sm", className)}>
      <PickerHeader title={title} description={description} count={model.selectedIds.length} showHelp={model.showHelp} onToggleHelp={() => model.setShowHelp((current) => !current)} />
      <div className="mt-4 space-y-3">
        <PickerSearch id={model.searchInputId} query={model.query} onChange={model.setQuery} onFocus={model.openMenu} onSearch={model.submitSearch} onClose={() => model.setMenuOpen(false)} />
        {model.menuOpen ? <ParticipantResultsMenu model={model} /> : null}
        <SelectedParticipants users={model.selectedUsers} onRemove={model.removeUser} />
      </div>
    </section>
  );
}

export type ActionAccountSelectorProps = {
  currentUserId: string;
  value: string[];
  onChange: (next: string[]) => void;
  onOther: () => void;
  onSelectAccount?: (user: ActionAccountOption) => void;
  selectedLabel?: string;
  pendingLabel?: string;
  endpoint?: string;
  placeholder?: string;
  id?: string;
};

export function ActionAccountSelector({
  currentUserId,
  value,
  onChange,
  onOther,
  onSelectAccount,
  selectedLabel,
  pendingLabel = "Organisateur en attente de compte",
  endpoint = "/api/actions/account-options",
  placeholder = "Sélectionner un compte utilisateur",
  id = "action-organizer-account",
}: ActionAccountSelectorProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const model = useParticipantPickerModel({
    currentUserId,
    value,
    onChange,
    endpoint,
    includeCurrentUser: true,
    pickerRef,
  });
  const selectedUser = model.selectedUsers[0];
  const displayValue = model.selectedIds.length > 0
    ? selectedLabel?.trim() || labelForUser(selectedUser)
    : pendingLabel && selectedLabel === pendingLabel
      ? pendingLabel
      : "";
  const listboxId = `${id}-options`;

  function openWithKeyboard(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
      event.preventDefault();
      model.openMenu();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      model.setMenuOpen(false);
    }
  }

  function selectAccount(user: ChatUserOption) {
    if (onSelectAccount) {
      onSelectAccount(user);
    } else {
      onChange([user.id]);
    }
    model.setMenuOpen(false);
  }

  function selectOther() {
    onChange([]);
    onOther();
    model.setMenuOpen(false);
  }

  return (
    <div ref={pickerRef} className="relative space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-emerald-900/75">
        Organisateur
      </label>
      <input
        id={id}
        role="combobox"
        aria-autocomplete="none"
        aria-controls={listboxId}
        aria-expanded={model.menuOpen}
        aria-readonly="true"
        readOnly
        value={displayValue}
        placeholder={placeholder}
        onFocus={model.openMenu}
        onClick={model.openMenu}
        onKeyDown={openWithKeyboard}
        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
      />
      {model.menuOpen ? (
        <div id={listboxId} className="absolute z-30 mt-1 w-full space-y-3 rounded-2xl border border-emerald-200/80 bg-white/95 p-3 shadow-lg" role="region" aria-label="Comptes utilisateurs disponibles">
          <PickerSearch
            id={`${id}-search`}
            label="Rechercher un compte"
            query={model.query}
            onChange={model.setQuery}
            onFocus={() => undefined}
            onSearch={model.submitSearch}
            onClose={() => model.setMenuOpen(false)}
          />
          <SingleAccountResults
            model={model}
            onSelect={selectAccount}
            onSelectOther={selectOther}
          />
        </div>
      ) : null}
    </div>
  );
}

function PickerHeader({ title, description, count, showHelp, onToggleHelp }: { title: string; description: string; count: number; showHelp: boolean; onToggleHelp: () => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1"><div className="flex items-center gap-2"><h4 className="text-sm font-semibold text-emerald-950">{title}</h4><button type="button" onClick={onToggleHelp} aria-label={showHelp ? "Masquer l'aide" : "Afficher l'aide"} aria-expanded={showHelp} className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 transition hover:bg-emerald-50"><Info size={12} /></button></div><p className="text-xs leading-5 text-emerald-900/68">{description}</p></div>
      <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-900">{count} membre{count > 1 ? "s" : ""}</span>
      {showHelp ? <p className="basis-full rounded-2xl border border-emerald-200/70 bg-white/90 px-3 py-2 text-xs leading-5 text-emerald-900/72">Recherchez un pseudo, un nom affiché ou un identifiant utilisateur. Les membres ajoutés ici sont rattachés directement à l&apos;action.</p> : null}
    </div>
  );
}

function PickerSearch({ id, label = "Ajouter un membre", query, onChange, onFocus, onSearch, onClose }: { id: string; label?: string; query: string; onChange: (value: string) => void; onFocus: () => void; onSearch: () => void; onClose: () => void }) {
  return (
    <label htmlFor={id} className="block space-y-1.5"><span className="text-xs font-semibold text-emerald-950">{label}</span><div className="relative"><Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700/55" /><input id={id} type="search" value={query} onChange={(event) => onChange(event.target.value)} onFocus={onFocus} onClick={onFocus} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onSearch(); } if (event.key === "Escape") { event.preventDefault(); onClose(); } }} placeholder="Pseudo, nom affiché ou ID utilisateur" className="w-full rounded-2xl border border-emerald-200/70 bg-white px-10 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-[#F8FCF8]" /></div></label>
  );
}

function ParticipantResultsMenu({ model }: { model: ReturnType<typeof useParticipantPickerModel> }) {
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

function SingleAccountResults({
  model,
  onSelect,
  onSelectOther,
}: {
  model: ReturnType<typeof useParticipantPickerModel>;
  onSelect: (user: ChatUserOption) => void;
  onSelectOther: () => void;
}) {
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

function SingleAccountResult({
  user,
  selected,
  onSelect,
}: {
  user: ChatUserOption;
  selected: boolean;
  onSelect: (user: ChatUserOption) => void;
}) {
  return <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white px-3 py-2" role="option" aria-selected={selected}><div className="min-w-0"><p className="truncate text-sm font-semibold text-emerald-950">{labelForUser(user)}</p><p className="truncate text-xs text-emerald-900/58">{user.handle ? `@${user.handle}` : user.id}</p></div><button type="button" onClick={() => onSelect(user)} disabled={selected} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">{selected ? "Sélectionné" : "Sélectionner"}</button></div>;
}

function SelectedParticipants({ users, onRemove }: { users: ChatUserOption[]; onRemove: (userId: string) => void }) {
  if (users.length === 0) return <p className="text-xs text-emerald-900/58">Aucun membre ajouté pour le moment.</p>;
  return <div className="space-y-2"><p className="text-xs font-semibold text-emerald-950">Membres sélectionnés</p><div className="flex flex-wrap gap-2">{users.map((user) => <span key={user.id} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-950"><span className="max-w-[13rem] truncate">{labelForUser(user)}</span><button type="button" onClick={() => onRemove(user.id)} aria-label={`Retirer ${labelForUser(user) || user.id}`} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"><X size={12} /></button></span>)}</div></div>;
}
