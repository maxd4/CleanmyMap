"use client";

import type { AppProfile, DisplayNameMode } from "@/lib/profiles";
import type { Role } from "@/lib/domain-language";
import type { TerritoryLocationSelection } from "@/lib/user-location-preference";
import { AccountSetupForm } from "@/components/account/account-setup-form";

type AccountSetupReason = "initial_setup" | "schema_update" | null;

export type AccountCompletionPageProps = {
  reason?: AccountSetupReason;
  nextPath?: string;
  initialRole?: Role;
  initialProfile: AppProfile;
  clerkReachable: boolean;
  isLocalHost: boolean;
  initialDisplayNameMode?: DisplayNameMode | null;
  initialResidence?: TerritoryLocationSelection | null;
  initialWork?: TerritoryLocationSelection | null;
  initialArrondissement?: number | null;
  initialLocationType?: "residence" | "work" | null;
  submitMode?: "navigate" | "refresh";
};

/** Full-page onboarding surface used by both /onboarding and the blocking gate. */
export function AccountCompletionPage({
  nextPath,
  initialRole,
  initialProfile,
  clerkReachable,
  isLocalHost,
  initialDisplayNameMode,
  initialResidence,
  initialWork,
  initialArrondissement,
  initialLocationType,
  submitMode = "navigate",
}: AccountCompletionPageProps) {
  return (
    <div className="relative isolate min-h-full w-full min-w-0 overflow-x-hidden bg-[linear-gradient(135deg,#eef6f2_0%,#f1f4f8_52%,#f5f2fb_100%)] px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <div className="cmm-page-width flex flex-col">
        <AccountSetupForm
          nextPath={nextPath}
          submitMode={submitMode}
          initialRole={initialRole}
          initialProfile={initialProfile}
          clerkReachable={clerkReachable}
          isLocalHost={isLocalHost}
          initialDisplayNameMode={initialDisplayNameMode}
          initialResidence={initialResidence}
          initialWork={initialWork}
          initialArrondissement={initialArrondissement}
          initialLocationType={initialLocationType}
        />
      </div>
    </div>
  );
}

/** Compatibility export for older callers; it no longer renders a dialog. */
export function AccountCompletionModal(props: AccountCompletionPageProps) {
  return <AccountCompletionPage {...props} />;
}
