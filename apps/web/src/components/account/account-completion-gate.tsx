"use client";

import type { ReactNode } from "react";
import { AccountCompletionModal } from "@/components/account/account-completion-modal";
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
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none select-none blur-sm opacity-55"
      >
        {children}
      </div>

      <AccountCompletionModal
        reason={state.requirement.reason}
        initialProfile={state.currentProfile}
        clerkReachable={state.clerkReachable}
        isLocalHost={state.isLocalHost}
        initialArrondissement={state.initialArrondissement}
        initialLocationType={state.initialLocationType}
      />
    </div>
  );
}
