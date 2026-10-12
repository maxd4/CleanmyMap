import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { SpogomiCreateForm } from "@/components/spogomi/spogomi-create-form";

export default async function SpogomiPage() {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) redirect("/sign-in?redirect_url=/spogomi");
  return <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50 px-4 py-10"><div className="cmm-page-width space-y-6"><PageHeader tone="stone" title="Préparer un événement SPOGOMI" subtitle="Brouillon privé pour organisateur autorisé : événement, roster, équipes et parcours officiel." /><SpogomiCreateForm /></div></main>;
}
