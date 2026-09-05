"use client";

import type { AppProfile } from "@/lib/profiles";
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
  initialResidence,
  initialWork,
  initialArrondissement,
  initialLocationType,
  submitMode = "navigate",
}: AccountCompletionPageProps) {
  return (
    <div className="relative isolate min-h-full w-full min-w-0 overflow-x-hidden bg-[radial-gradient(circle_at_88%_12%,rgba(124,58,237,0.34),transparent_30%),radial-gradient(circle_at_6%_92%,rgba(6,78,59,0.32),transparent_34%),radial-gradient(circle_at_18%_24%,rgba(167,243,208,0.98),transparent_44%),linear-gradient(135deg,#d1fae5_0%,#a7f3d0_42%,#6ee7b7_72%,#c4b5fd_130%)] px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col">
        <AccountSetupForm
          nextPath={nextPath}
          submitMode={submitMode}
          initialRole={initialRole}
          initialProfile={initialProfile}
          clerkReachable={clerkReachable}
          isLocalHost={isLocalHost}
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
