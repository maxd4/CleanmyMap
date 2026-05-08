import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import {
  type ContributionType,
  type OrganizationType,
  type PartnerScope,
  type ParisArrondissement,
  type PartnerAvailabilitySlot,
  type PartnerCoverage,
} from "@/lib/partners/onboarding-types";

export const INITIAL_AVAILABILITY_SLOT: PartnerAvailabilitySlot = {
  day: "tue",
  start: "09:00",
  end: "18:00",
};

export function usePartnerOnboarding() {
  const { user } = useUser();
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState<OrganizationType>("commerce");
  const [partnerScope, setPartnerScope] = useState<PartnerScope>("local");
  const [legalIdentity, setLegalIdentity] = useState("");
  
  const [coverageArrondissements, setCoverageArrondissements] = useState<ParisArrondissement[]>([]);
  const [coverageQuartierInput, setCoverageQuartierInput] = useState("");
  const [coverageQuartiers, setCoverageQuartiers] = useState<string[]>([]);
  
  const [availabilitySlots, setAvailabilitySlots] = useState<PartnerAvailabilitySlot[]>([
    INITIAL_AVAILABILITY_SLOT,
  ]);
  const [availabilityNote, setAvailabilityNote] = useState("");
  
  const [contactName, setContactName] = useState(
    user?.firstName?.trim() || user?.username?.trim() || ""
  );
  const [contactChannel, setContactChannel] = useState("Email");
  const [contactDetails, setContactDetails] = useState(
    user?.primaryEmailAddress?.emailAddress ?? ""
  );
  
  const [contactNameTouched, setContactNameTouched] = useState(false);
  const [contactDetailsTouched, setContactDetailsTouched] = useState(false);
  
  const [motivation, setMotivation] = useState("");
  const [relayActions, setRelayActions] = useState("");
  const [contributionTypes, setContributionTypes] = useState<ContributionType[]>(["accueil"]);
  
  const [honeypot, setHoneypot] = useState("");
  const [formStartedAt, setFormStartedAt] = useState<number | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contributionError, setContributionError] = useState<string | null>(null);
  const { acquire, release } = useSubmissionLock();

  useEffect(() => {
    setFormStartedAt(Date.now());
  }, []);

  const coverage: PartnerCoverage = useMemo(
    () => ({
      arrondissements: [...new Set(coverageArrondissements)].sort((a, b) => a - b),
      quartiers: [...new Set(coverageQuartiers.map((v) => v.trim()).filter(Boolean))],
    }),
    [coverageArrondissements, coverageQuartiers]
  );

  useEffect(() => {
    if (!user) return;
    if (!contactNameTouched) {
      const fallbackName = user.firstName?.trim() || user.username?.trim() || "";
      if (fallbackName.length > 0) {
        setContactName((current) => (current.trim().length > 0 ? current : fallbackName));
      }
    }
    if (!contactDetailsTouched) {
      const fallbackContact = user.primaryEmailAddress?.emailAddress ?? "";
      if (fallbackContact.length > 0) {
        setContactDetails((current) => (current.trim().length > 0 ? current : fallbackContact));
      }
    }
  }, [contactDetailsTouched, contactNameTouched, user]);

  const estimatedDuration = useMemo(() => {
    const completedFields = [
      organizationName,
      legalIdentity,
      contactName,
      contactChannel,
      contactDetails,
      motivation,
      relayActions,
    ].filter((value) => value.trim().length > 0).length;
    const structuredFields = [
      partnerScope ? 1 : 0,
      partnerScope === "local" ? coverage.arrondissements.length > 0 : 1,
      availabilitySlots.length > 0,
      contributionTypes.length > 0,
    ].filter(Boolean).length;
    return Math.min(100, Math.round(((completedFields + structuredFields) / 10) * 100));
  }, [
    availabilitySlots.length,
    contactChannel,
    contactDetails,
    contributionTypes.length,
    coverage.arrondissements.length,
    partnerScope,
    organizationName,
    legalIdentity,
    contactName,
    motivation,
    relayActions,
  ]);

  const addCoverageQuartiers = () => {
    const entries = coverageQuartierInput
      .split(/[,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (entries.length === 0) return;
    setCoverageQuartiers((current) => [...new Set([...current, ...entries])]);
    setCoverageQuartierInput("");
  };

  const toggleContribution = (value: ContributionType) => {
    setContributionTypes((current) => {
      if (current.includes(value)) {
        if (current.length === 1) {
          setContributionError("Sélectionnez au moins un type de contribution.");
          return current;
        }
        setContributionError(null);
        return current.filter((item) => item !== value);
      }
      setContributionError(null);
      return [...current, value];
    });
  };

  const toggleArrondissement = (value: ParisArrondissement) => {
    setCoverageArrondissements((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const updateAvailabilitySlot = (index: number, key: keyof PartnerAvailabilitySlot, value: string) => {
    setAvailabilitySlots((current) =>
      current.map((slot, slotIndex) => {
        if (slotIndex !== index) return slot;
        return { ...slot, [key]: value } as PartnerAvailabilitySlot;
      })
    );
  };

  const addAvailabilitySlot = () => {
    setAvailabilitySlots((current) => [...current, { ...INITIAL_AVAILABILITY_SLOT }]);
  };

  const removeAvailabilitySlot = (index: number) => {
    setAvailabilitySlots((current) => {
      if (current.length === 1) return current;
      return current.filter((_, slotIndex) => slotIndex !== index);
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setMessage(null);
    if (!acquire()) {
      setErrorMessage("Une demande est déjà en cours. Réessayez dans un instant.");
      return;
    }
    
    if (partnerScope === "local" && coverage.arrondissements.length === 0) {
      setErrorMessage("Sélectionne au moins un arrondissement.");
      release();
      return;
    }
    if (availabilitySlots.length === 0) {
      setErrorMessage("Ajoute au moins un créneau de disponibilité.");
      release();
      return;
    }
    if (availabilitySlots.some((slot) => slot.start >= slot.end)) {
      setErrorMessage("Chaque créneau doit avoir une heure de début avant l'heure de fin.");
      release();
      return;
    }
    if (contributionTypes.length === 0) {
      setContributionError("Sélectionnez au moins un type de contribution.");
      release();
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
          partnerScope,
          legalIdentity,
          coverage,
          contributionTypes,
          relayActions,
          availability: {
            slots: availabilitySlots,
            note: availabilityNote.trim() || undefined,
          },
          contactName,
          contactChannel,
          contactDetails,
          motivation,
          honeypot,
          submittedAt: formStartedAt ?? Date.now(),
        }),
      });

      const payload = (await response.json()) as {
        requestId?: string;
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setErrorMessage(
          payload.message ??
          payload.error ??
          "Impossible d'envoyer votre demande pour le moment. Veuillez vérifier vos informations ou réessayer plus tard."
        );
        return;
      }

      setMessage(`Demande envoyée à l'administration (ID ${payload.requestId ?? "n/a"}). Délai cible: 72h ouvrées.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue lors de l'envoi de votre formulaire. Veuillez réessayer."
      );
    } finally {
      setIsSubmitting(false);
      release();
    }
  };

  return {
    organizationName, setOrganizationName,
    organizationType, setOrganizationType,
    partnerScope, setPartnerScope,
    legalIdentity, setLegalIdentity,
    coverageArrondissements,
    coverageQuartierInput, setCoverageQuartierInput,
    coverageQuartiers, setCoverageQuartiers,
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
  };
}
