import type { Metadata } from "next";
import { AccountEvolutionPanel, type AccountEvolutionRequest } from "@/components/account/account-evolution-panel";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { listPromotionRequestsForUser } from "@/lib/admin/promotion-requests-store";

export const metadata: Metadata = {
  title: "Évolution du compte - CleanMyMap",
  description: "Consultez votre niveau de compte et gérez vos demandes d’évolution.",
  robots: { index: false, follow: false },
};

function toAccountEvolutionRequest(
  record: Awaited<ReturnType<typeof listPromotionRequestsForUser>>[number],
): AccountEvolutionRequest {
  return {
    createdAt: record.createdAt,
    requestedRole: record.requestedRole,
    status: record.status,
    reviewedAt: record.reviewedAt,
  };
}

export default async function AccountEvolutionPage() {
  const session = await getSafeAuthSession();
  const identity = session.userId
    ? await getCurrentUserIdentity({ userId: session.userId }).catch(() => null)
    : null;

  const initialRecords = identity
    ? await listPromotionRequestsForUser(identity.userId, 50).catch(() => null)
    : null;
  const initialRequest = initialRecords?.[0]
    ? toAccountEvolutionRequest(initialRecords[0])
    : null;

  return (
    <SectionShell
      id="account-evolution"
      title="Évolution du compte"
      subtitle="Comprenez votre niveau, votre rôle utilisé et l’état de votre demande."
    >
      <ClerkRequiredGate
        isAuthenticated={Boolean(identity)}
        authUnavailable={session.state === "unavailable" || (Boolean(session.userId) && !identity)}
      >
        {identity ? (
          <AccountEvolutionPanel
            currentRole={identity.role}
            activeRole={identity.activeRole}
            initialRequest={initialRequest}
            initialStatusAvailable={initialRecords !== null}
          />
        ) : null}
      </ClerkRequiredGate>
    </SectionShell>
  );
}
