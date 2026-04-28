import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export interface PhotoUploadResult {
  url: string
  path: string
  error?: string
}

export class PhotoUploadService {
  private supabase = getSupabaseBrowserClient()
  private bucket = 'action-photos'

  async uploadPhoto(file: File, actionId: string): Promise<PhotoUploadResult> {
    try {
      // Validate file
      if (!this.isValidImageFile(file)) {
        return { url: '', path: '', error: 'Format de fichier non supporté' }
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return { url: '', path: '', error: 'Fichier trop volumineux (max 5MB)' }
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${actionId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        return { url: '', path: '', error: 'Impossible d\'envoyer la photo. Veuillez vérifier votre connexion et réessayer.' }
      }

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(data.path)

      return {
        url: publicUrl,
        path: data.path
      }

    } catch (error) {
      console.error('Photo upload service error:', error)
      return { url: '', path: '', error: 'Une erreur technique est survenue lors de l\'upload. Si le problème persiste, contactez le support.' }
    }
  }

  async uploadMultiplePhotos(files: File[], actionId: string): Promise<PhotoUploadResult[]> {
    const uploadPromises = files.map(file => this.uploadPhoto(file, actionId))
    return Promise.all(uploadPromises)
  }

  private isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    return validTypes.includes(file.type)
  }

  async deletePhoto(path: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([path])

      return !error
    } catch (error) {
      console.error('Delete photo error:', error)
      return false
    }
  }
}

export const photoUploadService = new PhotoUploadService()