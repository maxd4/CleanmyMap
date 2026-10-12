import { redirect } from "next/navigation";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { SpogomiPreparationWorkspace } from "@/components/spogomi/spogomi-preparation-workspace";

export default async function SpogomiEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) redirect(`/sign-in?redirect_url=/spogomi/${(await params).eventId}`);
  return <SpogomiPreparationWorkspace eventId={(await params).eventId} />;
}
