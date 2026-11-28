import { redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/authz";
import { getServerLocale } from "@/lib/server-preferences";
import { PageHeader } from "@/components/ui/page-header";
import { OrganizationBootstrapReviewPanel } from "./organization-bootstrap-review-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Organisations | Administration CleanMyMap",
  description: "Revue privée des mandats d'organisations partenaires.",
  robots: { index: false, follow: false },
};

export default async function AdminOrganizationsPage() {
  const [access, locale] = await Promise.all([requireAdminAccess(), getServerLocale()]);
  if (!access.ok) redirect("/");

  return <div className="cmm-page-width space-y-4 py-8">
    <PageHeader
      title={locale === "en" ? "Organization mandates" : "Mandats des organisations"}
      subtitle={locale === "en"
        ? "Check the legal identity, organizer reference and applicant account before activation."
        : "Vérifiez l'identité légale, la référence d'organisateur et le compte déposant avant activation."}
    />
    <OrganizationBootstrapReviewPanel locale={locale} />
  </div>;
}
