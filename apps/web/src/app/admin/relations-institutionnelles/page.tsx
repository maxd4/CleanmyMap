import { redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/authz";
import { PageHeader } from "@/components/ui/page-header";
import { InstitutionalRelationsAdminClient } from "./institutional-relations-admin-client";

// force-dynamic: private admin institutional relations CRM (no-store, auth-gated)
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Relations institutionnelles | Administration CleanMyMap",
  description:
    "Suivi relationnel privé et projection publique additive des partenaires institutionnels.",
  robots: { index: false, follow: false },
};

export default async function InstitutionalRelationsAdminPage() {
  const access = await requireAdminAccess();
  if (!access.ok) {
    redirect("/");
  }

  return (
    <div className="cmm-page-width py-8">
      <PageHeader title="Relations institutionnelles" />
      <InstitutionalRelationsAdminClient />
    </div>
  );
}
