"use client";

import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { getAccountPickerKeyAction, type ActionAccountOption, type ParticipantPickerProps } from "./action-participant-picker-model";
import { useParticipantPickerModel } from "./use-action-participant-picker-model";
import { ParticipantResultsMenu, PickerHeader, PickerSearch, SelectedParticipants, SingleAccountResults } from "./action-participant-picker-views";

export function ActionParticipantPicker({
  currentUserId,
  value,
  onChange,
  endpoint = "/api/chat/users",
  includeCurrentUser = false,
  title = "Membres de l'action",
  description = "Ajoutez des comptes CleanMyMap déjà existants avant l'envoi.",
  className,
  compact = false,
}: ParticipantPickerProps) {
  const pickerRef = useRef<HTMLElement>(null);
  const model = useParticipantPickerModel({ currentUserId, value, onChange, endpoint, includeCurrentUser, pickerRef });
  return (
    <section ref={pickerRef} className={cn(compact ? "rounded-lg border border-emerald-100/70 bg-transparent px-0 py-0 shadow-none" : "rounded-[1.4rem] border border-emerald-200/70 bg-[#ECF8EF] px-4 py-4 shadow-sm", className)}>
      <PickerHeader title={title} description={description} count={model.selectedIds.length} showHelp={model.showHelp} onToggleHelp={() => model.setShowHelp((current) => !current)} />
      <div className={cn(compact ? "mt-3 space-y-3" : "mt-4 space-y-3")}>
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
    ? selectedLabel?.trim() || selectedUser?.display_name?.trim() || selectedUser?.handle?.trim() || selectedUser?.id || ""
    : pendingLabel && selectedLabel === pendingLabel
      ? pendingLabel
      : "";
  const listboxId = `${id}-options`;

  function openWithKeyboard(event: KeyboardEvent<HTMLInputElement>) {
    const action = getAccountPickerKeyAction(event.key);
    if (action === "open") {
      event.preventDefault();
      model.openMenu();
    }
    if (action === "close") {
      event.preventDefault();
      model.setMenuOpen(false);
    }
  }

  function selectAccount(user: ActionAccountOption) {
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
