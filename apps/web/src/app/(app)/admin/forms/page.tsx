import { EnhancedAdmin } from '@/components/admin/enhanced-admin'

export default function AdminFormPage() {
 return (
 <div className="min-h-screen bg-gray-50 py-8">
 <div className="container mx-auto px-4 max-w-4xl">
 <div className="mb-8">
 <h1 className="text-3xl font-bold mb-2">Form Admin Panel</h1>
 <p className="cmm-text-secondary">
 Manage A/B testing, feature flags and monitor form analytics
 </p>
 </div>
 
 <EnhancedAdmin />
 </div>
 </div>
 )
}