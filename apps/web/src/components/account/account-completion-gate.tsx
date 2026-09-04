"use client";

import type { ReactNode } from "react";
import { AccountCompletionPage } from "@/components/account/account-completion-modal";
import type { AccountCompletionGateState } from "@/lib/auth/account-completion-gate";

type AccountCompletionGateProps = {
  state: AccountCompletionGateState | null;
  children: ReactNode;
};

export function AccountCompletionGate({
  state,
  children,
}: AccountCompletionGateProps) {
  if (!state?.requirement.requiresSetup) {
    return children;
  }

  return (
    <AccountCompletionPage
      reason={state.requirement.reason}
      initialRole={state.role === "anonymous" ? undefined : state.role}
      initialProfile={state.currentProfile}
      clerkReachable={state.clerkReachable}
      isLocalHost={state.isLocalHost}
      initialResidence={state.initialResidence}
      initialWork={state.initialWork}
      initialArrondissement={state.initialArrondissement}
      initialLocationType={state.initialLocationType}
      submitMode="refresh"
    />
  );
}
