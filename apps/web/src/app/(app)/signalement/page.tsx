import { TrashSpotterOwnerLoop } from "@/components/actions/trash-spotter-owner-loop";
import { PageHeader } from "@/components/ui/page-header";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { resolveSignalementCoordinate } from "./signalement-page.utils";

type SignalementPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignalementPage({
  searchParams,
}: SignalementPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const latitude = resolveSignalementCoordinate(params?.lat, -90, 90);
  const longitude = resolveSignalementCoordinate(params?.lng, -180, 180);
  const initialLocation =
    latitude !== null && longitude !== null ? { lat: latitude, lng: longitude } : null;
  const { userId, clerkReachable } = await getSafeAuthSession();
  const pageFamily = resolvePageFamily("/signalement");
  const accountCompletion = userId
    ? await loadAccountCompletionGateState({ userId, clerkReachable }).catch(() => null)
    : null;

  return (
      <AccountCompletionGate state={accountCompletion}>
        <SectionShell
          id="signalement"
          hideHeader
        >
          <div className="space-y-8 pt-8">
            <PageHeader
              family={pageFamily}
              title="Mettre à jour l’état du lieu"
              subtitle="Décrivez l’état observé : pollution constatée ou lieu constaté propre. Votre observation alimente la cartographie citoyenne."
            />

            <FamilyRubriqueCard
              withTopBar={false}
              withHover={false}
              className="!border-emerald-200/80 !bg-white/95 !text-stone-950 !shadow-[0_22px_60px_-38px_rgba(16,185,129,0.35)] p-1 sm:p-8"
            >
            <TrashSpotterOwnerLoop
              initialLocation={initialLocation}
              isAuthenticated={Boolean(userId)}
              signInHref={buildSignInRedirectHref("/signalement")}
              signUpHref={`/sign-up?redirect_url=${encodeURIComponent("/signalement")}`}
            />
            </FamilyRubriqueCard>
          </div>
        </SectionShell>
      </AccountCompletionGate>
  );
}
