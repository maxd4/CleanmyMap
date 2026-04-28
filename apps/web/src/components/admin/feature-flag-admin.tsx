'use client'

import { useState, useEffect } from 'react'
import { CmmCard } from '@/components/ui/cmm-card'
import { CmmButton } from '@/components/ui/cmm-button'
import { featureFlags } from '@/lib/feature-flags'

export function FeatureFlagAdmin() {
 const [flags, setFlags] = useState(featureFlags.getAllFlags())
 const [analytics, setAnalytics] = useState<any[]>([])

 useEffect(() => {
 // Load analytics data from localStorage for demo
 const stored = localStorage.getItem('formAnalytics')
 if (stored) {
 try {
 setAnalytics(JSON.parse(stored))
 } catch (e) {
 console.warn('Failed to parse analytics data')
 }
 }
 }, [])

 const toggleFlag = (flag: keyof typeof flags) => {
 featureFlags.toggle(flag)
 setFlags(featureFlags.getAllFlags())
 }

 const clearAnalytics = () => {
 localStorage.removeItem('formAnalytics')
 setAnalytics([])
 }

 return (
 <div className="space-y-6">
 <CmmCard className="p-6">
 <h2 className="text-xl font-bold mb-4">Feature Flags</h2>
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

 <CmmCard className="p-6">
 <div className="flex justify-between items-center mb-4">
 <h2 className="text-xl font-bold">Form Analytics</h2>
 <CmmButton onClick={clearAnalytics} variant="ghost">
 Clear Data
 </CmmButton>
 </div>
 
 {analytics.length > 0 ? (
 <div className="space-y-2 max-h-64 overflow-y-auto">
 {analytics.slice(-10).map((event, index) => (
 <div key={index} className="cmm-text-small bg-gray-50 p-2 rounded">
 <div className="font-medium">{event.event}</div>
 <div className="cmm-text-secondary">
 {event.version} | {event.fieldName || 'N/A'} | 
 {event.timeSpent ? ` ${Math.round(event.timeSpent/1000)}s` : ''}
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="cmm-text-muted">No analytics data yet</p>
 )}
 </CmmCard>

 <CmmCard className="p-6">
 <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
 <div className="grid grid-cols-2 gap-4">
 <CmmButton 
 onClick={() => window.open('/declaration-simple', '_blank')}
 className="w-full"
 >
 Test Simple Form
 </CmmButton>
 <CmmButton 
 onClick={() => window.open('/declaration', '_blank')}
 variant="ghost"
 className="w-full"
 >
 Test Complex Form
 </CmmButton>
 </div>
 </CmmCard>
 </div>
 )
}