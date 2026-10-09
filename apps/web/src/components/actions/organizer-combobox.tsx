"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import type { OrganizerDirectorySuggestion } from "@/lib/actions/organizer-directory-registry";
import { getOrganizerTypeLabel, type OrganizerType } from "@/lib/actions/organizer-type";
import { SPONTANEOUS_PENDING_ORGANIZER_LABEL } from "@/lib/actions/organizer-type";
import type { ActiveRole } from "@/lib/domain-language";
import { CmmButton } from "@/components/ui/cmm-button";
import { ActionAccountSelector } from "./action-participant-picker";
import { cn } from "@/lib/utils";
import { useOrganizerSuggestions } from "./organizer-combobox-suggestions";

type OrganizerComboboxProps = {
  id: string;
  organizerType: OrganizerType | "";
  organizerId: string | null;
  value: string;
  onChange: (selection: { id: string | null; name: string; accountIds?: string[] }) => void;
  organizerAccountIds?: string[];
  currentUserId?: string;
  activeRole?: ActiveRole;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export type OrganizerComboboxKeyAction =
  | { type: "move"; index: number }
  | { type: "select"; index: number }
  | { type: "close" }
  | null;

export function canAddOrganizerForActiveRole(activeRole?: ActiveRole): boolean {
  return activeRole === "admin" || activeRole === "max";
}

export function getOrganizerComboboxKeyAction(
  key: string,
  currentIndex: number,
  optionCount: number,
  open: boolean,
): OrganizerComboboxKeyAction {
  if (key === "ArrowDown") {
    return { type: "move", index: optionCount === 0 ? -1 : (currentIndex + 1) % optionCount };
  }
  if (key === "ArrowUp") {
    return { type: "move", index: optionCount === 0 ? -1 : currentIndex <= 0 ? optionCount - 1 : currentIndex - 1 };
  }
  if (key === "Enter" && open && currentIndex >= 0) {
    return { type: "select", index: currentIndex };
  }
  if (key === "Escape") {
    return { type: "close" };
  }
  return null;
}

function SpontaneousOrganizerSelector({
  currentUserId,
  value,
  organizerAccountIds,
  onChange,
}: Pick<OrganizerComboboxProps, "currentUserId" | "value" | "organizerAccountIds" | "onChange">) {
  return (
    <ActionAccountSelector
      currentUserId={currentUserId ?? ""}
      value={organizerAccountIds ?? []}
      selectedLabel={value}
      pendingLabel={SPONTANEOUS_PENDING_ORGANIZER_LABEL}
      onChange={() => undefined}
      onSelectAccount={(user) => onChange({
        id: null,
        name: user.display_name?.trim() || user.handle?.trim() || user.id,
        accountIds: [user.id],
      })}
      onOther={() => onChange({
        id: null,
        name: SPONTANEOUS_PENDING_ORGANIZER_LABEL,
        accountIds: [],
      })}
    />
  );
}

async function createOrganizerFromCombobox(name: string, organizerType: OrganizerType) {
  const response = await fetch("/api/actions/organizers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, organizerType }),
  });
  const payload = (await response.json()) as {
    organizer?: { id?: string | null; name?: string };
    error?: string;
  };
  if (!response.ok || !payload.organizer?.id || !payload.organizer.name) {
    throw new Error(payload.error || "La structure n’a pas pu être ajoutée.");
  }
  return { id: payload.organizer.id, name: payload.organizer.name };
}

export function OrganizerCombobox({
  id,
  organizerType,
  organizerId,
  value,
  onChange,
  organizerAccountIds = [],
  currentUserId,
  activeRole,
  required = false,
  invalid = false,
  describedBy,
}: OrganizerComboboxProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newOrganizerName, setNewOrganizerName] = useState("");
  const [addState, setAddState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [addError, setAddError] = useState<string | null>(null);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);
  const addNameInputRef = useRef<HTMLInputElement>(null);
  const suggestions = useOrganizerSuggestions(organizerType, value);

  const canAddOrganizer = canAddOrganizerForActiveRole(activeRole);
  const addOptionVisible = canAddOrganizer && Boolean(organizerType) && organizerType !== "spontaneous";

  useEffect(() => {
    if (isAddFormOpen) addNameInputRef.current?.focus();
  }, [isAddFormOpen]);

  function selectSuggestion(suggestion: OrganizerDirectorySuggestion) {
    onChange({ id: suggestion.id, name: suggestion.name });
    setOpen(false);
    setActiveIndex(-1);
  }

  function openAddForm() {
    if (!addOptionVisible) return;
    setOpen(false);
    setIsAddFormOpen(true);
    setNewOrganizerName("");
    setAddState("idle");
    setAddError(null);
    setAddFeedback(null);
  }

  function cancelAddForm() {
    setIsAddFormOpen(false);
    setNewOrganizerName("");
    setAddState("idle");
    setAddError(null);
  }

  async function submitNewOrganizer() {
    const name = newOrganizerName.trim();
    if (!addOptionVisible || !organizerType || !name || addState === "pending") return;

    setAddState("pending");
    setAddError(null);
    setAddFeedback(null);
    try {
      const organizer = await createOrganizerFromCombobox(name, organizerType);
      onChange({ id: organizer.id, name: organizer.name });
      setIsAddFormOpen(false);
      setNewOrganizerName("");
      setAddState("success");
      setAddFeedback("Structure ajoutée et sélectionnée.");
    } catch (error) {
      setAddState("error");
      setAddError(error instanceof Error && error.message ? error.message : "La structure n’a pas pu être ajoutée.");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const addOptionOffset = addOptionVisible ? 1 : 0;
    const optionCount = addOptionOffset + suggestions.length;
    const action = getOrganizerComboboxKeyAction(event.key, activeIndex, optionCount, open);
    if (action?.type === "move") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(action.index);
    } else if (action?.type === "select") {
      event.preventDefault();
      if (addOptionVisible && action.index === 0) {
        openAddForm();
      } else {
        const suggestionIndex = action.index - addOptionOffset;
        if (suggestionIndex >= 0 && suggestionIndex < suggestions.length) {
          selectSuggestion(suggestions[suggestionIndex]);
        }
      }
    } else if (action?.type === "close") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const spontaneous = organizerType === "spontaneous";
  if (spontaneous) {
    return <SpontaneousOrganizerSelector currentUserId={currentUserId} value={value} organizerAccountIds={organizerAccountIds} onChange={onChange} />;
  }
  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;
  return (
    <OrganizerComboboxView
      id={id}
      listboxId={listboxId}
      inputRef={inputRef}
      addNameInputRef={addNameInputRef}
      organizerType={organizerType}
      organizerId={organizerId}
      value={value}
      required={required}
      invalid={invalid}
      describedBy={describedBy}
      spontaneous={spontaneous}
      open={open}
      activeOptionId={activeOptionId}
      activeIndex={activeIndex}
      suggestions={suggestions}
      addOptionVisible={addOptionVisible}
      isAddFormOpen={isAddFormOpen}
      newOrganizerName={newOrganizerName}
      addState={addState}
      addError={addError}
      addFeedback={addFeedback}
      onValueChange={(name) => onChange({ id: null, name })}
      onFocus={() => setOpen(Boolean(!spontaneous && (addOptionVisible || suggestions.length)))}
      onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      onKeyDown={handleKeyDown}
      onOpenAddForm={openAddForm}
      onSelectSuggestion={selectSuggestion}
      onNewOrganizerNameChange={setNewOrganizerName}
      onSubmitNewOrganizer={() => void submitNewOrganizer()}
      onCancelAddForm={cancelAddForm}
    />
  );
}

function OrganizerComboboxView({
  id,
  listboxId,
  inputRef,
  addNameInputRef,
  organizerType,
  organizerId,
  value,
  required,
  invalid,
  describedBy,
  spontaneous,
  open,
  activeOptionId,
  activeIndex,
  suggestions,
  addOptionVisible,
  isAddFormOpen,
  newOrganizerName,
  addState,
  addError,
  addFeedback,
  onValueChange,
  onFocus,
  onBlur,
  onKeyDown,
  onOpenAddForm,
  onSelectSuggestion,
  onNewOrganizerNameChange,
  onSubmitNewOrganizer,
  onCancelAddForm,
}: {
  id: string;
  listboxId: string;
  inputRef: RefObject<HTMLInputElement | null>;
  addNameInputRef: RefObject<HTMLInputElement | null>;
  organizerType: OrganizerType | "";
  organizerId: string | null;
  value: string;
  required: boolean;
  invalid: boolean;
  describedBy?: string;
  spontaneous: boolean;
  open: boolean;
  activeOptionId?: string;
  activeIndex: number;
  suggestions: OrganizerDirectorySuggestion[];
  addOptionVisible: boolean;
  isAddFormOpen: boolean;
  newOrganizerName: string;
  addState: "idle" | "pending" | "success" | "error";
  addError: string | null;
  addFeedback: string | null;
  onValueChange: (name: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onOpenAddForm: () => void;
  onSelectSuggestion: (suggestion: OrganizerDirectorySuggestion) => void;
  onNewOrganizerNameChange: (name: string) => void;
  onSubmitNewOrganizer: () => void;
  onCancelAddForm: () => void;
}) {
  return (
    <div className="relative space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-emerald-900/75">
        Organisateur <span aria-hidden="true">{required ? "*" : ""}</span>
      </label>
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-activedescendant={activeOptionId}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        required={required}
        disabled={!organizerType}
        value={value}
        placeholder={!organizerType ? "Choisissez d’abord un type" : spontaneous ? "Nom ou pseudo du référent" : "Rechercher ou saisir une structure"}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={cn("min-h-12 w-full rounded-xl border bg-[#F3FBF6] px-3.5 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15", invalid ? "border-rose-400 ring-2 ring-rose-400/20" : "border-emerald-200/70")}
      />
      {open && !spontaneous ? (
        <OrganizerSuggestionsMenu
          listboxId={listboxId}
          organizerId={organizerId}
          value={value}
          activeIndex={activeIndex}
          suggestions={suggestions}
          addOptionVisible={addOptionVisible}
          onOpenAddForm={onOpenAddForm}
          onSelectSuggestion={onSelectSuggestion}
        />
      ) : null}
      {isAddFormOpen && addOptionVisible ? (
        <OrganizerAddForm
          id={id}
          inputRef={addNameInputRef}
          organizerType={organizerType}
          newOrganizerName={newOrganizerName}
          addState={addState}
          addError={addError}
          onNewOrganizerNameChange={onNewOrganizerNameChange}
          onSubmitNewOrganizer={onSubmitNewOrganizer}
          onCancelAddForm={onCancelAddForm}
        />
      ) : null}
      {addFeedback ? <p className="text-xs font-medium text-emerald-700" aria-live="polite">{addFeedback}</p> : null}
      <p className="text-xs text-emerald-900/55">
        {spontaneous ? "Le référent reste lié à l’action et n’est pas ajouté au catalogue des structures." : "Sélectionnez une structure existante ; les administrateurs peuvent utiliser « + Ajouter »."}
      </p>
    </div>
  );
}

function OrganizerSuggestionsMenu({
  listboxId,
  organizerId,
  value,
  activeIndex,
  suggestions,
  addOptionVisible,
  onOpenAddForm,
  onSelectSuggestion,
}: {
  listboxId: string;
  organizerId: string | null;
  value: string;
  activeIndex: number;
  suggestions: OrganizerDirectorySuggestion[];
  addOptionVisible: boolean;
  onOpenAddForm: () => void;
  onSelectSuggestion: (suggestion: OrganizerDirectorySuggestion) => void;
}) {
  const addOptionOffset = addOptionVisible ? 1 : 0;
  return (
    <div id={listboxId} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-emerald-200 bg-white p-1 shadow-lg">
      {addOptionVisible ? (
        <button
          id={`${listboxId}-option-0`}
          type="button"
          role="option"
          aria-selected="false"
          className="block w-full rounded-lg border-b border-emerald-100 px-3 py-2 text-left text-sm font-semibold text-amber-700 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onOpenAddForm}
        >
          + Ajouter
        </button>
      ) : null}
      {suggestions.map((suggestion, index) => {
        const optionIndex = index + addOptionOffset;
        return (
          <button
            key={suggestion.id}
            id={`${listboxId}-option-${optionIndex}`}
            type="button"
            role="option"
            aria-selected={suggestion.id === organizerId}
            className={cn("block w-full rounded-lg px-3 py-2 text-left text-sm text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500", activeIndex === optionIndex ? "bg-emerald-50" : "hover:bg-emerald-50")}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelectSuggestion(suggestion)}
          >
            <span className="block font-semibold">{suggestion.name}</span>
            {suggestion.locationLabel ? <span className="block text-xs text-emerald-900/60">{suggestion.locationLabel}</span> : null}
          </button>
        );
      })}
      {!suggestions.length ? (
        <p className="px-3 py-2 text-sm text-emerald-900/60">
          {value.trim() ? "Aucune structure existante correspondante." : addOptionVisible ? "Recherchez une structure existante ou ajoutez-la." : "Saisissez au moins un nom."}
        </p>
      ) : null}
    </div>
  );
}

function OrganizerAddForm({
  id,
  inputRef,
  organizerType,
  newOrganizerName,
  addState,
  addError,
  onNewOrganizerNameChange,
  onSubmitNewOrganizer,
  onCancelAddForm,
}: {
  id: string;
  inputRef: RefObject<HTMLInputElement | null>;
  organizerType: OrganizerType | "";
  newOrganizerName: string;
  addState: "idle" | "pending" | "success" | "error";
  addError: string | null;
  onNewOrganizerNameChange: (name: string) => void;
  onSubmitNewOrganizer: () => void;
  onCancelAddForm: () => void;
}) {
  const errorId = `${id}-new-organizer-error`;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3" role="group" aria-label="Ajouter une structure">
      <label htmlFor={`${id}-new-organizer`} className="block text-xs font-semibold text-amber-950">
        Nom de la nouvelle structure
      </label>
      <p className="mt-1 text-xs text-amber-900/70">Type repris : {getOrganizerTypeLabel(organizerType || null)}</p>
      <input
        ref={inputRef}
        id={`${id}-new-organizer`}
        value={newOrganizerName}
        maxLength={120}
        onChange={(event) => onNewOrganizerNameChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmitNewOrganizer();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onCancelAddForm();
          }
        }}
        aria-invalid={Boolean(addError)}
        aria-describedby={addError ? errorId : undefined}
        className="mt-2 min-h-11 w-full rounded-xl border border-amber-200 bg-white px-3.5 text-sm font-medium text-amber-950 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
      />
      {addError ? <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-rose-700">{addError}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <CmmButton type="button" tone="tertiary" variant="ghost" size="sm" onClick={onCancelAddForm} disabled={addState === "pending"}>Annuler</CmmButton>
        <CmmButton type="button" tone="primary" variant="pill" size="sm" onClick={onSubmitNewOrganizer} loading={addState === "pending"} disabled={!newOrganizerName.trim()}>Ajouter</CmmButton>
      </div>
    </div>
  );
}
