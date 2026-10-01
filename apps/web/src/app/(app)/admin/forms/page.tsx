import { EnhancedAdmin } from '@/components/admin/enhanced-admin'
import { PageHeader } from "@/components/ui/page-header";
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";

export default function AdminFormPage() {
 return (
 <div className="min-h-screen">
 <CmmPageLayout>
 <PageHeader
  tone="slate"
  title="Administration des feature flags"
  subtitle="Piloter uniquement les flags consommés par les parcours CURRENT."
 />
 <CmmSectionGroup>
      <EnhancedAdmin />
 </CmmSectionGroup>
 </CmmPageLayout>
 </div>
 )
}
