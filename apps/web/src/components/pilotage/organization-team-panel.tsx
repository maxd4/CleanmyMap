"use client";

import { useState } from "react";
import { CmmCard } from "@/components/ui/cmm-card";
import type { OrganizationWorkspace } from "@/lib/organizations/contracts";

type TeamCommand = (organizationId: string, command: Record<string, unknown>) => void;

export function OrganizationTeamPanel({
  workspace,
  locale,
  busy,
  onMutate,
}: {
  workspace: OrganizationWorkspace;
  locale: "fr" | "en";
  busy: boolean;
  onMutate: TeamCommand;
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "manager" | "site_manager">("member");
  const [inviteSite, setInviteSite] = useState("");
  const [successorId, setSuccessorId] = useState("");
  const english = locale === "en";
  const text = english
    ? { title: "My team", noMembers: "No active members.", partial: "Partial list.", email: "Collaborator email", role: "Role", site: "Site", choose: "Choose", invite: "Invite", revoke: "Revoke", leave: "Leave organization", transfer: "Transfer responsibility to", activeManager: "Active manager", expires: "expires" }
    : { title: "Mon équipe", noMembers: "Aucun membre actif.", partial: "Liste partielle.", email: "Courriel du collaborateur", role: "Rôle", site: "Site", choose: "Choisir", invite: "Inviter", revoke: "Révoquer", leave: "Quitter l’organisation", transfer: "Transférer la responsabilité à", activeManager: "Gestionnaire actif", expires: "expire le" };
  const roleLabel = (role: OrganizationWorkspace["role"] | "site_manager") => {
    const labels = english
      ? { owner: "Owner", manager: "Manager", site_manager: "Site manager", member: "Member" }
      : { owner: "Responsable", manager: "Gestionnaire", site_manager: "Gestionnaire de site", member: "Membre" };
    return labels[role];
  };
  const activeSites = workspace.sites.filter((site) => !site.archived_at);
  const activeManagers = workspace.members.filter((member) => member.state === "active" && member.member_role === "manager");

  return <CmmCard className="space-y-3">
    <h2 className="font-bold">{text.title}</h2>
    <ul>{workspace.members.filter((member) => member.state === "active" || workspace.role === "owner").map((member) => (
      <li key={member.id}>
        {member.label} · {roleLabel(member.member_role)} · {member.state}
        {member.state === "pending" && member.expires_at
          ? ` · ${text.expires} ${new Date(member.expires_at).toLocaleDateString(english ? "en-GB" : "fr-FR")}`
          : null}
        {workspace.role === "owner" && !member.is_self && member.state !== "revoked"
          ? <button type="button" disabled={busy} onClick={() => onMutate(workspace.id, { operation: "revoke", membershipId: member.id })}>{text.revoke}</button>
          : null}
      </li>
    ))}</ul>
    {workspace.members.length === 0 ? <p>{text.noMembers}</p> : null}
    {workspace.members.length === 101 ? <p>{text.partial}</p> : null}
    {workspace.role === "owner" ? <form onSubmit={(event) => {
      event.preventDefault();
      onMutate(workspace.id, { operation: "invite", targetEmail: inviteEmail, role: inviteRole, siteId: inviteRole === "site_manager" ? inviteSite || null : null });
    }}>
      <label>{text.email} <input type="email" autoComplete="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} maxLength={254} /></label>
      <label>{text.role} <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as typeof inviteRole)}>
        <option value="member">{roleLabel("member")}</option>
        <option value="manager">{roleLabel("manager")}</option>
        <option value="site_manager">{roleLabel("site_manager")}</option>
      </select></label>
      {inviteRole === "site_manager" ? <label>{text.site} <select required value={inviteSite} onChange={(event) => setInviteSite(event.target.value)}>
        <option value="">{text.choose}</option>
        {activeSites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
      </select></label> : null}
      <button type="submit" disabled={busy || (inviteRole === "site_manager" && !inviteSite)}>{text.invite}</button>
    </form> : null}
    <button className="text-sm underline" type="button" disabled={busy} onClick={() => onMutate(workspace.id, { operation: "leave" })}>{text.leave}</button>
    {workspace.role === "owner" ? <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
      event.preventDefault();
      if (successorId) onMutate(workspace.id, { operation: "transfer_owner", membershipId: successorId });
    }}>
      <label>{text.transfer} <select required value={successorId} onChange={(event) => setSuccessorId(event.target.value)}>
        <option value="">{text.activeManager}</option>
        {activeManagers.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}
      </select></label>
      <button type="submit" disabled={busy || !successorId}>{text.transfer}</button>
    </form> : null}
  </CmmCard>;
}
