'use client'

import { useState } from 'react'
import { CmmCard } from '@/components/ui/cmm-card'
import { CmmButton } from '@/components/ui/cmm-button'
import { featureFlags } from '@/lib/feature-flags'
import { abTestingService } from '@/lib/ab-testing'

type FormAnalyticsEvent = {
 event: string
 version?: string
 fieldName?: string
 timeSpent?: number
}

function readStoredAnalytics(): FormAnalyticsEvent[] {
 if (typeof window === 'undefined') {
 return []
 }

 const stored = localStorage.getItem('formAnalytics')
 if (!stored) {
 return []
 }

 try {
 const parsed: unknown = JSON.parse(stored)
 return Array.isArray(parsed) ? parsed as FormAnalyticsEvent[] : []
 } catch {
 return []
 }
}

export function EnhancedAdmin() {
 const [flags, setFlags] = useState(featureFlags.getAllFlags())
 const [analytics, setAnalytics] = useState<FormAnalyticsEvent[]>(readStoredAnalytics)
 const [trafficSplit, setTrafficSplit] = useState(() => abTestingService.getTestConfig('form-simplification')?.trafficSplit ?? 10)

 const toggleFlag = (flag: keyof typeof flags) => {
 featureFlags.toggle(flag)
 setFlags(featureFlags.getAllFlags())
 }

 const updateTrafficSplit = (newSplit: number) => {
 abTestingService.updateTrafficSplit('form-simplification', newSplit)
 setTrafficSplit(newSplit)
 }

 const clearAnalytics = () => {
 localStorage.removeItem('formAnalytics')
 setAnalytics([])
 }

 return (
 <div className="space-y-6">
 <CmmCard className="p-6">
 <h2 className="text-xl font-bold mb-4">A/B Testing - Form Simplification</h2>
 <div className="space-y-4">
 <div>
 <label className="block cmm-text-small font-medium mb-2">
 Traffic Split for Simple Form: {trafficSplit}%
 </label>
 <input
 type="range"
 min="0"
 max="100"
 step="5"
 value={trafficSplit}
 onChange={(e) => updateTrafficSplit(parseInt(e.target.value))}
 className="w-full"
 />
 <div className="flex justify-between cmm-text-caption cmm-text-muted mt-1">
 <span>0% (All Complex)</span>
 <span>50%</span>
 <span>100% (All Simple)</span>
 </div>
 </div>
 
 <div className="grid grid-cols-2 gap-4 text-center">
 <div className="bg-blue-50 p-3 rounded">
 <div className="text-lg font-bold text-blue-600">{100 - trafficSplit}%</div>
 <div className="cmm-text-small text-blue-800">Complex Form</div>
 </div>
 <div className="bg-green-50 p-3 rounded">
 <div className="text-lg font-bold text-green-600">{trafficSplit}%</div>
 <div className="cmm-text-small text-green-800">Simple Form</div>
 </div>
 </div>
 
 <div className="grid grid-cols-4 gap-2">
 <CmmButton 
 onClick={() => updateTrafficSplit(10)}
 variant="ghost"
 className="cmm-text-caption"
 >
 Week 1: 10%
 </CmmButton>
 <CmmButton 
 onClick={() => updateTrafficSplit(25)}
 variant="ghost"
 className="cmm-text-caption"
 >
 Week 2: 25%
 </CmmButton>
 <CmmButton 
 onClick={() => updateTrafficSplit(75)}
 variant="ghost"
 className="cmm-text-caption"
 >
 Week 3: 75%
 </CmmButton>
 <CmmButton 
 onClick={() => updateTrafficSplit(100)}
 className="cmm-text-caption"
 >
 Week 4: 100%
 </CmmButton>
 </div>
 </div>
 </CmmCard>

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
 onClick={() => window.open('/actions/new', '_blank')}
 className="w-full"
 >
 Test Simple Form
 </CmmButton>
 <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
 <p className="text-sm font-medium text-slate-900">Vue de comparaison interne</p>
 <p className="mt-1 cmm-text-small text-slate-600">
 Réservée aux accès directs pendant la phase de migration.
 </p>
 </div>
 </div>
 </CmmCard>
 </div>
 )
}
