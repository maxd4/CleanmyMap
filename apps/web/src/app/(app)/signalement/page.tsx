import { TrashSpotterOwnerLoop } from "@/components/actions/trash-spotter-owner-loop";
import { PageHeader } from "@/components/ui/page-header";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { MapPin, Zap } from "lucide-react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";

type SignalementPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export function resolveSignalementCoordinate(
  value: string | string[] | undefined,
  min: number,
  max: number,
): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || raw.trim() === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

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
          <div className="space-y-12 pt-8">
            <PageHeader
              family={pageFamily}
              title="Mettre à jour l’état du lieu"
              subtitle="Décrivez l’état observé : pollution constatée ou lieu constaté propre. Votre observation alimente la cartographie citoyenne."
            />

            {/* Certification Status */}
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-3 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-6 py-2.5 backdrop-blur-md">
                <MapPin size={14} className="text-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
                  Position Certifiée
                </span>
              </div>
            </div>

            <FamilyRubriqueCard
              withTopBar={true}
              topBarContent={
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-emerald-400" />
                  <span>Analyse Vision IA Active</span>
                </div>
              }
              className="p-1 sm:p-12"
            >
            <TrashSpotterOwnerLoop
              initialLocation={initialLocation}
              isAuthenticated={Boolean(userId)}
              signInHref={`/sign-in?redirect_url=${encodeURIComponent("/signalement")}`}
              signUpHref={`/sign-up?redirect_url=${encodeURIComponent("/signalement")}`}
            />
            </FamilyRubriqueCard>
          </div>
        </SectionShell>
      </AccountCompletionGate>
  );
}
