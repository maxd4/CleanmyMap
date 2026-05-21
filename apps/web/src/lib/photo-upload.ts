import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { compressImageFile } from '@/lib/media/image-compression'
import { buildStorageBusinessMetadata } from '@/lib/supabase/storage-business-classification'

export interface PhotoUploadResult {
  url: string
  path: string
  error?: string
}

export class PhotoUploadService {
  private supabase = getSupabaseBrowserClient()
  private bucket = 'action-photos'
  private bucketHint = "Le bucket public Supabase 'action-photos' est manquant. Crée-le et rends-le public pour activer les uploads photo."

  async uploadPhoto(file: File, actionId: string): Promise<PhotoUploadResult> {
    try {
      if (!this.isValidImageFile(file)) {
        return { url: '', path: '', error: 'Format de fichier non supporté' }
      }

      const preparedFile = await compressImageFile(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.82,
      })

      if (preparedFile.size > 5 * 1024 * 1024) {
        return { url: '', path: '', error: 'Fichier trop volumineux (max 5MB)' }
      }

      const fileExt = preparedFile.name.split('.').pop() || 'jpg'
      const fileName = `${actionId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { data, error } = await this.supabase.storage
        .from(this.bucket)
          .upload(
            fileName,
            preparedFile,
            {
              cacheControl: '3600',
              upsert: false,
              metadata: buildStorageBusinessMetadata({
                businessDomain: 'pieces_jointes_photo',
                sourceTable: 'actions',
                businessContext: 'action_photo',
                extra: {
                  actionId,
                },
            }),
          },
        )

      if (error) {
        console.error('Upload error:', error)
        if (this.isMissingBucketError(error)) {
          return { url: '', path: '', error: this.bucketHint }
        }

        return { url: '', path: '', error: "Impossible d'envoyer la photo. Veuillez vérifier votre connexion et réessayer." }
      }

      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(data.path)

      return {
        url: publicUrl,
        path: data.path
      }

    } catch (error) {
      console.error('Photo upload service error:', error)
      if (this.isMissingBucketError(error)) {
        return { url: '', path: '', error: this.bucketHint }
      }

      return { url: '', path: '', error: "Une erreur technique est survenue lors de l'upload. Si le problème persiste, contactez le support." }
    }
  }

  async uploadMultiplePhotos(files: File[], actionId: string): Promise<PhotoUploadResult[]> {
    const results: PhotoUploadResult[] = []

    for (const file of files.slice(0, 10)) {
      results.push(await this.uploadPhoto(file, actionId))
    }

    return results
  }

  private isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    return validTypes.includes(file.type)
  }

  private isMissingBucketError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false
    }

    const candidate = error as {
      message?: unknown
      details?: unknown
      hint?: unknown
      statusCode?: unknown
    }

    const message = [candidate.message, candidate.details, candidate.hint]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ')
      .toLowerCase()

    return (
      message.includes(this.bucket) &&
      (message.includes('bucket') ||
        message.includes('not found') ||
        message.includes('does not exist') ||
        message.includes('404') ||
        String(candidate.statusCode ?? '').includes('404'))
    )
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
