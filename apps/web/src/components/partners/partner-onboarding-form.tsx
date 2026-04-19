"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";

type ContributionType =
  | "materiel"
  | "logistique"
  | "accueil"
  | "financement"
  | "communication";

const CONTRIBUTION_OPTIONS: Array<{ value: ContributionType; label: string }> = [
  { value: "materiel", label: "Materiel" },
  { value: "logistique", label: "Logistique" },
  { value: "accueil", label: "Accueil" },
  { value: "financement", label: "Financement" },
  { value: "communication", label: "Communication" },
];

const TYPE_OPTIONS = [
  { value: "association", label: "Association" },
  { value: "commerce", label: "Commercant" },
  { value: "entreprise", label: "Entreprise" },
  { value: "collectif", label: "Collectif" },
] as const;

export function PartnerOnboardingForm() {
  const { user } = useUser();
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState<
    (typeof TYPE_OPTIONS)[number]["value"]
  >("commerce");
  const [legalIdentity, setLegalIdentity] = useState("");
  const [coverage, setCoverage] = useState("");
  const [availability, setAvailability] = useState("");
  const [contactName, setContactName] = useState(
    user?.firstName?.trim() || user?.username?.trim() || "",
  );
  const [contactChannel, setContactChannel] = useState("Email");
  const [contactDetails, setContactDetails] = useState(
    user?.primaryEmailAddress?.emailAddress ?? "",
  );
  const [contactNameTouched, setContactNameTouched] = useState(false);
  const [contactDetailsTouched, setContactDetailsTouched] = useState(false);
  const [motivation, setMotivation] = useState("");
  const [contributionTypes, setContributionTypes] = useState<ContributionType[]>([
    "accueil",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contributionError, setContributionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    if (!contactNameTouched) {
      const fallbackName = user.firstName?.trim() || user.username?.trim() || "";
      if (fallbackName.length > 0) {
        setContactName((current) => (current.trim().length > 0 ? current : fallbackName));
      }
    }
    if (!contactDetailsTouched) {
      const fallbackContact = user.primaryEmailAddress?.emailAddress ?? "";
      if (fallbackContact.length > 0) {
        setContactDetails((current) =>
          current.trim().length > 0 ? current : fallbackContact,
        );
      }
    }
  }, [contactDetailsTouched, contactNameTouched, user]);

  const estimatedDuration = useMemo(() => {
    const completedFields = [
      organizationName,
      legalIdentity,
      coverage,
      availability,
      contactName,
      contactChannel,
      contactDetails,
      motivation,
    ].filter((value) => value.trim().length > 0).length;
    const progress = Math.min(100, Math.round((completedFields / 8) * 100));
    return progress;
  }, [
    organizationName,
    legalIdentity,
    coverage,
    availability,
    contactName,
    contactChannel,
    contactDetails,
    motivation,
  ]);

  const toggleContribution = (value: ContributionType) => {
    setContributionTypes((current) => {
      if (current.includes(value)) {
        if (current.length === 1) {
          setContributionError("Selectionnez au moins un type de contribution.");
          return current;
        }
        setContributionError(null);
        return current.filter((item) => item !== value);
      }
      setContributionError(null);
      return [...current, value];
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setMessage(null);
    if (contributionTypes.length === 0) {
      setContributionError("Selectionnez au moins un type de contribution.");
      return;
    }
    setContributionError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/partners/onboarding-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName,
          organizationType,
          legalIdentity,
          coverage,
          contributionTypes,
          availability,
          contactName,
          contactChannel,
          contactDetails,
          motivation,
        }),
      });

      const payload = (await response.json()) as {
        requestId?: string;
        error?: string;
      };

      if (!response.ok) {
        setErrorMessage(payload.error ?? "Erreur pendant la soumission.");
        return;
      }

      setMessage(
        `Demande envoyee aux admins (ID ${payload.requestId ?? "n/a"}). Delai cible: 72h ouvrées.`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur inconnue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Parcours rapide commerçant engagé: {estimatedDuration}% complete.
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-700">Nom organisation</span>
          <input
            required
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-700">Type</span>
          <select
            value={organizationType}
            onChange={(event) =>
              setOrganizationType(
                event.target.value as (typeof TYPE_OPTIONS)[number]["value"],
              )
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-700">Identite legale ou associative</span>
        <input
          required
          value={legalIdentity}
          onChange={(event) => setLegalIdentity(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-700">Perimetre geographique</span>
          <input
            required
            value={coverage}
            onChange={(event) => setCoverage(event.target.value)}
            placeholder="ex: Paris 10e, 11e, 18e"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-700">Disponibilite</span>
          <input
            required
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
            placeholder="ex: du mardi au samedi"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-slate-700">
          Contribution reelle possible
        </legend>
        <div className="flex flex-wrap gap-2">
          {CONTRIBUTION_OPTIONS.map((option) => {
            const checked = contributionTypes.includes(option.value);
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => toggleContribution(option.value)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  checked
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {contributionError ? (
          <p className="text-xs text-rose-700">{contributionError}</p>
        ) : null}
      </fieldset>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="space-y-1 md:col-span-1">
          <span className="text-xs font-semibold text-slate-700">Contact</span>
          <input
            required
            value={contactName}
            onChange={(event) => {
              setContactNameTouched(true);
              setContactName(event.target.value);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1 md:col-span-1">
          <span className="text-xs font-semibold text-slate-700">Canal</span>
          <input
            required
            value={contactChannel}
            onChange={(event) => setContactChannel(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1 md:col-span-1">
          <span className="text-xs font-semibold text-slate-700">Coordonnee joignable</span>
          <input
            required
            value={contactDetails}
            onChange={(event) => {
              setContactDetailsTouched(true);
              setContactDetails(event.target.value);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-700">
          Pourquoi devenir commerçant engagé ?
        </span>
        <textarea
          required
          value={motivation}
          onChange={(event) => setMotivation(event.target.value)}
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
      >
        {isSubmitting ? "Envoi en cours..." : "Envoyer aux admins pour acceptation"}
      </button>
    </form>
  );
}
