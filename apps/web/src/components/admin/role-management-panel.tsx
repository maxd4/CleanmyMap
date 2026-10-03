"use client";

import { useState, type FormEvent } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { RoleAccountRecord } from "@/lib/admin/role-management";
import {
  ROLE_CHANGE_REASON_MAX_LENGTH,
  ROLE_CHANGE_REASON_MIN_LENGTH,
  validateRoleChangeReason,
} from "./role-management-panel.model";
import {
  RoleManagementPanelView,
  type RoleActionState,
  type SearchState,
} from "./role-management-panel-view";

type RoleManagementPanelProps = {
  initialAccounts: RoleAccountRecord[];
  currentUserId: string;
};

function useRoleManagementController(
  initialAccounts: RoleAccountRecord[],
  fr: boolean,
) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RoleAccountRecord[]>([]);
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle", message: null });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<RoleActionState>(null);

  function mergeUpdatedAccount(updated: RoleAccountRecord) {
    setAccounts((current) => {
      const next = current.filter((item) => item.userId !== updated.userId);
      if (updated.roleLabel === "admin" || updated.roleLabel === "elu") next.push(updated);
      return next.sort((left, right) => left.roleLabel === right.roleLabel ? left.displayName.localeCompare(right.displayName, "fr") : left.roleLabel.localeCompare(right.roleLabel, "fr"));
    });
    setSearchResults((current) => current.map((item) => item.userId === updated.userId ? updated : item));
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchState({ status: "done", message: fr ? "Tape au moins 2 caractères pour lancer la recherche." : "Type at least 2 characters to search." });
      setSearchResults([]);
      return;
    }
    setSearchState({ status: "searching", message: null });
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/admin/role-accounts?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? (fr ? "Recherche impossible." : "Search failed."));
      }
      const payload = (await response.json().catch(() => null)) as { accounts?: RoleAccountRecord[] } | null;
      const results = payload?.accounts ?? [];
      setSearchResults(results);
      setSearchState({ status: "done", message: results.length > 0 ? fr ? `${results.length} résultat(s).` : `${results.length} result(s).` : fr ? "Aucun compte trouvé." : "No account found." });
    } catch (error) {
      setSearchResults([]);
      setSearchState({ status: "done", message: null });
      setErrorMessage(error instanceof Error ? error.message : fr ? "Une erreur inattendue est survenue." : "An unexpected error occurred.");
    }
  }

  async function updateRole(userId: string, action: "assign" | "revoke", role?: "admin" | "elu") {
    const validation = validateRoleChangeReason(reason);
    if (validation) {
      setReasonError(validation === "required" ? fr ? "Indiquez la raison de cette modification." : "Enter a reason for this change." : validation === "too_short" ? fr ? `La raison doit contenir au moins ${ROLE_CHANGE_REASON_MIN_LENGTH} caractères.` : `The reason must contain at least ${ROLE_CHANGE_REASON_MIN_LENGTH} characters.` : fr ? `La raison ne peut pas dépasser ${ROLE_CHANGE_REASON_MAX_LENGTH} caractères.` : `The reason cannot exceed ${ROLE_CHANGE_REASON_MAX_LENGTH} characters.`);
      return;
    }
    setActionState({ userId, action, role });
    setErrorMessage(null);
    setReasonError(null);
    try {
      const response = await fetch("/api/admin/role-accounts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, action, role, reason: reason.trim() }) });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? (fr ? "Action impossible." : "Action failed."));
      }
      const payload = (await response.json().catch(() => null)) as { account?: RoleAccountRecord | null } | null;
      if (payload?.account) {
        mergeUpdatedAccount(payload.account);
        setReason("");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : fr ? "Une erreur inattendue est survenue." : "An unexpected error occurred.");
    } finally {
      setActionState(null);
    }
  }

  return {
    accounts,
    searchQuery,
    searchResults,
    searchResultsCount: searchResults.length,
    searchState,
    errorMessage,
    reason,
    reasonError,
    actionState,
    handleSearch,
    setSearchQuery,
    setSearchResults,
    setSearchState,
    setErrorMessage,
    setReason,
    setReasonError,
    updateRole,
  };
}

export function RoleManagementPanel({ initialAccounts, currentUserId }: RoleManagementPanelProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const controller = useRoleManagementController(initialAccounts, fr);

  return (
    <RoleManagementPanelView
      accounts={controller.accounts}
      currentUserId={currentUserId}
      fr={fr}
      searchQuery={controller.searchQuery}
      searchResults={controller.searchResults}
      searchResultsCount={controller.searchResultsCount}
      searchState={controller.searchState}
      errorMessage={controller.errorMessage}
      reason={controller.reason}
      reasonError={controller.reasonError}
      actionState={controller.actionState}
      onSearch={controller.handleSearch}
      onSearchQueryChange={controller.setSearchQuery}
      onClearSearch={() => {
        controller.setSearchQuery("");
        controller.setSearchResults([]);
        controller.setSearchState({ status: "idle", message: null });
        controller.setErrorMessage(null);
      }}
      onReasonChange={(value) => {
        controller.setReason(value);
        if (controller.reasonError) controller.setReasonError(null);
      }}
      onRoleChange={(userId, action, role) => {
        void controller.updateRole(userId, action, role);
      }}
    />
  );
}
