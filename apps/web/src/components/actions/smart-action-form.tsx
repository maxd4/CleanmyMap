'use client'

import { useFeatureFlag } from '@/lib/feature-flags'
import { useABTest } from '@/lib/ab-testing'
import { SimpleActionForm } from './simple-action-form'
import dynamic from 'next/dynamic'

import { CmmSkeleton } from '@/components/ui/cmm-skeleton'

// Lazy load the complex form to avoid bundle bloat
const ComplexActionForm = dynamic(() => 
 import('./action-declaration-form').then(mod => ({ default: mod.ActionDeclarationForm })),
 { 
 loading: () => (
 <div className="w-full cmm-surface rounded-3xl border p-6 space-y-6 shadow-sm">
 <div className="space-y-2">
 <CmmSkeleton className="h-6 w-1/3" />
 <CmmSkeleton className="h-4 w-1/2" />
 </div>
 <div className="space-y-4 mt-8">
 <CmmSkeleton className="h-12 w-full rounded-xl" />
 <CmmSkeleton className="h-12 w-full rounded-xl" />
 <CmmSkeleton className="h-32 w-full rounded-xl" />
 </div>
 <div className="pt-4 flex justify-end">
 <CmmSkeleton className="h-12 w-32 rounded-xl" />
 </div>
 </div>
 ),
 ssr: false 
 }
)

export function SmartActionForm() {
 const useSimpleForm = useFeatureFlag('useSimpleForm')
 const abTestVariant = useABTest('form-simplification')
 
 // Feature flag overrides A/B test
 const shouldUseSimpleForm = useSimpleForm || abTestVariant === 'treatment'
 
 return shouldUseSimpleForm ? <SimpleActionForm /> : <ComplexActionForm />
}

export default SmartActionForm