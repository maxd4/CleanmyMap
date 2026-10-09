import { useEffect, useMemo, useState } from "react";
import {
  getStaticOrganizerSuggestions,
  type OrganizerDirectorySuggestion,
} from "@/lib/actions/organizer-directory-registry";
import type { OrganizerType } from "@/lib/actions/organizer-type";

export function useOrganizerSuggestions(
  organizerType: OrganizerType | "",
  value: string,
): OrganizerDirectorySuggestion[] {
  const [remoteSuggestions, setRemoteSuggestions] = useState<OrganizerDirectorySuggestion[]>([]);
  const [remoteSuggestionsKey, setRemoteSuggestionsKey] = useState("");
  const remoteQueryKey = `${organizerType}:${value.trim()}`;

  useEffect(() => {
    if (!organizerType || organizerType === "spontaneous" || value.trim().length < 2) return;
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
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [organizerType, remoteQueryKey, value]);

  return useMemo(() => {
    if (!organizerType || organizerType === "spontaneous") return [];
    const seen = new Set<string>();
    const currentRemoteSuggestions = remoteSuggestionsKey === remoteQueryKey ? remoteSuggestions : [];
    return [...getStaticOrganizerSuggestions(organizerType, value), ...currentRemoteSuggestions].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 20);
  }, [organizerType, remoteQueryKey, remoteSuggestions, remoteSuggestionsKey, value]);
}
