'use client'

import { useState } from 'react'
import { CmmCard } from '@/components/ui/cmm-card'
import { CmmButton } from '@/components/ui/cmm-button'
import { featureFlags } from '@/lib/feature-flags'

export function EnhancedAdmin() {
 const [flags, setFlags] = useState(featureFlags.getAllFlags())

 const toggleFlag = (flag: keyof typeof flags) => {
 featureFlags.toggle(flag)
 setFlags(featureFlags.getAllFlags())
 }

 return (
 <div className="space-y-6">
 <CmmCard className="p-6">
 <h2 className="text-xl font-bold mb-4">Feature Flags CURRENT</h2>
 <div className="space-y-3">
 {Object.entries(flags).map(([key, value]) => (
 <div key={key} className="flex items-center justify-between">
 <span className="font-medium">{key}</span>
 <CmmButton
 onClick={() => toggleFlag(key as keyof typeof flags)}
 variant={value ? 'default' : 'ghost'}
 className="px-4 py-2"
 >
 {value ? 'Enabled' : 'Disabled'}
 </CmmButton>
 </div>
 ))}
 </div>
 </CmmCard>
 </div>
 )
}
