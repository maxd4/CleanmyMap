import { EnhancedAdmin } from '@/components/admin/enhanced-admin'
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";

export default function AdminFormPage() {
 return (
 <div className="min-h-screen py-8">
 <div className="container mx-auto px-4 max-w-4xl">
 <div className="mb-8">
 <PageHeader
  tone="slate"
  badge={<PageHeaderBadge tone="slate">Admin</PageHeaderBadge>}
  title="Form Admin Panel"
  subtitle="Manage A/B testing, feature flags and monitor form analytics."
 />
 </div>
 
      <EnhancedAdmin />
 </div>
 </div>
 )
}
