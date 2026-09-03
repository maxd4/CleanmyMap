"use client";

import { CmmDialog } from "@/components/ui/cmm-dialog";
import type { AppProfile } from "@/lib/profiles";
import { AccountSetupForm } from "@/components/account/account-setup-form";

type AccountSetupReason = "initial_setup" | "schema_update" | null;

type AccountCompletionModalProps = {
  reason: AccountSetupReason;
  initialProfile: AppProfile;
  clerkReachable: boolean;
  isLocalHost: boolean;
  initialArrondissement?: number | null;
  initialLocationType?: "residence" | "work" | null;
};

export function AccountCompletionModal({
  initialProfile,
  clerkReachable,
  isLocalHost,
  initialArrondissement = null,
  initialLocationType = null,
}: AccountCompletionModalProps) {
  return (
    <CmmDialog
      open
      dismissible={false}
      closeOnEscape={false}
      closeOnBackdrop={false}
      size="xl"
      ariaLabelledBy="account-completion-modal-title"
      ariaDescribedBy="account-completion-modal-description"
      panelClassName="flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.42)] sm:rounded-3xl"
    >
      <AccountSetupForm
        submitMode="refresh"
        initialProfile={initialProfile}
        clerkReachable={clerkReachable}
        isLocalHost={isLocalHost}
        initialArrondissement={initialArrondissement}
        initialLocationType={initialLocationType}
      />
    </CmmDialog>
  );
}
