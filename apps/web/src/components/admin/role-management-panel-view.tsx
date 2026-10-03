"use client";

import type { FormEvent } from "react";
import type { RoleAccountRecord } from "@/lib/admin/role-management";
import {
  ROLE_CHANGE_REASON_MAX_LENGTH,
  ROLE_CHANGE_REASON_MIN_LENGTH,
} from "./role-management-panel.model";

export type RoleActionState = {
  userId: string;
  action: "assign" | "revoke";
  role?: "admin" | "elu";
} | null;

export type SearchState = {
  status: "idle" | "searching" | "done";
  message: string | null;
};

type RoleChangeHandler = (
  userId: string,
  action: "assign" | "revoke",
  role?: "admin" | "elu",
) => void;

type RoleRowProps = {
  item: RoleAccountRecord;
  fr: boolean;
  currentUserId: string;
  actionState: RoleActionState;
  onRoleChange: RoleChangeHandler;
};

function roleBadgeLabel(roleLabel: RoleAccountRecord["roleLabel"], fr: boolean) {
  if (roleLabel === "admin") return fr ? "Administrateur" : "Administrator";
  if (roleLabel === "elu") return fr ? "Élu·e" : "Elected representative";
  if (roleLabel === "entreprise") return fr ? "Entreprise" : "Business";
  if (roleLabel === "max") return "IMU";
  return roleLabel;
}

function roleTone(roleLabel: RoleAccountRecord["roleLabel"]) {
  if (roleLabel === "admin") return "border-sky-200 bg-sky-50 text-sky-700";
  if (roleLabel === "elu") return "border-violet-200 bg-violet-50 text-violet-700";
  if (roleLabel === "entreprise") return "border-blue-200 bg-blue-50 text-blue-700";
  if (roleLabel === "max") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function RoleChangeReasonField({
  fr,
  reason,
  reasonError,
  onChange,
}: {
  fr: boolean;
  reason: string;
  reasonError: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-4 max-w-3xl space-y-1">
      <label htmlFor="role-change-reason" className="cmm-text-caption font-semibold cmm-text-secondary">
        {fr ? "Motif de la modification" : "Reason for this change"}
      </label>
      <textarea
        id="role-change-reason"
        value={reason}
        onChange={(event) => onChange(event.target.value)}
        minLength={ROLE_CHANGE_REASON_MIN_LENGTH}
        maxLength={ROLE_CHANGE_REASON_MAX_LENGTH}
        aria-invalid={reasonError ? "true" : "false"}
        aria-describedby={reasonError ? "role-change-reason-error" : undefined}
        placeholder={fr ? "Expliquez brièvement pourquoi le rôle doit changer." : "Briefly explain why the role should change."}
        className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
      />
      <div className="flex flex-wrap justify-between gap-2">
        {reasonError ? (
          <p id="role-change-reason-error" className="cmm-text-caption font-medium text-rose-700">{reasonError}</p>
        ) : (
          <p className="cmm-text-caption cmm-text-muted">
            {fr ? `Requis, ${ROLE_CHANGE_REASON_MIN_LENGTH} à ${ROLE_CHANGE_REASON_MAX_LENGTH} caractères.` : `Required, ${ROLE_CHANGE_REASON_MIN_LENGTH} to ${ROLE_CHANGE_REASON_MAX_LENGTH} characters.`}
          </p>
        )}
        <p className="cmm-text-caption cmm-text-muted">{reason.length}/{ROLE_CHANGE_REASON_MAX_LENGTH}</p>
      </div>
    </div>
  );
}

function RoleAccountIdentityCell({ item, fr, isSelf }: { item: RoleAccountRecord; fr: boolean; isSelf: boolean }) {
  const initials = item.displayName.split(" ").slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "M";
  return (
    <td>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{initials}</div>
        <div>
          <p className="cmm-text-small font-semibold cmm-text-primary">{item.displayName}{isSelf ? <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 cmm-text-caption font-semibold uppercase tracking-wide text-emerald-700">{fr ? "Vous" : "You"}</span> : null}</p>
          <p className="cmm-text-caption cmm-text-muted">{item.handle ? `@${item.handle}` : item.userId}</p>
        </div>
      </div>
    </td>
  );
}

function RoleActionButton({ busy, disabled, onClick, label, busyLabel, className }: { busy: boolean; disabled?: boolean; onClick: () => void; label: string; busyLabel: string; className: string }) {
  return <button type="button" disabled={disabled || busy} onClick={onClick} className={className}>{busy ? busyLabel : label}</button>;
}

function RoleAccountActionsCell({ item, fr, isSelf, canModify, canAssign, busy, actionState, onRoleChange }: RoleRowProps & { isSelf: boolean; canModify: boolean; canAssign: boolean; busy: boolean }) {
  return (
    <td>
      <div className="flex flex-wrap gap-2">
        {["admin", "elu"].includes(item.roleLabel) ? <RoleActionButton busy={busy && actionState?.action === "revoke"} disabled={!canModify} onClick={() => onRoleChange(item.userId, "revoke")} label={fr ? "Révoquer" : "Revoke"} busyLabel={fr ? "Révocation..." : "Revoking..."} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 cmm-text-caption font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60" /> : null}
        {canAssign ? <>
          <RoleActionButton busy={busy && actionState?.action === "assign" && actionState.role === "elu"} onClick={() => onRoleChange(item.userId, "assign", "elu")} label={fr ? "Attribuer élu" : "Assign elected"} busyLabel={fr ? "Attribution..." : "Assigning..."} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 cmm-text-caption font-semibold text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60" />
          <RoleActionButton busy={busy && actionState?.action === "assign" && actionState.role === "admin"} onClick={() => onRoleChange(item.userId, "assign", "admin")} label={fr ? "Attribuer admin" : "Assign admin"} busyLabel={fr ? "Attribution..." : "Assigning..."} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 cmm-text-caption font-semibold text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60" />
        </> : null}
        {item.roleLabel === "max" ? <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 cmm-text-caption font-semibold text-amber-700">IMU</span> : null}
        {isSelf ? <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 cmm-text-caption font-semibold text-slate-500">{fr ? "Protection" : "Protected"}</span> : null}
      </div>
    </td>
  );
}

function RoleAccountRow({ item, fr, currentUserId, actionState, onRoleChange }: RoleRowProps) {
  const isSelf = item.userId === currentUserId;
  const canModify = item.roleLabel !== "max" && !isSelf;
  const canAssign = canModify && item.roleLabel !== "admin" && item.roleLabel !== "elu";
  const busy = actionState?.userId === item.userId;
  return (
    <tr>
      <RoleAccountIdentityCell item={item} fr={fr} isSelf={isSelf} />
      <td className="cmm-text-caption cmm-text-muted"><div className="space-y-1"><p className="font-mono cmm-text-caption leading-5 break-all">{item.userId}</p>{item.parisArrondissement ? <p>{fr ? "Arrondissement" : "District"} {item.parisArrondissement}</p> : null}</div></td>
      <td><span className={`inline-flex rounded-full border px-2.5 py-1 cmm-text-caption font-semibold uppercase tracking-[0.12em] ${roleTone(item.roleLabel)}`}>{roleBadgeLabel(item.roleLabel, fr)}</span></td>
      <RoleAccountActionsCell item={item} fr={fr} currentUserId={currentUserId} actionState={actionState} onRoleChange={onRoleChange} isSelf={isSelf} canModify={canModify} canAssign={canAssign} busy={busy} />
    </tr>
  );
}

function RoleAccountsTable({
  accounts,
  fr,
  currentUserId,
  actionState,
  onRoleChange,
}: {
  accounts: RoleAccountRecord[];
  fr: boolean;
  currentUserId: string;
  actionState: RoleActionState;
  onRoleChange: RoleChangeHandler;
}) {
  return (
    <div className="cmm-data-table-wrap">
      <table className="cmm-data-table">
        <thead><tr><th scope="col">{fr ? "Compte" : "Account"}</th><th scope="col">{fr ? "Identifiant" : "ID"}</th><th scope="col">{fr ? "Rôle" : "Role"}</th><th scope="col">Actions</th></tr></thead>
        <tbody>{accounts.length > 0 ? accounts.map((item) => <RoleAccountRow key={item.userId} item={item} fr={fr} currentUserId={currentUserId} actionState={actionState} onRoleChange={onRoleChange} />) : <tr><td className="cmm-text-caption cmm-text-muted" colSpan={4}>{fr ? "Aucun compte admin ou élu à afficher." : "No admin or elected account to show."}</td></tr>}</tbody>
      </table>
    </div>
  );
}

export function RoleManagementPanelView({
  accounts,
  currentUserId,
  fr,
  searchQuery,
  searchResults,
  searchResultsCount,
  searchState,
  errorMessage,
  reason,
  reasonError,
  actionState,
  onSearch,
  onSearchQueryChange,
  onClearSearch,
  onReasonChange,
  onRoleChange,
}: {
  accounts: RoleAccountRecord[];
  currentUserId: string;
  fr: boolean;
  searchQuery: string;
  searchResults: RoleAccountRecord[];
  searchResultsCount: number;
  searchState: SearchState;
  errorMessage: string | null;
  reason: string;
  reasonError: string | null;
  actionState: RoleActionState;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onSearchQueryChange: (value: string) => void;
  onClearSearch: () => void;
  onReasonChange: (value: string) => void;
  onRoleChange: RoleChangeHandler;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">{fr ? "Gestion des comptes" : "Account management"}</p><h2 className="mt-1 text-base font-semibold cmm-text-primary">{fr ? "Admin et élus" : "Admins and elected"}</h2><p className="mt-2 cmm-text-caption cmm-text-muted">{fr ? "Recherche par identifiant ou pseudo, attribution de rôle et révocation en un seul endroit." : "Search by ID or handle, assign roles, and revoke access from one place."}</p></div><p className="cmm-text-caption cmm-text-muted">{accounts.length} {fr ? "compte(s)" : "account(s)"}</p></div>
      {errorMessage ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 cmm-text-caption font-medium text-rose-700">{errorMessage}</p> : null}
      <form onSubmit={onSearch} className="mt-4 flex flex-col gap-3 lg:flex-row"><label className="flex-1 space-y-1"><span className="cmm-text-caption font-semibold cmm-text-secondary">{fr ? "Rechercher un compte" : "Search an account"}</span><input value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder={fr ? "Identifiant Clerk, pseudo ou nom affiché" : "Clerk ID, handle, or display name"} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none" /></label><div className="flex items-end gap-2"><button type="submit" disabled={searchState.status === "searching"} className="rounded-lg bg-slate-900 px-4 py-2 cmm-text-caption font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{searchState.status === "searching" ? fr ? "Recherche..." : "Searching..." : fr ? "Rechercher" : "Search"}</button>{searchResults.length > 0 ? <button type="button" onClick={onClearSearch} className="rounded-lg border border-slate-300 bg-white px-4 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100">{fr ? "Effacer" : "Clear"}</button> : null}</div></form>
      {searchState.message ? <p className="mt-3 cmm-text-caption cmm-text-muted">{searchState.message}</p> : null}
      <RoleChangeReasonField fr={fr} reason={reason} reasonError={reasonError} onChange={onReasonChange} />
      <div className="mt-5"><RoleAccountsTable accounts={accounts} fr={fr} currentUserId={currentUserId} actionState={actionState} onRoleChange={onRoleChange} /></div>
      {searchResults.length > 0 ? <div className="mt-6"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold cmm-text-primary">{fr ? "Résultats de recherche" : "Search results"}</h3><p className="cmm-text-caption cmm-text-muted">{searchResultsCount} {fr ? "résultat(s)" : "result(s)"}</p></div><div className="mt-3"><RoleAccountsTable accounts={searchResults} fr={fr} currentUserId={currentUserId} actionState={actionState} onRoleChange={onRoleChange} /></div></div> : null}
    </section>
  );
}
