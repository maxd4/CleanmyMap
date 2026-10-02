"use client";

import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionLocationCoordinates } from "@/lib/actions/types";
import { useActionAddressAutocomplete } from "./hooks/use-action-address-autocomplete";

export type ActionAddressAutocompleteProps = {
  id: string;
  icon?: React.ElementType;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string, coordinates?: ActionLocationCoordinates | null) => void;
  optional?: boolean;
  helperText: string;
};

export function ActionAddressAutocomplete({
  id,
  icon: Icon = MapPin,
  label,
  placeholder,
  value,
  onChange,
  optional,
  helperText,
}: ActionAddressAutocompleteProps) {
  const behavior = useActionAddressAutocomplete({ value, onChange });

  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-900/55">
        {label}
        {optional ? <span className="rounded-full bg-[#ECF8EF] px-1.5 py-0.5 cmm-text-caption text-emerald-900/45">optionnel</span> : null}
      </span>
      <div className="relative">
        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-900/30"><Icon size={15} /></div>
        <input
          id={id}
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-emerald-200/70 bg-[#F3FBF6] pl-9 pr-10 text-sm font-medium text-emerald-950 outline-none transition placeholder:text-emerald-700/35 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15"
          value={value}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={behavior.hasVisibleSuggestions}
          aria-controls={behavior.listboxId}
          onChange={behavior.handleChange}
          onFocus={behavior.handleFocus}
          onBlur={behavior.handleBlur}
          onKeyDown={behavior.handleKeyDown}
        />
        {behavior.hasVisibleSuggestions && behavior.isLoading ? (
          <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-700/45"><Loader2 size={14} className="animate-spin" /></div>
        ) : null}
        {behavior.hasVisibleSuggestions ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-[1.35rem] border border-emerald-200/80 bg-white shadow-[0_22px_44px_-24px_rgba(16,24,40,0.35)]">
            <div className="border-b border-emerald-100 bg-[#F7FCF9] px-4 py-2 cmm-text-caption font-black uppercase tracking-[0.18em] text-emerald-900/45">{helperText}</div>
            <div id={behavior.listboxId} role="listbox" className="max-h-72 overflow-auto p-1.5">
              {behavior.suggestions.length > 0 ? behavior.suggestions.map((suggestion, index) => {
                const isHighlighted = index === behavior.highlightedIndex;
                return (
                  <button
                    key={`${suggestion.label}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isHighlighted}
                    onMouseDown={(event) => { event.preventDefault(); behavior.selectSuggestion(suggestion); }}
                    onMouseEnter={() => behavior.setHighlightedIndex(index)}
                    className={cn("flex w-full items-start gap-3 rounded-[1rem] px-3 py-2.5 text-left transition-colors", isHighlighted ? "bg-emerald-50 text-emerald-950" : "hover:bg-emerald-50/70")}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700"><MapPin size={14} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-emerald-950">{suggestion.label}</span>
                      <span className="mt-0.5 block truncate text-xs text-emerald-700/55">{suggestion.subtitle}</span>
                    </span>
                  </button>
                );
              }) : (
                <div className="px-4 py-3 text-sm text-emerald-900/55">
                  {behavior.trimmedValue.length < 3 ? "Tapez au moins 3 caractères pour obtenir des adresses exactes." : "Aucune adresse exacte trouvée pour cette saisie."}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </label>
  );
}
