"use client";

import { usePartnerOnboarding } from "./onboarding/use-partner-onboarding";
import { GeneralInfoSection } from "./onboarding/sections/GeneralInfoSection";
import { GeographicCoverageSection } from "./onboarding/sections/GeographicCoverageSection";
import { AvailabilitySection } from "./onboarding/sections/AvailabilitySection";
import { ContactSection } from "./onboarding/sections/ContactSection";
import type { ContributionType } from "@/lib/partners/onboarding-types";

const CONTRIBUTION_OPTIONS: Array<{ value: ContributionType; label: string }> = [
  { value: "materiel", label: "Matériel" },
  { value: "logistique", label: "Logistique" },
  { value: "accueil", label: "Accueil" },
  { value: "financement", label: "Financement" },
  { value: "communication", label: "Communication" },
];

export function PartnerOnboardingForm() {
  const {
    organizationName, setOrganizationName,
    organizationType, setOrganizationType,
    partnerScope, setPartnerScope,
    legalIdentity, setLegalIdentity,
    coverageQuartierInput, setCoverageQuartierInput,
    setCoverageQuartiers,
    availabilitySlots,
    availabilityNote, setAvailabilityNote,
    contactName, setContactName, setContactNameTouched,
    contactChannel, setContactChannel,
    contactDetails, setContactDetails, setContactDetailsTouched,
    motivation, setMotivation,
    relayActions, setRelayActions,
    contributionTypes,
    honeypot, setHoneypot,
    isSubmitting,
    message,
    errorMessage,
    contributionError,
    coverage,
    estimatedDuration,
    addCoverageQuartiers,
    toggleContribution,
    toggleArrondissement,
    updateAvailabilitySlot,
    addAvailabilitySlot,
    removeAvailabilitySlot,
    handleSubmit,
  } = usePartnerOnboarding();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden opacity-0" aria-hidden="true">
        <label htmlFor="partner-onboarding-website">Website</label>
        <input
          id="partner-onboarding-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 cmm-text-small text-emerald-900">
        Parcours rapide partenaire: {estimatedDuration}% complété.
      </div>

      <GeneralInfoSection
        organizationName={organizationName}
        setOrganizationName={setOrganizationName}
        organizationType={organizationType}
        setOrganizationType={setOrganizationType}
        partnerScope={partnerScope}
        setPartnerScope={setPartnerScope}
        legalIdentity={legalIdentity}
        setLegalIdentity={setLegalIdentity}
      />

      <GeographicCoverageSection
        partnerScope={partnerScope}
        coverage={coverage}
        coverageQuartierInput={coverageQuartierInput}
        setCoverageQuartierInput={setCoverageQuartierInput}
        addCoverageQuartiers={addCoverageQuartiers}
        toggleArrondissement={toggleArrondissement}
        setCoverageQuartiers={setCoverageQuartiers}
      />

      <label className="block space-y-1">
        <span className="cmm-text-caption font-semibold cmm-text-secondary">Actions de relais</span>
        <textarea
          value={relayActions}
          onChange={(event) => setRelayActions(event.target.value)}
          rows={3}
          placeholder="Relais presse, diffusion réseau local, mobilisation d'une antenne, partage sur les canaux partenaires..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
        />
        <p className="cmm-text-caption cmm-text-muted">
          Décris les relais que la structure peut activer pour un cleanup ou une action citoyenne.
        </p>
      </label>

      <AvailabilitySection
        availabilitySlots={availabilitySlots}
        availabilityNote={availabilityNote}
        setAvailabilityNote={setAvailabilityNote}
        updateAvailabilitySlot={updateAvailabilitySlot}
        addAvailabilitySlot={addAvailabilitySlot}
        removeAvailabilitySlot={removeAvailabilitySlot}
      />

      <fieldset className="space-y-2">
        <legend className="cmm-text-caption font-semibold cmm-text-secondary">
          Contribution réelle possible
        </legend>
        <div className="flex flex-wrap gap-2">
          {CONTRIBUTION_OPTIONS.map((option) => {
            const checked = contributionTypes.includes(option.value);
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => toggleContribution(option.value)}
                className={`rounded-lg px-3 py-2 cmm-text-caption font-semibold ${
                  checked
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 cmm-text-secondary"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {contributionError ? (
          <p className="cmm-text-caption text-rose-700">{contributionError}</p>
        ) : null}
      </fieldset>

      <ContactSection
        contactName={contactName}
        setContactName={setContactName}
        setContactNameTouched={setContactNameTouched}
        contactChannel={contactChannel}
        setContactChannel={setContactChannel}
        contactDetails={contactDetails}
        setContactDetails={setContactDetails}
        setContactDetailsTouched={setContactDetailsTouched}
      />

      <label className="block space-y-1">
        <span className="cmm-text-caption font-semibold cmm-text-secondary">
          Pourquoi rejoindre le réseau partenaire ?
        </span>
        <textarea
          required
          value={motivation}
          onChange={(event) => setMotivation(event.target.value)}
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
        />
      </label>

      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 cmm-text-small text-emerald-900">
          {message}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 cmm-text-small text-rose-800">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 cmm-text-small font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
      >
        {isSubmitting ? "Envoi en cours..." : "Envoyer"}
      </button>
    </form>
  );
}
