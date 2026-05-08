import React from "react";
import { PARTNER_SCOPES, formatPartnerScopeLabel, type OrganizationType, type PartnerScope } from "@/lib/partners/onboarding-types";

export const TYPE_OPTIONS = [
  { value: "association", label: "Association" },
  { value: "commerce", label: "Commerçant·e" },
  { value: "entreprise", label: "Entreprise" },
  { value: "collectif", label: "Collectif" },
] as const;

export const SCOPE_OPTIONS = PARTNER_SCOPES.map((scope) => ({
  value: scope,
  label: formatPartnerScopeLabel(scope),
}));

export function GeneralInfoSection({
  organizationName,
  setOrganizationName,
  organizationType,
  setOrganizationType,
  partnerScope,
  setPartnerScope,
  legalIdentity,
  setLegalIdentity,
}: {
  organizationName: string;
  setOrganizationName: (v: string) => void;
  organizationType: OrganizationType;
  setOrganizationType: (v: OrganizationType) => void;
  partnerScope: PartnerScope;
  setPartnerScope: (v: PartnerScope) => void;
  legalIdentity: string;
  setLegalIdentity: (v: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">Nom de la structure</span>
          <input
            required
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
          />
        </label>
        <label className="space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">Type</span>
          <select
            value={organizationType}
            onChange={(event) => setOrganizationType(event.target.value as OrganizationType)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">Portée du partenaire</span>
          <select
            value={partnerScope}
            onChange={(event) => setPartnerScope(event.target.value as PartnerScope)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
          >
            {SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="cmm-text-caption cmm-text-muted">
            {partnerScope === "local"
              ? "Couverture locale par arrondissement ou quartier."
              : "La couverture nationale n'a pas besoin d'arrondissements par défaut."}
          </p>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="cmm-text-caption font-semibold cmm-text-secondary">Identité légale ou associative</span>
        <input
          required
          value={legalIdentity}
          onChange={(event) => setLegalIdentity(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
        />
      </label>
    </>
  );
}
