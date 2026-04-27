import { NextRequest, NextResponse } from 'next/server'
import { SimpleActionFormData } from '@/components/actions/simple-form-validation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { photoUploadService } from '@/lib/photo-upload'

export async function POST(request: NextRequest) {
 try {
 const formData: SimpleActionFormData = await request.json()
 
 // Basic server-side validation
 if (!formData.title || !formData.location || !formData.organizerEmail) {
 return NextResponse.json(
 { error: 'Champs requis manquants' },
 { status: 400 }
 )
 }

 const supabase = getSupabaseBrowserClient()
 
 // Map simplified form to database schema
 const actionData = {
 action_date: formData.date,
 location_label: formData.location,
 waste_kg: formData.wasteAmount || 0,
 volunteers_count: formData.participantCount,
 actor_name: formData.organizerName,
 notes: `${formData.title}\n\n${formData.description}\n\nContact: ${formData.organizerEmail}\nPublic: ${formData.isPublic}`,
 created_by_clerk_id: 'anonymous', // TODO: Get from auth
 status: 'pending'
 }

 const { data, error } = await supabase
 .from('actions')
 .insert([actionData])
 .select()
 .single()

 if (error) {
 console.error('Supabase error:', error)
 return NextResponse.json(
 { error: 'Erreur lors de l\'enregistrement' },
 { status: 500 }
 )
 }

 // Handle photo uploads if any
 let photoUrls: string[] = []
 if (formData.photos && formData.photos.length > 0) {
 try {
 const uploadResults = await photoUploadService.uploadMultiplePhotos(
 formData.photos, 
 data.id
 )
 
 photoUrls = uploadResults
 .filter(result => !result.error)
 .map(result => result.url)
 
 // Update action with photo URLs if any uploaded successfully
 if (photoUrls.length > 0) {
 await supabase
 .from('actions')
 .update({ 
 notes: `${actionData.notes}\n\nPhotos: ${photoUrls.join(', ')}` 
 })
 .eq('id', data.id)
 }
 } catch (photoError) {
 console.error('Photo upload error:', photoError)
 // Continue without photos - don't fail the entire submission
 }
 }

 return NextResponse.json({ 
 success: true, 
 message: 'Action déclarée avec succès',
 id: data.id,
 photoCount: photoUrls.length
 })

 } catch (error) {
 console.error('API Error:', error)
 return NextResponse.json(
 { error: 'Erreur serveur' },
 { status: 500 }
 )
 }
}