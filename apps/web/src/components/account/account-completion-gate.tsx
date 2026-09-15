"use client";

import type { ReactNode } from "react";
import { AccountCompletionPage } from "@/components/account/account-completion-modal";
import type { AccountCompletionGateState } from "@/lib/auth/account-completion-gate";

type AccountCompletionGateProps = {
  state: AccountCompletionGateState | null;
  children: ReactNode;
  mode?: "reminder" | "required";
};

export function AccountCompletionGate({
  state,
  children,
  mode = "reminder",
}: AccountCompletionGateProps) {
  if (!state?.requirement.requiresSetup) {
    return children;
  }

  if (mode === "required") {
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

  return (
    <div className="space-y-4">
      <aside
        role="status"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        data-testid="account-completion-reminder"
      >
        <p className="font-semibold">Configuration du compte à poursuivre</p>
        <p className="mt-1 leading-6">
          Vous pouvez utiliser cette page sans compléter maintenant votre pseudo,
          votre identité ou votre territoire.
        </p>
        <a
          className="mt-2 inline-flex font-semibold underline underline-offset-2"
          href="/onboarding"
        >
          Reprendre la configuration
        </a>
      </aside>
      {children}
    </div>
  );
}
