'use client'

import { useState, useEffect } from 'react'
import { CmmCard } from '@/components/ui/cmm-card'
import { CmmButton } from '@/components/ui/cmm-button'
import { Loader2 } from 'lucide-react'
import { SimpleActionFormData, FormErrors, validateSimpleForm, hasErrors } from './simple-form-validation'
import { useFormAnalytics } from '@/hooks/use-form-analytics'
import { useMetricsTracking } from '@/lib/metrics'

const initialForm: SimpleActionFormData = {
 title: '',
 description: '',
 location: '',
 date: '',
 participantCount: 1,
 wasteAmount: 0,
 photos: [],
 organizerName: '',
 organizerEmail: '',
 isPublic: true
}

export function SimpleActionForm() {
 const [form, setForm] = useState<SimpleActionFormData>(initialForm)
 const [errors, setErrors] = useState<FormErrors>({})
 const [isSubmitting, setIsSubmitting] = useState(false)
 const [submitSuccess, setSubmitSuccess] = useState(false)
 
 const analytics = useFormAnalytics({ 
 formId: 'action-declaration', 
 version: 'simple' 
 })
 
 const metrics = useMetricsTracking('simple')

 useEffect(() => {
 analytics.trackFormStart()
 }, [])

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 
 const formErrors = validateSimpleForm(form)
 setErrors(formErrors)
 
 if (hasErrors(formErrors)) {
 return
 }
 
 setIsSubmitting(true)
 
 try {
 const response = await fetch('/api/actions/simple', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(form)
 })
 
 if (!response.ok) {
 throw new Error('Erreur lors de l\'envoi')
 }
 
 const result = await response.json()
 analytics.trackFormComplete()
 metrics.complete()
 setSubmitSuccess(true)
 setForm(initialForm)
 } catch (error) {
 console.error('Submission error:', error)
 setErrors({ title: 'Erreur lors de l\'envoi. Veuillez réessayer.' })
 } finally {
 setIsSubmitting(false)
 }
 }

 const updateForm = (field: keyof SimpleActionFormData, value: any) => {
 setForm(prev => ({ ...prev, [field]: value }))
 // Clear error when user starts typing
 if (errors[field as keyof FormErrors]) {
 setErrors(prev => ({ ...prev, [field]: undefined }))
 }
 }

 if (submitSuccess) {
 return (
 <CmmCard className="max-w-2xl mx-auto text-center py-8">
 <div className="space-y-4">
 <div className="text-green-600 text-4xl">✓</div>
 <h2 className="text-2xl font-bold text-green-800">Action déclarée avec succès !</h2>
 <p className="cmm-text-secondary">Votre action de dépollution a été enregistrée.</p>
 <CmmButton onClick={() => setSubmitSuccess(false)}>Déclarer une nouvelle action</CmmButton>
 </div>
 </CmmCard>
 )
 }

 return (
 <CmmCard className="max-w-2xl mx-auto">
 <form onSubmit={handleSubmit} className="space-y-6">
 <div className="space-y-4">
 <h2 className="text-2xl font-bold">Déclarer une action de dépollution</h2>
 
 {/* Title */}
 <div>
 <label className="block cmm-text-small font-medium mb-2">
 Titre de l'action *
 </label>
 <input
 type="text"
 required
 value={form.title}
 onChange={(e) => updateForm('title', e.target.value)}
 className={`w-full p-3 border rounded-lg ${errors.title ? 'border-red-500' : ''}`}
 placeholder="Ex: Nettoyage de la plage de..."
 />
 {errors.title && <p className="text-red-500 cmm-text-small mt-1">{errors.title}</p>}
 </div>

 {/* Description */}
 <div>
 <label className="block cmm-text-small font-medium mb-2">
 Description
 </label>
 <textarea
 value={form.description}
 onChange={(e) => updateForm('description', e.target.value)}
 className="w-full p-3 border rounded-lg h-24"
 placeholder="Décrivez brièvement votre action..."
 />
 </div>

 {/* Location */}
 <div>
 <label className="block cmm-text-small font-medium mb-2">
 Lieu *
 </label>
 <input
 type="text"
 required
 value={form.location}
 onChange={(e) => updateForm('location', e.target.value)}
 className={`w-full p-3 border rounded-lg ${errors.location ? 'border-red-500' : ''}`}
 placeholder="Adresse ou nom du lieu"
 />
 {errors.location && <p className="text-red-500 cmm-text-small mt-1">{errors.location}</p>}
 </div>

 {/* Date */}
 <div>
 <label className="block cmm-text-small font-medium mb-2">
 Date *
 </label>
 <input
 type="date"
 required
 value={form.date}
 onChange={(e) => updateForm('date', e.target.value)}
 className={`w-full p-3 border rounded-lg ${errors.date ? 'border-red-500' : ''}`}
 />
 {errors.date && <p className="text-red-500 cmm-text-small mt-1">{errors.date}</p>}
 </div>

 {/* Participants */}
 <div>
 <label className="block cmm-text-small font-medium mb-2">
 Nombre de participants *
 </label>
 <input
 type="number"
 required
 min="1"
 value={form.participantCount}
 onChange={(e) => updateForm('participantCount', parseInt(e.target.value))}
 className={`w-full p-3 border rounded-lg ${errors.participantCount ? 'border-red-500' : ''}`}
 />
 {errors.participantCount && <p className="text-red-500 cmm-text-small mt-1">{errors.participantCount}</p>}
 </div>

 {/* Waste Amount */}
 <div>
 <label className="block cmm-text-small font-medium mb-2">
 Quantité de déchets collectés (kg)
 </label>
 <input
 type="number"
 min="0"
 step="0.1"
 value={form.wasteAmount}
 onChange={(e) => updateForm('wasteAmount', parseFloat(e.target.value))}
 className="w-full p-3 border rounded-lg"
 />
 </div>

 {/* Photos */}
 <div>
 <label className="block cmm-text-small font-medium mb-2">
 Photos
 </label>
 <input
 type="file"
 multiple
 accept="image/*"
 onChange={(e) => updateForm('photos', Array.from(e.target.files || []))}
 className="w-full p-3 border rounded-lg"
 />
 </div>

 {/* Organizer Name */}
 <div>
 <label className="block cmm-text-small font-medium mb-2">
 Nom de l'organisateur *
 </label>
 <input
 type="text"
 required
 value={form.organizerName}
 onChange={(e) => updateForm('organizerName', e.target.value)}
 className={`w-full p-3 border rounded-lg ${errors.organizerName ? 'border-red-500' : ''}`}
 />
 {errors.organizerName && <p className="text-red-500 cmm-text-small mt-1">{errors.organizerName}</p>}
 </div>

 {/* Organizer Email */}
 <div>
 <label className="block cmm-text-small font-medium mb-2">
 Email de contact *
 </label>
 <input
 type="email"
 required
 value={form.organizerEmail}
 onChange={(e) => updateForm('organizerEmail', e.target.value)}
 className={`w-full p-3 border rounded-lg ${errors.organizerEmail ? 'border-red-500' : ''}`}
 />
 {errors.organizerEmail && <p className="text-red-500 cmm-text-small mt-1">{errors.organizerEmail}</p>}
 </div>

 {/* Public/Private */}
 <div>
 <label className="flex items-center space-x-2">
 <input
 type="checkbox"
 checked={form.isPublic}
 onChange={(e) => updateForm('isPublic', e.target.checked)}
 className="rounded"
 />
 <span className="cmm-text-small">Rendre cette action publique</span>
 </label>
 </div>
 </div>

 <div className="flex gap-4">
 <CmmButton type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2">
 {isSubmitting ? <><Loader2 className="animate-spin" size={16} /> Envoi...</> : 'Déclarer l\'action'}
 </CmmButton>
 <CmmButton type="button" variant="outline" className="px-8">
 Annuler
 </CmmButton>
 </div>
 </form>
 </CmmCard>
 )
}