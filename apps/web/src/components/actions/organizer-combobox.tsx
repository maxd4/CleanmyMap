"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { getStaticOrganizerSuggestions, type OrganizerDirectorySuggestion } from "@/lib/actions/organizer-directory-registry";
import type { OrganizerType } from "@/lib/actions/organizer-type";
import { cn } from "@/lib/utils";

type OrganizerComboboxProps = {
  id: string;
  organizerType: OrganizerType | "";
  organizerId: string | null;
  value: string;
  onChange: (selection: { id: string | null; name: string }) => void;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export type OrganizerComboboxKeyAction =
  | { type: "move"; index: number }
  | { type: "select"; index: number }
  | { type: "close" }
  | null;

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

export function OrganizerCombobox({
  id,
  organizerType,
  organizerId,
  value,
  onChange,
  required = false,
  invalid = false,
  describedBy,
}: OrganizerComboboxProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [remoteSuggestions, setRemoteSuggestions] = useState<OrganizerDirectorySuggestion[]>([]);
  const [remoteSuggestionsKey, setRemoteSuggestionsKey] = useState("");
  const remoteQueryKey = `${organizerType}:${value.trim()}`;
  const suggestions = useMemo(() => {
    if (!organizerType || organizerType === "spontaneous") return [];
    const seen = new Set<string>();
    const currentRemoteSuggestions = remoteSuggestionsKey === remoteQueryKey ? remoteSuggestions : [];
    return [...getStaticOrganizerSuggestions(organizerType, value), ...currentRemoteSuggestions].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 20);
  }, [organizerType, remoteQueryKey, remoteSuggestions, remoteSuggestionsKey, value]);

  useEffect(() => {
    if (!organizerType || organizerType === "spontaneous" || value.trim().length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/actions/organizers?type=${encodeURIComponent(organizerType)}&q=${encodeURIComponent(value.trim())}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : null)
        .then((payload: { items?: OrganizerDirectorySuggestion[] } | null) => {
          setRemoteSuggestionsKey(remoteQueryKey);
          setRemoteSuggestions(payload?.items ?? []);
        })
        .catch(() => undefined);
    }, 120);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [organizerType, remoteQueryKey, value]);

  function selectSuggestion(suggestion: OrganizerDirectorySuggestion) {
    onChange({ id: suggestion.id, name: suggestion.name });
    setOpen(false);
    setActiveIndex(-1);
  }

  function selectFreeText() {
    onChange({ id: null, name: value });
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const optionCount = suggestions.length + (value.trim() ? 1 : 0);
    const action = getOrganizerComboboxKeyAction(event.key, activeIndex, optionCount, open);
    if (action?.type === "move") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(action.index);
    } else if (action?.type === "select") {
      event.preventDefault();
      if (action.index < suggestions.length) selectSuggestion(suggestions[action.index]);
      else selectFreeText();
    } else if (action?.type === "close") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const spontaneous = organizerType === "spontaneous";
  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;
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
        onChange={(event) => onChange({ id: null, name: event.target.value })}
        onFocus={() => setOpen(Boolean(!spontaneous && suggestions.length))}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        className={cn("min-h-12 w-full rounded-xl border bg-[#F3FBF6] px-3.5 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15", invalid ? "border-rose-400 ring-2 ring-rose-400/20" : "border-emerald-200/70")}
      />
      {open && !spontaneous ? (
        <div id={listboxId} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-emerald-200 bg-white p-1 shadow-lg">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={suggestion.id === organizerId}
              className={cn("block w-full rounded-lg px-3 py-2 text-left text-sm text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500", activeIndex === index ? "bg-emerald-50" : "hover:bg-emerald-50")}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(suggestion)}
            >
              <span className="block font-semibold">{suggestion.name}</span>
              {suggestion.locationLabel ? <span className="block text-xs text-emerald-900/60">{suggestion.locationLabel}</span> : null}
            </button>
          ))}
          {value.trim() ? (
            <button
              id={`${listboxId}-option-${suggestions.length}`}
              type="button"
              role="option"
              aria-selected={organizerId === null}
              className={cn("block w-full rounded-lg border-t border-emerald-100 px-3 py-2 text-left text-sm text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500", activeIndex === suggestions.length ? "bg-emerald-50" : "hover:bg-emerald-50")}
              onMouseDown={(event) => event.preventDefault()}
              onClick={selectFreeText}
            >
              Utiliser « {value.trim()} »
            </button>
          ) : null}
          {!suggestions.length && !value.trim() ? <p className="px-3 py-2 text-sm text-emerald-900/60">Saisissez au moins un nom.</p> : null}
        </div>
      ) : null}
      <p className="text-xs text-emerald-900/55">
        {spontaneous ? "Le référent reste lié à l’action et n’est pas ajouté au catalogue des structures." : "La recherche aide à trouver une structure ; une saisie libre sera normalisée côté serveur."}
      </p>
    </div>
  );
}
