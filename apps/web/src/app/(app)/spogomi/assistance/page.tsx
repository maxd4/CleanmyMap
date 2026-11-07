import type { Metadata } from "next";
import { SpogomiIdentityAssistanceInvitation } from "@/components/spogomi/spogomi-identity-assistance-invitation";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";

type Props = { searchParams: Promise<{ eventId?: string; token?: string }> };

export const metadata: Metadata = {
  title: "Assistance de rattachement SPOGOMI",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function SpogomiIdentityAssistancePage({ searchParams }: Props) {
  const params = await searchParams;
  const eventId = params.eventId?.trim() ?? "";
  const token = params.token?.trim() ?? "";
  if (!eventId || !token) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50 px-4 py-10">
        <div className="cmm-page-width">
          <CmmCard tone="slate" variant="glass" className="mx-auto max-w-2xl space-y-4 p-6">
            <h1 className="text-2xl font-black text-slate-950">Assistance de rattachement SPOGOMI</h1>
            <p className="cmm-text-body text-slate-900">
              Cette assistance est disponible uniquement depuis le lien privé et contextualisé remis par l’organisation. Il doit contenir l’événement et l’invitation ; aucune demande ne peut être envoyée depuis cette adresse générale.
            </p>
            <CmmButton href="/spogomi#spogomi-assistance" tone="primary">Voir comment obtenir une invitation</CmmButton>
          </CmmCard>
        </div>
      </main>
    );
  }
  return <SpogomiIdentityAssistanceInvitation eventId={eventId} token={token} signInHref={`/sign-in?redirect_url=${encodeURIComponent(`/spogomi/assistance?eventId=${eventId}&token=${token}`)}`} />;
}
