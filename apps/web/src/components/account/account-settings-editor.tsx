"use client";

import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { KeyRound, Save, Shield } from "lucide-react";
import Link from "next/link";

import { GreaterParisSelect } from "@/components/account/greater-paris-select";
import { LeaderboardOptInSetting } from "@/components/sections/rubriques/gamification/leaderboard-opt-in-setting";
import { NotificationPreferencesSetting } from "@/components/account/notification-preferences-setting";
import { SitePreferencesControls } from "@/components/ui/site-preferences-controls";
import type { DisplayNameMode } from "@/lib/profiles";
import type { UserLocationPreferences } from "@/lib/user-location-preference";
import type { Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "pending" | "error";

export type AccountSettingsInitialData = {
  firstName: string;
  lastName: string;
  email: string | null;
  imageUrl: string | null;
  handle: string;
  displayNameMode: DisplayNameMode;
  locationPreferences: UserLocationPreferences;
  activityStatus: "active" | "inactive";
};

type Copy = {
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
};

const COPY: Record<Locale, Copy> = {
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
  },
};

function statusMessage(state: SaveState, copy: Copy) {
  if (state === "saving") return copy.saving;
  if (state === "saved") return copy.saved;
  if (state === "pending") return copy.pending;
  if (state === "error") return copy.error;
  return null;
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-sky-200/60 bg-white/85 p-6 shadow-[0_18px_50px_-40px_rgba(14,165,233,0.35)]">
      <div className="mb-5 flex items-start gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 cmm-text-small leading-relaxed text-slate-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function SaveStatus({ state, copy }: { state: SaveState; copy: Copy }) {
  const message = statusMessage(state, copy);
  if (!message) return null;
  return <p className={cn("text-sm font-semibold", state === "error" ? "text-rose-700" : "text-sky-700")} role={state === "error" ? "alert" : "status"}>{message}</p>;
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
  const [modeState, setModeState] = useState<SaveState>("idle");
  const [locationState, setLocationState] = useState<{ residence: SaveState; work: SaveState }>({ residence: "idle", work: "idle" });
  const [activityState, setActivityState] = useState<SaveState>("idle");

  const fullNamePreview = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || "—";

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
      setHandleState("error");
      return;
    }
    setHandleState("saving");
    try {
      const response = await fetch("/api/users/profile/handle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: normalized }),
      });
      const payload = await response.json().catch(() => null) as { error?: string; handle?: string } | null;
      if (!response.ok) {
        if (response.status === 409) throw new Error("conflict");
        throw new Error(payload?.error || "error");
      }
      setHandle(payload?.handle || normalized);
      setHandleState("saved");
    } catch (error) {
      setHandleState("error");
      if (error instanceof Error && error.message === "conflict") setHandleState("error");
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

  return (
    <div className="space-y-6">
      <SectionCard title={copy.identity} description={copy.identityDescription}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold text-slate-800"><span>{copy.firstName}</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-sky-500" /></label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-800"><span>{copy.lastName}</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-sky-500" /></label>
        </div>
        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{copy.email}</p><p className="mt-1 break-words text-sm text-slate-900">{initialData.email || "—"}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{copy.avatar}</p><p className="mt-1 text-sm text-slate-900">{initialData.imageUrl ? "Photo Clerk active" : "—"}</p></div>
          <div className="flex items-center justify-start sm:justify-end"><UserButton /></div>
        </div>
        <p className="mt-3 text-sm text-slate-600">{copy.nativeAccount}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void saveIdentity()} disabled={identityState === "saving"} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60"><Save className="h-4 w-4" aria-hidden="true" />{identityState === "saving" ? copy.saving : copy.save}</button><SaveStatus state={identityState} copy={copy} /></div>
      </SectionCard>

      <SectionCard title={copy.publicIdentity} description={copy.publicIdentityDescription}>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["full_name", "pseudo"] as const).map((option) => <button key={option} type="button" onClick={() => void saveMode(option)} disabled={modeState === "saving"} aria-pressed={displayNameMode === option} className={cn("rounded-2xl border p-4 text-left", displayNameMode === option ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-white hover:border-sky-300")}><span className="block text-sm font-bold text-slate-900">{option === "full_name" ? copy.fullName : copy.pseudo}</span><span className="mt-1 cmm-text-small text-slate-700">{option === "full_name" ? fullNamePreview : handle}</span></button>)}
        </div>
        <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{copy.preview}</p><p className="mt-2 text-sm text-slate-700">{copy.fullName}: <strong>{fullNamePreview}</strong></p><p className="mt-1 text-sm text-slate-700">{copy.pseudo}: <strong>{handle}</strong></p><p className="mt-3 text-sm text-slate-700">{copy.publicPrivacy}</p></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><label className="grid gap-1.5 text-sm font-semibold text-slate-800"><span>{copy.handle}</span><input value={handle} onChange={(event) => setHandle(event.target.value)} autoComplete="nickname" maxLength={30} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-sky-500" /><span className="text-xs font-normal text-slate-500">{copy.handleHelp}</span></label><button type="button" onClick={() => void saveHandle()} disabled={handleState === "saving"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-800 hover:bg-sky-100 disabled:opacity-60"><Save className="h-4 w-4" aria-hidden="true" />{handleState === "saving" ? copy.saving : copy.save}</button></div>
        <div className="mt-3 flex flex-wrap gap-3"><SaveStatus state={modeState} copy={copy} /><SaveStatus state={handleState} copy={{ ...copy, error: handleState === "error" && handle.length > 0 && !/^[a-z0-9_]{3,30}$/.test(handle.trim().toLowerCase()) ? copy.handleInvalid : copy.handleConflict }} /></div>
      </SectionCard>

      <SectionCard title={copy.locations} description={copy.locationsDescription}>
        <div className="grid gap-5 lg:grid-cols-2">
          {(["residence", "work"] as const).map((kind) => <div key={kind} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-bold text-slate-900">{kind === "residence" ? copy.residence : copy.work}</h3><button type="button" onClick={() => setLocations((current) => ({ ...current, [kind]: null }))} className="text-sm font-semibold text-slate-600 underline underline-offset-2">{copy.clearLocation}</button></div><div className="mt-3"><GreaterParisSelect value={locations[kind]} onChange={(value) => setLocations((current) => ({ ...current, [kind]: value }))} appearance="light" compact /></div><div className="mt-3 flex items-center gap-3"><button type="button" onClick={() => void saveLocation(kind)} disabled={locationState[kind] === "saving"} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"><Save className="h-4 w-4" aria-hidden="true" />{locationState[kind] === "saving" ? copy.saving : copy.save}</button><SaveStatus state={locationState[kind]} copy={{ ...copy, saved: copy.locationSaved }} /></div></div>)}
        </div>
      </SectionCard>

      <SectionCard title={copy.preferences} description={copy.preferencesDescription}>
        <SitePreferencesControls surface="light" />
        <p className="mt-4 text-sm text-slate-600">{copy.browserPreference}</p>
        <p className="mt-1 text-sm text-slate-600">{copy.accountPreference}</p>
        <div className="mt-5 rounded-2xl border border-sky-200/70 bg-sky-50/80 p-4"><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold text-slate-900">{copy.activity}</h3><p className="mt-1 cmm-text-small leading-relaxed text-slate-700">{copy.activityDescription}</p></div><button type="button" role="switch" aria-checked={activityStatus === "active"} onClick={() => void saveActivity(activityStatus === "active" ? "inactive" : "active")} disabled={activityState === "saving"} className={cn("min-h-10 rounded-full px-4 py-2 text-sm font-bold", activityStatus === "active" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-800")}>{activityStatus === "active" ? "Actif" : "Inactif"}</button></div><div className="mt-3"><SaveStatus state={activityState} copy={copy} /></div></div>
        <div className="mt-5"><LeaderboardOptInSetting fr={locale === "fr"} /></div>
        <div className="mt-5"><NotificationPreferencesSetting locale={locale} /></div>
      </SectionCard>

      <SectionCard title={copy.security} description={copy.securityDescription}>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><KeyRound className="h-5 w-5 text-sky-700" aria-hidden="true" /><span className="text-sm text-slate-700">{copy.clerkSecurity}</span><UserButton /></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><Link href="/politique-confidentialite" className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-bold text-sky-800 hover:bg-sky-100"><Shield className="mb-2 h-5 w-5" aria-hidden="true" />{copy.privacy}</Link><div className="rounded-2xl border border-rose-200 bg-rose-50 p-4"><p className="font-bold text-slate-900">{copy.deletion}</p><p className="mt-1 text-sm text-slate-700">{copy.deletionDescription}</p><Link href="/contact" className="mt-3 inline-flex rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700">{copy.requestDeletion}</Link></div></div>
      </SectionCard>
    </div>
  );
}
