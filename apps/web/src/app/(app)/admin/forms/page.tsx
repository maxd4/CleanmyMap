import { EnhancedAdmin } from '@/components/admin/enhanced-admin'
import { PageHeader } from "@/components/ui/page-header";
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";

export default function AdminFormPage() {
 return (
 <div className="min-h-screen">
 <CmmPageLayout>
 <PageHeader
  tone="slate"
  title="Form Admin Panel"
  subtitle="Manage A/B testing, feature flags and monitor form analytics."
 />
 <CmmSectionGroup>
      <EnhancedAdmin />
 </CmmSectionGroup>
 </CmmPageLayout>
 </div>
 )
}
