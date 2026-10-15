import type { Metadata } from "next";
import { SpogomiIdentityAssistanceInvitation } from "@/components/spogomi/spogomi-identity-assistance-invitation";

type Props = { searchParams: Promise<{ eventId?: string; token?: string }> };

export const metadata: Metadata = {
  title: "Assistance de rattachement SPOGOMI",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function SpogomiIdentityAssistancePage({ searchParams }: Props) {
  const params = await searchParams;
  const eventId = params.eventId ?? "";
  const token = params.token ?? "";
  return <SpogomiIdentityAssistanceInvitation eventId={eventId} token={token} signInHref={`/sign-in?redirect_url=${encodeURIComponent(`/spogomi/assistance?eventId=${eventId}&token=${token}`)}`} />;
}
