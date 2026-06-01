"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { RoleAccountRecord } from "@/lib/admin/role-management";

type RoleManagementPanelProps = {
  initialAccounts: RoleAccountRecord[];
  currentUserId: string;
};

type RoleActionState = {
  userId: string;
  action: "assign" | "revoke";
  role?: "admin" | "elu";
} | null;

type SearchState =
  | { status: "idle"; message: string | null }
  | { status: "searching"; message: string | null }
  | { status: "done"; message: string | null };

function roleBadgeLabel(roleLabel: RoleAccountRecord["roleLabel"], fr: boolean) {
  if (roleLabel === "admin") {
    return fr ? "Admin" : "Admin";
  }
  if (roleLabel === "elu") {
    return fr ? "Elu" : "Elected";
  }
  if (roleLabel === "entreprise") {
    return fr ? "Entreprise" : "Business";
  }
  if (roleLabel === "max") {
    return "IMU";
  }
  return roleLabel;
}

function roleTone(roleLabel: RoleAccountRecord["roleLabel"]) {
  if (roleLabel === "admin") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (roleLabel === "elu") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  if (roleLabel === "entreprise") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (roleLabel === "max") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function RoleManagementPanel({
  initialAccounts,
  currentUserId,
}: RoleManagementPanelProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [accounts, setAccounts] = useState(initialAccounts);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RoleAccountRecord[]>([]);
  const [searchState, setSearchState] = useState<SearchState>({
    status: "idle",
    message: null,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionState, setActionState] = useState<RoleActionState>(null);

  const searchResultsCount = useMemo(() => searchResults.length, [searchResults]);

  function mergeUpdatedAccount(updated: RoleAccountRecord) {
    setAccounts((current) => {
      const updatedAccounts = current.filter(
        (item) => item.userId !== updated.userId,
      );
      if (updated.roleLabel === "admin" || updated.roleLabel === "elu") {
        updatedAccounts.push(updated);
      }
      return updatedAccounts.sort((a, b) =>
        a.roleLabel === b.roleLabel
          ? a.displayName.localeCompare(b.displayName, "fr")
          : a.roleLabel.localeCompare(b.roleLabel, "fr"),
      );
    });
    setSearchResults((current) =>
      current.map((item) => (item.userId === updated.userId ? updated : item)),
    );
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchState({
        status: "done",
        message: fr
          ? "Tape au moins 2 caractères pour lancer la recherche."
          : "Type at least 2 characters to search.",
      });
      setSearchResults([]);
      return;
    }

    setSearchState({ status: "searching", message: null });
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/admin/role-accounts?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? (fr ? "Recherche impossible." : "Search failed."));
      }

      const payload = (await response.json().catch(() => null)) as
        | { accounts?: RoleAccountRecord[]; query?: string | null }
        | null;
      setSearchResults(payload?.accounts ?? []);
      setSearchState({
        status: "done",
        message:
          (payload?.accounts?.length ?? 0) > 0
            ? fr
              ? `${payload?.accounts?.length ?? 0} résultat(s).`
              : `${payload?.accounts?.length ?? 0} result(s).`
            : fr
              ? "Aucun compte trouvé."
              : "No account found.",
      });
    } catch (error) {
      setSearchResults([]);
      setSearchState({
        status: "done",
        message: null,
      });
      setErrorMessage(
        error instanceof Error
          ? error.message
          : fr
            ? "Une erreur inattendue est survenue."
            : "An unexpected error occurred.",
      );
    }
  }

  async function updateRole(
    userId: string,
    action: "assign" | "revoke",
    role?: "admin" | "elu",
  ) {
    setActionState({ userId, action, role });
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/role-accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, action, role }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? (fr ? "Action impossible." : "Action failed."));
      }

      const payload = (await response.json().catch(() => null)) as
        | { account?: RoleAccountRecord | null }
        | null;

      if (payload?.account) {
        mergeUpdatedAccount(payload.account);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : fr
            ? "Une erreur inattendue est survenue."
            : "An unexpected error occurred.",
      );
    } finally {
      setActionState(null);
    }
  }

  const renderRow = (item: RoleAccountRecord) => {
    const isSelf = item.userId === currentUserId;
    const canModify = item.roleLabel !== "max" && !isSelf;
    const canAssign = canModify && item.roleLabel !== "admin" && item.roleLabel !== "elu";
    const isAdminLike = item.roleLabel === "admin" || item.roleLabel === "elu";

    return (
      <tr key={item.userId} className="border-b border-slate-100 last:border-b-0">
        <td className="px-4 py-3 align-top">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {item.displayName
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? "")
                .join("") || "M"}
            </div>
            <div>
              <p className="cmm-text-small font-semibold cmm-text-primary">
                {item.displayName}
                {isSelf ? (
                  <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    {fr ? "Vous" : "You"}
                  </span>
                ) : null}
              </p>
              <p className="cmm-text-caption cmm-text-muted">
                {item.handle ? `@${item.handle}` : item.userId}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 align-top cmm-text-caption cmm-text-muted">
          <div className="space-y-1">
            <p className="font-mono text-[11px] leading-5 break-all">{item.userId}</p>
            {item.parisArrondissement ? (
              <p>
                {fr ? "Arrondissement" : "District"} {item.parisArrondissement}
              </p>
            ) : null}
          </div>
        </td>
        <td className="px-4 py-3 align-top">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${roleTone(item.roleLabel)}`}
          >
            {roleBadgeLabel(item.roleLabel, fr)}
          </span>
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex flex-wrap gap-2">
            {isAdminLike ? (
              <button
                type="button"
                disabled={!canModify || actionState?.userId === item.userId}
                onClick={() => void updateRole(item.userId, "revoke")}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionState?.userId === item.userId && actionState.action === "revoke"
                  ? fr
                    ? "Révocation..."
                    : "Revoking..."
                  : fr
                    ? "Révoquer"
                    : "Revoke"}
              </button>
            ) : null}
            {canAssign ? (
              <>
                <button
                  type="button"
                  disabled={actionState?.userId === item.userId}
                  onClick={() => void updateRole(item.userId, "assign", "elu")}
                  className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionState?.userId === item.userId &&
                  actionState.action === "assign" &&
                  actionState.role === "elu"
                    ? fr
                      ? "Attribution..."
                      : "Assigning..."
                    : fr
                      ? "Attribuer élu"
                      : "Assign elected"}
                </button>
                <button
                  type="button"
                  disabled={actionState?.userId === item.userId}
                  onClick={() => void updateRole(item.userId, "assign", "admin")}
                  className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionState?.userId === item.userId &&
                  actionState.action === "assign" &&
                  actionState.role === "admin"
                    ? fr
                      ? "Attribution..."
                      : "Assigning..."
                    : fr
                      ? "Attribuer admin"
                      : "Assign admin"}
                </button>
              </>
            ) : null}
            {item.roleLabel === "max" ? (
              <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
                IMU
              </span>
            ) : null}
            {isSelf ? (
              <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500">
                {fr ? "Protection" : "Protected"}
              </span>
            ) : null}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
            {fr ? "Gestion des comptes" : "Account management"}
          </p>
          <h2 className="mt-1 text-base font-semibold cmm-text-primary">
            {fr ? "Admin et élus" : "Admins and elected"}
          </h2>
          <p className="mt-2 cmm-text-caption cmm-text-muted">
            {fr
              ? "Recherche par identifiant ou pseudo, attribution de rôle et révocation en un seul endroit."
              : "Search by ID or handle, assign roles, and revoke access from one place."}
          </p>
        </div>
        <p className="cmm-text-caption cmm-text-muted">
          {accounts.length} {fr ? "compte(s)" : "account(s)"}
        </p>
      </div>

      {errorMessage ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 cmm-text-caption font-medium text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-3 lg:flex-row">
        <label className="flex-1 space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">
            {fr ? "Rechercher un compte" : "Search an account"}
          </span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={
              fr
                ? "Identifiant Clerk, pseudo ou nom affiché"
                : "Clerk ID, handle, or display name"
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={searchState.status === "searching"}
            className="rounded-lg bg-slate-900 px-4 py-2 cmm-text-caption font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {searchState.status === "searching"
              ? fr
                ? "Recherche..."
                : "Searching..."
              : fr
                ? "Rechercher"
                : "Search"}
          </button>
          {searchResults.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setSearchState({ status: "idle", message: null });
                setErrorMessage(null);
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100"
            >
              {fr ? "Effacer" : "Clear"}
            </button>
          ) : null}
        </div>
      </form>

      {searchState.message ? (
        <p className="mt-3 cmm-text-caption cmm-text-muted">{searchState.message}</p>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] cmm-text-muted">
                {fr ? "Compte" : "Account"}
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] cmm-text-muted">
                {fr ? "Identifiant" : "ID"}
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] cmm-text-muted">
                {fr ? "Rôle" : "Role"}
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] cmm-text-muted">
                {fr ? "Actions" : "Actions"}
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.length > 0 ? (
              accounts.map(renderRow)
            ) : (
              <tr>
                <td className="px-4 py-5 cmm-text-caption cmm-text-muted" colSpan={4}>
                  {fr
                    ? "Aucun compte admin ou élu à afficher."
                    : "No admin or elected account to show."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {searchResults.length > 0 ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold cmm-text-primary">
              {fr ? "Résultats de recherche" : "Search results"}
            </h3>
            <p className="cmm-text-caption cmm-text-muted">
              {searchResultsCount} {fr ? "résultat(s)" : "result(s)"}
            </p>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] cmm-text-muted">
                    {fr ? "Compte" : "Account"}
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] cmm-text-muted">
                    {fr ? "Identifiant" : "ID"}
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] cmm-text-muted">
                    {fr ? "Rôle" : "Role"}
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] cmm-text-muted">
                    {fr ? "Actions" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map(renderRow)}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
