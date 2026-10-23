import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useUser } from "@clerk/nextjs";
import { usePartnerOnboardingSubmit } from "./use-partner-onboarding-submit";
import {
  type ContributionType,
  type OrganizationType,
  type PartnerScope,
  type ParisArrondissement,
  type PartnerAvailabilitySlot,
  type PartnerCoverage,
} from "@/lib/partners/onboarding-types";

const INITIAL_AVAILABILITY_SLOT: PartnerAvailabilitySlot = {
  day: "tue",
  start: "09:00",
  end: "18:00",
};

function usePartnerOnboardingEstimatedDuration({ organizationName, legalIdentity, contactName, contactChannel, contactDetails, motivation, relayActions, partnerScope, coverage, availabilitySlots, contributionTypes }: {
  organizationName: string;
  legalIdentity: string;
  contactName: string;
  contactChannel: string;
  contactDetails: string;
  motivation: string;
  relayActions: string;
  partnerScope: PartnerScope;
  coverage: PartnerCoverage;
  availabilitySlots: PartnerAvailabilitySlot[];
  contributionTypes: ContributionType[];
}) {
  return useMemo(() => {
    const completedFields = [organizationName, legalIdentity, contactName, contactChannel, contactDetails, motivation, relayActions].filter((value) => value.trim().length > 0).length;
    const structuredFields = [partnerScope ? 1 : 0, partnerScope === "local" ? coverage.arrondissements.length > 0 : 1, availabilitySlots.length > 0, contributionTypes.length > 0].filter(Boolean).length;
    return Math.min(100, Math.round(((completedFields + structuredFields) / 10) * 100));
  }, [availabilitySlots.length, contactChannel, contactDetails, contributionTypes.length, coverage.arrondissements.length, partnerScope, organizationName, legalIdentity, contactName, motivation, relayActions]);
}

function usePartnerOnboardingFieldHandlers({ coverageQuartierInput, setCoverageQuartierInput, setCoverageQuartiers, setContributionTypes, setContributionError, setCoverageArrondissements, setAvailabilitySlots }: {
  coverageQuartierInput: string;
  setCoverageQuartierInput: (value: string) => void;
  setCoverageQuartiers: Dispatch<SetStateAction<string[]>>;
  setContributionTypes: Dispatch<SetStateAction<ContributionType[]>>;
  setContributionError: (value: string | null) => void;
  setCoverageArrondissements: Dispatch<SetStateAction<ParisArrondissement[]>>;
  setAvailabilitySlots: Dispatch<SetStateAction<PartnerAvailabilitySlot[]>>;
}) {
  const addCoverageQuartiers = () => {
    const entries = coverageQuartierInput.split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
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
  const toggleArrondissement = (value: ParisArrondissement) => setCoverageArrondissements((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const updateAvailabilitySlot = (index: number, key: keyof PartnerAvailabilitySlot, value: string) => setAvailabilitySlots((current) => current.map((slot, slotIndex) => slotIndex === index ? { ...slot, [key]: value } as PartnerAvailabilitySlot : slot));
  const addAvailabilitySlot = () => setAvailabilitySlots((current) => [...current, { ...INITIAL_AVAILABILITY_SLOT }]);
  const removeAvailabilitySlot = (index: number) => setAvailabilitySlots((current) => current.length === 1 ? current : current.filter((_, slotIndex) => slotIndex !== index));
  return { addCoverageQuartiers, toggleContribution, toggleArrondissement, updateAvailabilitySlot, addAvailabilitySlot, removeAvailabilitySlot };
}

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
  
  const [contactNameOverride, setContactNameOverride] = useState("");
  const [contactChannel, setContactChannel] = useState("Email");
  const [contactDetailsOverride, setContactDetailsOverride] = useState("");
  const [publicWebsiteUrl, setPublicWebsiteUrl] = useState("");
  const [publicWebsiteConsent, setPublicWebsiteConsent] = useState(false);
  
  const [contactNameTouched, setContactNameTouched] = useState(false);
  const [contactDetailsTouched, setContactDetailsTouched] = useState(false);
  
  const [motivation, setMotivation] = useState("");
  const [relayActions, setRelayActions] = useState("");
  const [contributionTypes, setContributionTypes] = useState<ContributionType[]>(["accueil"]);
  
  const [honeypot, setHoneypot] = useState("");
  const formStartedAt = useRef<number | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contributionError, setContributionError] = useState<string | null>(null);
  useEffect(() => {
    formStartedAt.current = Date.now();
  }, []);

  const coverage: PartnerCoverage = useMemo(
    () => ({
      arrondissements: [...new Set(coverageArrondissements)].sort((a, b) => a - b),
      quartiers: [...new Set(coverageQuartiers.map((v) => v.trim()).filter(Boolean))],
    }),
    [coverageArrondissements, coverageQuartiers]
  );

  const fallbackContactName = user?.firstName?.trim() || user?.username?.trim() || "";
  const fallbackContactDetails = user?.primaryEmailAddress?.emailAddress ?? "";
  const contactName =
    contactNameTouched || contactNameOverride.trim().length > 0
      ? contactNameOverride
      : fallbackContactName;
  const contactDetails =
    contactDetailsTouched || contactDetailsOverride.trim().length > 0
      ? contactDetailsOverride
      : fallbackContactDetails;
  const estimatedDuration = usePartnerOnboardingEstimatedDuration({ organizationName, legalIdentity, contactName, contactChannel, contactDetails, motivation, relayActions, partnerScope, coverage, availabilitySlots, contributionTypes });

  const fieldHandlers = usePartnerOnboardingFieldHandlers({ coverageQuartierInput, setCoverageQuartierInput, setCoverageQuartiers, setContributionTypes, setContributionError, setCoverageArrondissements, setAvailabilitySlots });

  const handleSubmit = usePartnerOnboardingSubmit({ organizationName, organizationType, partnerScope, legalIdentity, coverage, contributionTypes, relayActions, availabilitySlots, availabilityNote, contactName, contactChannel, contactDetails, motivation, publicWebsiteUrl, publicWebsiteConsent, honeypot, getFormStartedAt: () => formStartedAt.current, markSubmissionSucceeded: (submittedAt) => { formStartedAt.current = Math.max(Date.now(), submittedAt + 1); }, setIsSubmitting, setMessage, setErrorMessage, setContributionError });

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
    contactName, setContactName: setContactNameOverride, setContactNameTouched,
    contactChannel, setContactChannel,
    contactDetails, setContactDetails: setContactDetailsOverride, setContactDetailsTouched,
    publicWebsiteUrl, setPublicWebsiteUrl,
    publicWebsiteConsent, setPublicWebsiteConsent,
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
    ...fieldHandlers,
    handleSubmit,
  };
}
