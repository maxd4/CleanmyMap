"use client";

import { UserButton } from "@clerk/nextjs";
import { KeyRound, Save, Shield } from "lucide-react";
import Link from "next/link";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import { GreaterParisSelect } from "@/components/account/greater-paris-select";
import { CommunityHelperSkillsSetting } from "@/components/account/community-helper-skills-setting";
import { NotificationPreferencesSetting } from "@/components/account/notification-preferences-setting";
import { LeaderboardOptInSetting } from "@/components/sections/rubriques/gamification/leaderboard-opt-in-setting";
import { SitePreferencesControls } from "@/components/ui/site-preferences-controls";
import type { AgeBand } from "@/lib/minor-consent";
import type { DisplayNameMode } from "@/lib/profiles";
import type { Locale } from "@/lib/ui/preferences";
import type { UserLocationPreferences } from "@/lib/user-location-preference";
import { requestCookieConsentPreferences } from "@/lib/storage/ui-state-storage";
import { cn } from "@/lib/utils";

import type {
  AccountSettingsCopy,
  AccountSettingsInitialData,
  HandleError,
  SaveState,
} from "./account-settings-editor";

type LocationKind = "residence" | "work";

type AccountSettingsViewProps = {
  copy: AccountSettingsCopy;
  locale: Locale;
  initialData: AccountSettingsInitialData;
  firstName: string;
  lastName: string;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  identityState: SaveState;
  onSaveIdentity: () => void;
  handle: string;
  setHandle: (value: string) => void;
  displayNameMode: DisplayNameMode;
  modeState: SaveState;
  onSaveMode: (mode: DisplayNameMode) => void;
  handleState: SaveState;
  handleError: HandleError;
  onSaveHandle: () => void;
  locations: UserLocationPreferences;
  setLocations: Dispatch<SetStateAction<UserLocationPreferences>>;
  locationState: Record<LocationKind, SaveState>;
  onSaveLocation: (kind: LocationKind) => void;
  activityStatus: "active" | "inactive";
  activityState: SaveState;
  onSaveActivity: (status: "active" | "inactive") => void;
  ageBand: AgeBand;
  ageBandState: SaveState;
  onSaveAgeBand: (value: AgeBand) => void;
};

function statusMessage(state: SaveState, copy: AccountSettingsCopy) {
  if (state === "saving") return copy.saving;
  if (state === "saved") return copy.saved;
  if (state === "pending") return copy.pending;
  if (state === "error") return copy.error;
  return null;
}

function SectionCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
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

function SaveStatus({ state, copy }: { state: SaveState; copy: AccountSettingsCopy }) {
  const message = statusMessage(state, copy);
  if (!message) return null;
  return <p className={cn("text-sm font-semibold", state === "error" ? "text-rose-700" : "text-sky-700")} role={state === "error" ? "alert" : "status"}>{message}</p>;
}

function IdentitySection({ props }: { props: AccountSettingsViewProps }) {
  const { copy, firstName, lastName, setFirstName, setLastName, initialData, identityState, onSaveIdentity } = props;
  return (
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
      <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={onSaveIdentity} disabled={identityState === "saving"} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60"><Save className="h-4 w-4" aria-hidden="true" />{identityState === "saving" ? copy.saving : copy.save}</button><SaveStatus state={identityState} copy={copy} /></div>
    </SectionCard>
  );
}

function PublicIdentitySection({ props }: { props: AccountSettingsViewProps }) {
  const { copy, firstName, lastName, handle, setHandle, displayNameMode, modeState, onSaveMode, handleState, handleError, onSaveHandle } = props;
  const fullNamePreview = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || "—";
  const handleCopy = { ...copy, saved: copy.handleSaved, error: handleError === "conflict" ? copy.handleConflict : handleError === "validation" ? copy.handleInvalid : copy.handleUnavailable };
  return (
    <SectionCard title={copy.publicIdentity} description={copy.publicIdentityDescription}>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["full_name", "pseudo"] as const).map((option) => <button key={option} type="button" onClick={() => onSaveMode(option)} disabled={modeState === "saving"} aria-pressed={displayNameMode === option} className={cn("rounded-2xl border p-4 text-left", displayNameMode === option ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-white hover:border-sky-300")}><span className="block text-sm font-bold text-slate-900">{option === "full_name" ? copy.fullName : copy.pseudo}</span><span className="mt-1 cmm-text-small text-slate-700">{option === "full_name" ? fullNamePreview : handle}</span></button>)}
      </div>
      <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{copy.preview}</p><p className="mt-2 text-sm text-slate-700">{copy.fullName}: <strong>{fullNamePreview}</strong></p><p className="mt-1 text-sm text-slate-700">{copy.pseudo}: <strong>{handle}</strong></p><p className="mt-3 text-sm text-slate-700">{copy.publicPrivacy}</p></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><label className="grid gap-1.5 text-sm font-semibold text-slate-800"><span>{copy.handle}</span><input value={handle} onChange={(event) => setHandle(event.target.value)} autoComplete="nickname" maxLength={30} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-sky-500" /><span className="text-xs font-normal text-slate-500">{copy.handleHelp}</span></label><button type="button" onClick={onSaveHandle} disabled={handleState === "saving"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-800 hover:bg-sky-100 disabled:opacity-60"><Save className="h-4 w-4" aria-hidden="true" />{handleState === "saving" ? copy.saving : copy.save}</button></div>
      <div className="mt-3 flex flex-wrap gap-3"><SaveStatus state={modeState} copy={copy} /><SaveStatus state={handleState} copy={handleCopy} /></div>
    </SectionCard>
  );
}

function LocationsSection({ props }: { props: AccountSettingsViewProps }) {
  const { copy, locations, setLocations, locationState, onSaveLocation } = props;
  return <SectionCard title={copy.locations} description={copy.locationsDescription}><div className="grid gap-5 lg:grid-cols-2">{(["residence", "work"] as const).map((kind) => <div key={kind} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-bold text-slate-900">{kind === "residence" ? copy.residence : copy.work}</h3><button type="button" onClick={() => setLocations((current) => ({ ...current, [kind]: null }))} className="text-sm font-semibold text-slate-600 underline underline-offset-2">{copy.clearLocation}</button></div><div className="mt-3"><GreaterParisSelect value={locations[kind]} onChange={(value) => setLocations((current) => ({ ...current, [kind]: value }))} appearance="light" compact /></div><div className="mt-3 flex items-center gap-3"><button type="button" onClick={() => onSaveLocation(kind)} disabled={locationState[kind] === "saving"} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"><Save className="h-4 w-4" aria-hidden="true" />{locationState[kind] === "saving" ? copy.saving : copy.save}</button><SaveStatus state={locationState[kind]} copy={{ ...copy, saved: copy.locationSaved }} /></div></div>)}</div></SectionCard>;
}

function PreferencesSection({ props }: { props: AccountSettingsViewProps }) {
  const { copy, locale, activityStatus, activityState, onSaveActivity, ageBand, ageBandState, onSaveAgeBand } = props;
  return (
    <SectionCard title={copy.preferences} description={copy.preferencesDescription}>
      <SitePreferencesControls surface="light" />
      <p className="mt-4 text-sm text-slate-600">{copy.browserPreference}</p><p className="mt-1 text-sm text-slate-600">{copy.accountPreference}</p>
      <div className="mt-5 rounded-2xl border border-sky-200/70 bg-sky-50/80 p-4"><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold text-slate-900">{copy.activity}</h3><p className="mt-1 cmm-text-small leading-relaxed text-slate-700">{copy.activityDescription}</p></div><button type="button" role="switch" aria-checked={activityStatus === "active"} onClick={() => onSaveActivity(activityStatus === "active" ? "inactive" : "active")} disabled={activityState === "saving"} className={cn("min-h-10 rounded-full px-4 py-2 text-sm font-bold", activityStatus === "active" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-800")}>{activityStatus === "active" ? "Actif" : "Inactif"}</button></div><div className="mt-3"><SaveStatus state={activityState} copy={copy} /></div></div>
      <div className="mt-5"><LeaderboardOptInSetting fr={locale === "fr"} /></div>
      <div className="mt-5 rounded-2xl border border-sky-200/70 bg-sky-50/80 p-4"><h3 className="font-bold text-slate-900">{copy.ageBandTitle}</h3><p className="mt-1 cmm-text-small leading-relaxed text-slate-700">{copy.ageBandDescription}</p><div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={copy.ageBandTitle}>{([["under_15", copy.ageUnder15], ["15_or_over", copy.age15OrOver], ["unknown", copy.ageUnknown]] as const).map(([value, label]) => <label key={value} className="flex items-start gap-2 rounded-xl border border-sky-200 bg-white p-3 text-sm text-slate-800"><input type="radio" name="settings-age-band" value={value} checked={ageBand === value} onChange={() => onSaveAgeBand(value)} disabled={ageBandState === "saving"} /><span>{label}</span></label>)}</div><div className="mt-3 flex flex-wrap items-center gap-3"><SaveStatus state={ageBandState} copy={{ ...copy, saved: copy.ageSaved, error: copy.ageError }} /><button type="button" onClick={requestCookieConsentPreferences} className="text-sm font-bold text-sky-800 underline underline-offset-2">{copy.manageAnalytics}</button></div></div>
      <div className="mt-5"><NotificationPreferencesSetting locale={locale} /></div>
      <CommunityHelperSkillsSetting locale={locale} />
    </SectionCard>
  );
}

function SecuritySection({ copy }: { copy: AccountSettingsCopy }) {
  return <SectionCard title={copy.security} description={copy.securityDescription}><div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><KeyRound className="h-5 w-5 text-sky-700" aria-hidden="true" /><span className="text-sm text-slate-700">{copy.clerkSecurity}</span><UserButton /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Link href="/politique-confidentialite" className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-bold text-sky-800 hover:bg-sky-100"><Shield className="mb-2 h-5 w-5" aria-hidden="true" />{copy.privacy}</Link><div className="rounded-2xl border border-rose-200 bg-rose-50 p-4"><p className="font-bold text-slate-900">{copy.deletion}</p><p className="mt-1 text-sm text-slate-700">{copy.deletionDescription}</p><Link href="/contact" className="mt-3 inline-flex rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700">{copy.requestDeletion}</Link></div></div></SectionCard>;
}

export function AccountSettingsView(props: AccountSettingsViewProps) {
  return <div className="space-y-6"><IdentitySection props={props} /><PublicIdentitySection props={props} /><LocationsSection props={props} /><PreferencesSection props={props} /><SecuritySection copy={props.copy} /></div>;
}
