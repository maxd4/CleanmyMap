"use client";

import { useEffect, useMemo, useState } from"react";
import { useUser } from"@clerk/nextjs";
import {
 PARIS_ARRONDISSEMENTS,
 WEEKDAY_OPTIONS,
 type ContributionType,
 type OrganizationType,
 type ParisArrondissement,
 type PartnerAvailabilitySlot,
 type PartnerCoverage,
} from"@/lib/partners/onboarding-types";

const CONTRIBUTION_OPTIONS: Array<{ value: ContributionType; label: string }> = [
 { value:"materiel", label:"Matériel" },
 { value:"logistique", label:"Logistique" },
 { value:"accueil", label:"Accueil" },
 { value:"financement", label:"Financement" },
 { value:"communication", label:"Communication" },
];

const TYPE_OPTIONS = [
 { value:"association", label:"Association" },
 { value:"commerce", label:"Commerçant·e" },
 { value:"entreprise", label:"Entreprise" },
 { value:"collectif", label:"Collectif" },
] as const;

const INITIAL_AVAILABILITY_SLOT: PartnerAvailabilitySlot = {
 day:"tue",
 start:"09:00",
 end:"18:00",
};

export function PartnerOnboardingForm() {
 const { user } = useUser();
 const [organizationName, setOrganizationName] = useState("");
 const [organizationType, setOrganizationType] = useState<OrganizationType>("commerce");
 const [legalIdentity, setLegalIdentity] = useState("");
 const [coverageArrondissements, setCoverageArrondissements] = useState<
 ParisArrondissement[]
 >([]);
 const [coverageQuartierInput, setCoverageQuartierInput] = useState("");
 const [coverageQuartiers, setCoverageQuartiers] = useState<string[]>([]);
 const [availabilitySlots, setAvailabilitySlots] = useState<PartnerAvailabilitySlot[]>([
 INITIAL_AVAILABILITY_SLOT,
 ]);
 const [availabilityNote, setAvailabilityNote] = useState("");
 const [contactName, setContactName] = useState(
 user?.firstName?.trim() || user?.username?.trim() ||"",
 );
 const [contactChannel, setContactChannel] = useState("Email");
 const [contactDetails, setContactDetails] = useState(
 user?.primaryEmailAddress?.emailAddress ??"",
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

 const coverage: PartnerCoverage = useMemo(
 () => ({
 arrondissements: [...new Set(coverageArrondissements)].sort((left, right) => left - right),
 quartiers: [...new Set(coverageQuartiers.map((value) => value.trim()).filter(Boolean))],
 }),
 [coverageArrondissements, coverageQuartiers],
 );

 useEffect(() => {
 if (!user) {
 return;
 }
 if (!contactNameTouched) {
 const fallbackName = user.firstName?.trim() || user.username?.trim() ||"";
 if (fallbackName.length > 0) {
 setContactName((current) => (current.trim().length > 0 ? current : fallbackName));
 }
 }
 if (!contactDetailsTouched) {
 const fallbackContact = user.primaryEmailAddress?.emailAddress ??"";
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
 contactName,
 contactChannel,
 contactDetails,
 motivation,
 ].filter((value) => value.trim().length > 0).length;
 const structuredFields = [
 coverage.arrondissements.length > 0,
 availabilitySlots.length > 0,
 contributionTypes.length > 0,
 ].filter(Boolean).length;
 const progress = Math.min(100, Math.round(((completedFields + structuredFields) / 9) * 100));
 return progress;
 }, [
 availabilitySlots.length,
 contactChannel,
 contactDetails,
 contributionTypes.length,
 coverage.arrondissements.length,
 organizationName,
 legalIdentity,
 contactName,
 motivation,
 ]);

 const addCoverageQuartiers = () => {
 const entries = coverageQuartierInput
 .split(/[,;]+/)
 .map((item) => item.trim())
 .filter(Boolean);
 if (entries.length === 0) {
 return;
 }
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
 : [...current, value],
 );
 };

 const updateAvailabilitySlot = (
 index: number,
 key: keyof PartnerAvailabilitySlot,
 value: string,
 ) => {
 setAvailabilitySlots((current) =>
 current.map((slot, slotIndex) => {
 if (slotIndex !== index) {
 return slot;
 }
 return {
 ...slot,
 [key]: value,
 } as PartnerAvailabilitySlot;
 }),
 );
 };

 const addAvailabilitySlot = () => {
 setAvailabilitySlots((current) => [...current, { ...INITIAL_AVAILABILITY_SLOT }]);
 };

 const removeAvailabilitySlot = (index: number) => {
 setAvailabilitySlots((current) => {
 if (current.length === 1) {
 return current;
 }
 return current.filter((_, slotIndex) => slotIndex !== index);
 });
 };

 const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
 event.preventDefault();
 setErrorMessage(null);
 setMessage(null);
 if (coverage.arrondissements.length === 0) {
 setErrorMessage("Sélectionne au moins un arrondissement.");
 return;
 }
 if (availabilitySlots.length === 0) {
 setErrorMessage("Ajoute au moins un créneau de disponibilité.");
 return;
 }
    if (availabilitySlots.some((slot) => slot.start >= slot.end)) {
      setErrorMessage("Chaque créneau doit avoir une heure de début avant l'heure de fin.");
      return;
    }
 if (contributionTypes.length === 0) {
 setContributionError("Sélectionnez au moins un type de contribution.");
 return;
 }
 setContributionError(null);
 setIsSubmitting(true);

 try {
 const response = await fetch("/api/partners/onboarding-requests", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({
 organizationName,
 organizationType,
 legalIdentity,
 coverage,
 contributionTypes,
 availability: {
 slots: availabilitySlots,
 note: availabilityNote.trim() || undefined,
 },
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
 setErrorMessage(payload.error ??"Erreur pendant la soumission.");
 return;
 }

 setMessage(
 `Demande envoyée à l'administration (ID ${payload.requestId ??"n/a"}). Délai cible: 72h ouvrées.`,
 );
 } catch (error) {
 setErrorMessage(error instanceof Error ? error.message :"Erreur inconnue.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 cmm-text-small text-emerald-900">
 Parcours rapide partenaire: {estimatedDuration}% complété.
 </div>

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
 onChange={(event) =>
 setOrganizationType(
 event.target.value as (typeof TYPE_OPTIONS)[number]["value"],
 )
 }
 className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
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
 <span className="cmm-text-caption font-semibold cmm-text-secondary">Identité légale ou associative</span>
 <input
 required
 value={legalIdentity}
 onChange={(event) => setLegalIdentity(event.target.value)}
 className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
 />
 </label>

 <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
 <div>
 <h3 className="cmm-text-small font-semibold cmm-text-primary">Périmètre géographique</h3>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 Choisis au moins un arrondissement, puis ajoute les quartiers si besoin.
 </p>
 </div>
 <div className="flex flex-wrap gap-2">
 {PARIS_ARRONDISSEMENTS.map((arrondissement) => {
 const checked = coverage.arrondissements.includes(arrondissement);
 return (
 <button
 type="button"
 key={arrondissement}
 onClick={() => toggleArrondissement(arrondissement)}
 className={`rounded-full px-3 py-2 cmm-text-caption font-semibold transition ${
 checked
 ?"bg-slate-900 text-white"
 :"bg-white cmm-text-secondary border border-slate-300 hover:bg-slate-100"
 }`}
 >
 Paris {arrondissement === 1 ?"1er" : `${arrondissement}e`}
 </button>
 );
 })}
 </div>
 <div className="space-y-2">
 <div className="flex flex-col gap-2 sm:flex-row">
 <input
 value={coverageQuartierInput}
 onChange={(event) => setCoverageQuartierInput(event.target.value)}
 onKeyDown={(event) => {
 if (event.key ==="Enter") {
 event.preventDefault();
 addCoverageQuartiers();
 }
 }}
 placeholder="Quartiers (ex: Bas Belleville, Belleville)"
 className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
 />
 <button
 type="button"
 onClick={addCoverageQuartiers}
 className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-semibold cmm-text-secondary hover:bg-slate-100"
 >
 Ajouter le quartier
 </button>
 </div>
 {coverage.quartiers.length > 0 ? (
 <div className="flex flex-wrap gap-2">
 {coverage.quartiers.map((quartier) => (
 <button
 key={quartier}
 type="button"
 onClick={() =>
 setCoverageQuartiers((current) =>
 current.filter((value) => value !== quartier),
 )
 }
 className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 cmm-text-caption font-semibold text-emerald-800 hover:bg-emerald-100"
 >
 {quartier} ×
 </button>
 ))}
 </div>
 ) : null}
 <p className="cmm-text-caption cmm-text-muted">
 Sélection:{""}
 {coverage.arrondissements.length > 0
 ? `Paris ${coverage.arrondissements.map((item) => `${item === 1 ?"1er" : `${item}e`}`).join(",")}`
 :"aucun arrondissement sélectionné"}
 {coverage.quartiers.length > 0 ? ` · ${coverage.quartiers.join(",")}` :""}
 </p>
 </div>
 </section>

 <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div>
 <h3 className="cmm-text-small font-semibold cmm-text-primary">Disponibilité</h3>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 Ajoute un ou plusieurs créneaux récurrents, puis une précision si nécessaire.
 </p>
 </div>
 <button
 type="button"
 onClick={addAvailabilitySlot}
 className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-semibold cmm-text-secondary hover:bg-slate-100"
 >
 Ajouter un créneau
 </button>
 </div>
 <div className="space-y-3">
 {availabilitySlots.map((slot, index) => (
 <div
 key={`${slot.day}-${index}`}
 className="grid grid-cols-1 gap-2 rounded-lg border border-white bg-white p-3 md:grid-cols-[1fr_120px_120px_auto]"
 >
 <label className="space-y-1">
 <span className="cmm-text-caption font-semibold cmm-text-secondary">Jour</span>
 <select
 value={slot.day}
 onChange={(event) =>
 updateAvailabilitySlot(index,"day", event.target.value)
 }
 className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
 >
 {WEEKDAY_OPTIONS.map((option) => (
 <option key={option.value} value={option.value}>
 {option.label}
 </option>
 ))}
 </select>
 </label>
 <label className="space-y-1">
 <span className="cmm-text-caption font-semibold cmm-text-secondary">Début</span>
 <input
 type="time"
 value={slot.start}
 onChange={(event) => updateAvailabilitySlot(index,"start", event.target.value)}
 className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
 />
 </label>
 <label className="space-y-1">
 <span className="cmm-text-caption font-semibold cmm-text-secondary">Fin</span>
 <input
 type="time"
 value={slot.end}
 onChange={(event) => updateAvailabilitySlot(index,"end", event.target.value)}
 className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
 />
 </label>
 <div className="flex items-end">
 <button
 type="button"
 disabled={availabilitySlots.length === 1}
 onClick={() => removeAvailabilitySlot(index)}
 className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 cmm-text-small font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
 >
 Supprimer
 </button>
 </div>
 </div>
 ))}
 </div>
 <label className="block space-y-1">
 <span className="cmm-text-caption font-semibold cmm-text-secondary">Précisions éventuelles</span>
 <textarea
 value={availabilityNote}
 onChange={(event) => setAvailabilityNote(event.target.value)}
 rows={2}
 placeholder="ex: sur demande, pendant les ateliers, en soirée..."
 className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
 />
 </label>
 </section>

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
 ?"bg-slate-900 text-white"
 :"bg-slate-100 cmm-text-secondary"
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

 <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
 <label className="space-y-1 md:col-span-1">
 <span className="cmm-text-caption font-semibold cmm-text-secondary">Contact</span>
 <input
 required
 value={contactName}
 onChange={(event) => {
 setContactNameTouched(true);
 setContactName(event.target.value);
 }}
 className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
 />
 </label>
 <label className="space-y-1 md:col-span-1">
 <span className="cmm-text-caption font-semibold cmm-text-secondary">Canal de contact</span>
 <input
 required
 value={contactChannel}
 onChange={(event) => setContactChannel(event.target.value)}
 className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
 />
 </label>
 <label className="space-y-1 md:col-span-1">
 <span className="cmm-text-caption font-semibold cmm-text-secondary">Coordonnée joignable</span>
 <input
 required
 value={contactDetails}
 onChange={(event) => {
 setContactDetailsTouched(true);
 setContactDetails(event.target.value);
 }}
 className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
 />
 </label>
 </div>

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
 {isSubmitting ? "Envoi en cours..." : "Soumettre ma demande"}
 </button>
 </form>
 );
}
