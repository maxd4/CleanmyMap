import { checkCreatorAccess } from "@/lib/admin/access";
import { PageHeader } from "@/components/ui/page-header";
import { InstitutionalRelationsAdminClient } from "./institutional-relations-admin-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Relations institutionnelles | Administration CleanMyMap",
  description:
    "Suivi relationnel privé et projection publique additive des partenaires institutionnels.",
};

export default async function InstitutionalRelationsAdminPage() {
  await checkCreatorAccess();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Relations institutionnelles" />
      <InstitutionalRelationsAdminClient />
    </div>
  );
}
