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
      throw new Error('Une erreur réseau a empêché l\'envoi de votre déclaration. Veuillez réessayer.')
 }
 
 await response.json()
 analytics.trackFormComplete()
 metrics.complete()
 setSubmitSuccess(true)
 setForm(initialForm)
 } catch (error) {
 console.error('Submission error:', error)
    setErrors({ title: 'Impossible d\'enregistrer l\'action. Vérifiez votre connexion et les champs obligatoires.' })
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
 <CmmButton onClick={() => setSubmitSuccess(false)}>Nouvelle déclaration</CmmButton>
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
 <label htmlFor="action-title" className="block cmm-text-small font-medium mb-2">
 Titre de l'action *
 </label>
 <input
 id="action-title"
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
 <label htmlFor="action-description" className="block cmm-text-small font-medium mb-2">
 Description
 </label>
 <textarea
 id="action-description"
 value={form.description}
 onChange={(e) => updateForm('description', e.target.value)}
 className="w-full p-3 border rounded-lg h-24"
 placeholder="Décrivez brièvement votre action..."
 />
 </div>

 {/* Location */}
 <div>
 <label htmlFor="action-location" className="block cmm-text-small font-medium mb-2">
 Lieu *
 </label>
 <input
 id="action-location"
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
 <label htmlFor="action-date" className="block cmm-text-small font-medium mb-2">
 Date *
 </label>
 <input
 id="action-date"
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
 <label htmlFor="action-participants" className="block cmm-text-small font-medium mb-2">
 Nombre de participants *
 </label>
 <input
 id="action-participants"
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
 <label htmlFor="action-waste" className="block cmm-text-small font-medium mb-2">
 Quantité de déchets collectés (kg)
 </label>
 <input
 id="action-waste"
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
 <label htmlFor="action-photos" className="block cmm-text-small font-medium mb-2">
 Photos
 </label>
 <input
 id="action-photos"
 type="file"
 multiple
 accept="image/*"
 onChange={(e) => updateForm('photos', Array.from(e.target.files || []))}
 className="w-full p-3 border rounded-lg"
 />
 </div>

 {/* Organizer Name */}
 <div>
 <label htmlFor="action-organizer-name" className="block cmm-text-small font-medium mb-2">
 Nom de l'organisateur *
 </label>
 <input
 id="action-organizer-name"
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
 <label htmlFor="action-organizer-email" className="block cmm-text-small font-medium mb-2">
 Email de contact *
 </label>
 <input
 id="action-organizer-email"
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
 <label className="flex items-center space-x-2 cursor-pointer">
 <input
 id="action-is-public"
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
 {isSubmitting ? <><Loader2 className="animate-spin" size={16} /> Envoi...</> : 'Envoyer'}
 </CmmButton>
 <CmmButton type="button" variant="outline" className="px-8">
 Annuler
 </CmmButton>
 </div>
 </form>
 </CmmCard>
 )
}