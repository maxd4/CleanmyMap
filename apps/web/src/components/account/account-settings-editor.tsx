"use client";

import { useState } from "react";

import type { DisplayNameMode } from "@/lib/profiles";
import type { UserLocationPreferences } from "@/lib/user-location-preference";
import type { Locale } from "@/lib/ui/preferences";
import type { AgeBand } from "@/lib/minor-consent";
import { AccountSettingsView } from "./account-settings-editor.view";

export type SaveState = "idle" | "saving" | "saved" | "pending" | "error";
export type HandleError = "validation" | "conflict" | "unavailable" | null;

export type AccountSettingsInitialData = {
  firstName: string;
  lastName: string;
  email: string | null;
  imageUrl: string | null;
  handle: string;
  displayNameMode: DisplayNameMode;
  locationPreferences: UserLocationPreferences;
  activityStatus: "active" | "inactive";
  ageBand: AgeBand;
};

export type AccountSettingsCopy = {
  identity: string;
  identityDescription: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  nativeAccount: string;
  save: string;
  saving: string;
  saved: string;
  pending: string;
  error: string;
  publicIdentity: string;
  publicIdentityDescription: string;
  fullName: string;
  pseudo: string;
  preview: string;
  handle: string;
  handleHelp: string;
  handleInvalid: string;
  handleUnavailable: string;
  handleSaved: string;
  handleConflict: string;
  publicPrivacy: string;
  locations: string;
  locationsDescription: string;
  residence: string;
  work: string;
  clearLocation: string;
  locationSaved: string;
  preferences: string;
  preferencesDescription: string;
  browserPreference: string;
  accountPreference: string;
  activity: string;
  activityDescription: string;
  security: string;
  securityDescription: string;
  clerkSecurity: string;
  privacy: string;
  deletion: string;
  deletionDescription: string;
  requestDeletion: string;
  noLocation: string;
  ageBandTitle: string;
  ageBandDescription: string;
  ageUnder15: string;
  age15OrOver: string;
  ageUnknown: string;
  ageSaved: string;
  ageError: string;
  manageAnalytics: string;
};

const COPY: Record<Locale, AccountSettingsCopy> = {
  fr: {
    identity: "Informations personnelles",
    identityDescription: "Ces informations viennent de Clerk et servent à votre identité de compte.",
    firstName: "Prénom",
    lastName: "Nom",
    email: "Adresse email",
    avatar: "Photo de profil",
    nativeAccount: "Email, photo et méthodes de connexion se gèrent dans l’interface sécurisée Clerk.",
    save: "Enregistrer les informations",
    saving: "Enregistrement…",
    saved: "Informations enregistrées.",
    pending: "Enregistré dans Clerk ; synchronisation du profil en attente.",
    error: "Impossible d’enregistrer ces informations.",
    publicIdentity: "Identité publique",
    publicIdentityDescription: "Choisissez ce qui est affiché dans les profils, discussions, cartes d’action et classements.",
    fullName: "Nom complet",
    pseudo: "Pseudonyme",
    preview: "Aperçu réellement utilisé",
    handle: "Handle public",
    handleHelp: "3 à 30 caractères : lettres minuscules, chiffres et underscores.",
    handleInvalid: "Le handle doit contenir 3 à 30 caractères valides.",
    handleUnavailable: "Le handle n’a pas pu être enregistré. Réessayez lorsque le service sera disponible.",
    handleSaved: "Handle enregistré.",
    handleConflict: "Ce handle est déjà utilisé par un autre membre.",
    publicPrivacy: "Un pseudonyme masque le nom affiché, mais ne rend pas automatiquement vos contributions anonymes.",
    locations: "Localisation",
    locationsDescription: "Résidence et travail sont indépendants. Vous pouvez laisser l’un ou les deux vides.",
    residence: "Ville de résidence",
    work: "Ville de travail",
    clearLocation: "Aucune zone",
    locationSaved: "Localisation enregistrée.",
    preferences: "Préférences",
    preferencesDescription: "Les choix d’affichage sont conservés selon leur propriétaire indiqué ci-dessous.",
    browserPreference: "Le thème et certains choix d’affichage peuvent dépendre de ce navigateur.",
    accountPreference: "Le mode de nom, les notifications et le consentement au classement sont liés à votre compte.",
    activity: "Disponible pour l’activité",
    activityDescription: "Ce statut indique votre disponibilité dans le produit ; il ne suspend pas votre authentification.",
    security: "Sécurité et données",
    securityDescription: "Utilisez les contrôles natifs Clerk pour votre session et vos méthodes de connexion.",
    clerkSecurity: "Ouvrir les options de compte Clerk",
    privacy: "Politique de confidentialité",
    deletion: "Demande de suppression du compte",
    deletionDescription: "La suppression est une demande traitée, pas une suppression immédiate.",
    requestDeletion: "Faire une demande RGPD",
    noLocation: "Aucune localisation enregistrée.",
    ageBandTitle: "Tranche d’âge pour les traitements facultatifs",
    ageBandDescription: "Une déclaration minimale suffit. Aucune date de naissance ni pièce d’identité n’est demandée. Le statut inconnu conserve l’accès au site mais désactive les traitements facultatifs concernés.",
    ageUnder15: "Moins de 15 ans",
    age15OrOver: "15 ans ou plus",
    ageUnknown: "Je ne souhaite pas préciser",
    ageSaved: "Tranche d’âge enregistrée.",
    ageError: "Impossible d’enregistrer cette tranche d’âge.",
    manageAnalytics: "Gérer le consentement analytics",
  },
  en: {
    identity: "Personal information",
    identityDescription: "These details come from Clerk and define your account identity.",
    firstName: "First name",
    lastName: "Last name",
    email: "Email address",
    avatar: "Profile photo",
    nativeAccount: "Email, photo and sign-in methods are managed in Clerk’s secure account interface.",
    save: "Save personal information",
    saving: "Saving…",
    saved: "Information saved.",
    pending: "Saved in Clerk; profile synchronization is pending.",
    error: "Unable to save this information.",
    publicIdentity: "Public identity",
    publicIdentityDescription: "Choose what appears in profiles, discussions, action maps and leaderboards.",
    fullName: "Full name",
    pseudo: "Pseudonym",
    preview: "Preview actually used",
    handle: "Public handle",
    handleHelp: "3 to 30 characters: lowercase letters, numbers and underscores.",
    handleInvalid: "The handle must contain 3 to 30 valid characters.",
    handleUnavailable: "The handle could not be saved. Try again when the service is available.",
    handleSaved: "Handle saved.",
    handleConflict: "This handle is already used by another member.",
    publicPrivacy: "A pseudonym hides the displayed name, but does not automatically make your contributions anonymous.",
    locations: "Location",
    locationsDescription: "Residence and work are independent. You may leave either or both empty.",
    residence: "Residence city",
    work: "Work city",
    clearLocation: "No area",
    locationSaved: "Location saved.",
    preferences: "Preferences",
    preferencesDescription: "Display choices are kept by the owner shown below.",
    browserPreference: "Theme and some display choices may be specific to this browser.",
    accountPreference: "Name mode, notifications and leaderboard consent belong to your account.",
    activity: "Available for activity",
    activityDescription: "This status describes product availability; it does not suspend authentication.",
    security: "Security and data",
    securityDescription: "Use Clerk’s native controls for your session and sign-in methods.",
    clerkSecurity: "Open Clerk account options",
    privacy: "Privacy policy",
    deletion: "Account deletion request",
    deletionDescription: "Deletion is a request to be processed, not an immediate deletion.",
    requestDeletion: "Make a GDPR request",
    noLocation: "No location saved.",
    ageBandTitle: "Age band for optional treatments",
    ageBandDescription: "A minimal declaration is enough. No exact date of birth or identity document is requested. Unknown status keeps site access but disables the affected optional treatments.",
    ageUnder15: "Under 15",
    age15OrOver: "15 or over",
    ageUnknown: "I prefer not to say",
    ageSaved: "Age band saved.",
    ageError: "Unable to save this age band.",
    manageAnalytics: "Manage analytics consent",
  },
};

async function persistAgeBand(
  nextAgeBand: AgeBand,
  currentState: SaveState,
  setAgeBand: (value: AgeBand) => void,
  setAgeBandState: (value: SaveState) => void,
) {
  if (currentState === "saving") return;
  setAgeBandState("saving");
  try {
    const response = await fetch("/api/account/age-band", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ageBand: nextAgeBand }),
    });
    if (!response.ok) throw new Error("age band update failed");
    const payload = await response.json().catch(() => null) as { ageBand?: AgeBand } | null;
    setAgeBand(payload?.ageBand ?? nextAgeBand);
    setAgeBandState("saved");
  } catch {
    setAgeBandState("error");
  }
}

export function AccountSettingsEditor({ locale, initialData }: { locale: Locale; initialData: AccountSettingsInitialData }) {
  const copy = COPY[locale];
  const [firstName, setFirstName] = useState(initialData.firstName);
  const [lastName, setLastName] = useState(initialData.lastName);
  const [handle, setHandle] = useState(initialData.handle);
  const [displayNameMode, setDisplayNameMode] = useState(initialData.displayNameMode);
  const [locations, setLocations] = useState(initialData.locationPreferences);
  const [activityStatus, setActivityStatus] = useState(initialData.activityStatus);
  const [identityState, setIdentityState] = useState<SaveState>("idle");
  const [handleState, setHandleState] = useState<SaveState>("idle");
  const [handleError, setHandleError] = useState<HandleError>(null);
  const [modeState, setModeState] = useState<SaveState>("idle");
  const [locationState, setLocationState] = useState<{ residence: SaveState; work: SaveState }>({ residence: "idle", work: "idle" });
  const [activityState, setActivityState] = useState<SaveState>("idle");
  const [ageBand, setAgeBand] = useState<AgeBand>(initialData.ageBand);
  const [ageBandState, setAgeBandState] = useState<SaveState>("idle");

  async function saveIdentity() {
    if (!firstName.trim() || !lastName.trim() || identityState === "saving") {
      setIdentityState("error");
      return;
    }
    setIdentityState("saving");
    try {
      const response = await fetch("/api/account/identity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      });
      const payload = await response.json().catch(() => null) as { status?: string } | null;
      if (!response.ok) throw new Error(payload?.status === "clerk_updated_supabase_sync_pending" ? "pending" : "error");
      setIdentityState("saved");
    } catch (error) {
      setIdentityState(error instanceof Error && error.message === "pending" ? "pending" : "error");
    }
  }

  async function saveHandle() {
    const normalized = handle.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(normalized) || handleState === "saving") {
      setHandleError("validation");
      setHandleState("error");
      return;
    }
    setHandleError(null);
    setHandleState("saving");
    try {
      const response = await fetch("/api/users/profile/handle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: normalized }),
      });
      const payload = await response.json().catch(() => null) as { error?: string; handle?: string } | null;
      if (!response.ok) {
        setHandleError(response.status === 409
          ? "conflict"
          : response.status === 400 || response.status === 422
            ? "validation"
            : "unavailable");
        setHandleState("error");
        return;
      }
      setHandle(payload?.handle || normalized);
      setHandleError(null);
      setHandleState("saved");
    } catch {
      setHandleError("unavailable");
      setHandleState("error");
    }
  }

  async function saveMode(nextMode: DisplayNameMode) {
    if (nextMode === displayNameMode || modeState === "saving") return;
    setModeState("saving");
    try {
      const response = await fetch("/api/users/profile/display-name-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayNameMode: nextMode }),
      });
      const payload = await response.json().catch(() => null) as { status?: string } | null;
      if (!response.ok) throw new Error(payload?.status === "clerk_updated_supabase_sync_pending" ? "pending" : "error");
      setDisplayNameMode(nextMode);
      setModeState("saved");
    } catch (error) {
      setModeState(error instanceof Error && error.message === "pending" ? "pending" : "error");
    }
  }

  async function saveLocation(kind: "residence" | "work") {
    setLocationState((current) => ({ ...current, [kind]: "saving" }));
    try {
      const response = await fetch("/api/account/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [kind]: locations[kind] }),
      });
      const payload = await response.json().catch(() => null) as { locationPreferences?: UserLocationPreferences; status?: string } | null;
      if (!response.ok) throw new Error(payload?.status === "clerk_updated_supabase_sync_pending" ? "pending" : "error");
      if (payload?.locationPreferences) setLocations(payload.locationPreferences);
      setLocationState((current) => ({ ...current, [kind]: "saved" }));
    } catch (error) {
      setLocationState((current) => ({ ...current, [kind]: error instanceof Error && error.message === "pending" ? "pending" : "error" }));
    }
  }

  async function saveActivity(nextStatus: "active" | "inactive") {
    setActivityState("saving");
    try {
      const response = await fetch("/api/account/activity-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityStatus: nextStatus }),
      });
      if (!response.ok) throw new Error("error");
      setActivityStatus(nextStatus);
      setActivityState("saved");
    } catch {
      setActivityState("error");
    }
  }

  async function saveAgeBand(nextAgeBand: AgeBand) {
    await persistAgeBand(nextAgeBand, ageBandState, setAgeBand, setAgeBandState);
  }

  return <AccountSettingsView
    copy={copy}
    locale={locale}
    initialData={initialData}
    firstName={firstName}
    lastName={lastName}
    setFirstName={setFirstName}
    setLastName={setLastName}
    identityState={identityState}
    onSaveIdentity={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ saveIdentity(); }}
    handle={handle}
    setHandle={setHandle}
    displayNameMode={displayNameMode}
    modeState={modeState}
    onSaveMode={(mode) => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ saveMode(mode); }}
    handleState={handleState}
    handleError={handleError}
    onSaveHandle={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ saveHandle(); }}
    locations={locations}
    setLocations={setLocations}
    locationState={locationState}
    onSaveLocation={(kind) => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ saveLocation(kind); }}
    activityStatus={activityStatus}
    activityState={activityState}
    onSaveActivity={(status) => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ saveActivity(status); }}
    ageBand={ageBand}
    ageBandState={ageBandState}
    onSaveAgeBand={(value) => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ saveAgeBand(value); }}
  />;
}
