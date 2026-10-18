import type { Metadata } from "next";
import { PrivateActionInvitePage } from "@/components/actions/private-action-invite-page";

export const metadata: Metadata = {
  title: "Invitation à une action privée",
  robots: { index: false, follow: false },
};

export default async function PrivateActionInviteRoute({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return <PrivateActionInvitePage token={(await params).token} />;
}
