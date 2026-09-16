"use client";

import type { Role } from "@/lib/domain-language";
import { AccountSetupForm } from "@/components/account/account-setup-form";
import type { AccountSetupFormProps } from "@/components/account/use-account-setup-controller";

type AccountSetupReason = "initial_setup" | "schema_update" | null;

export type AccountCompletionPageProps = Omit<AccountSetupFormProps, "initialRole"> & {
  reason?: AccountSetupReason;
  initialRole?: Role;
};

/** Full-page onboarding surface used by both /onboarding and the blocking gate. */
export function AccountCompletionPage({
  nextPath,
  initialRole,
  initialProfile,
  clerkReachable,
  initialDisplayNameMode,
  initialResidence,
  initialWork,
  initialArrondissement,
  initialLocationType,
  submitMode = "navigate",
}: AccountCompletionPageProps) {
  return (
    <div className="cmm-account-setup-surface relative isolate min-h-0 w-full min-w-0 overflow-x-hidden bg-[linear-gradient(135deg,#eef6f2_0%,#f1f4f8_52%,#f5f2fb_100%)]">
      <div className="cmm-account-setup-frame cmm-page-width flex min-h-0 flex-col">
        <AccountSetupForm
          nextPath={nextPath}
          submitMode={submitMode}
          initialRole={initialRole}
          initialProfile={initialProfile}
          clerkReachable={clerkReachable}
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
