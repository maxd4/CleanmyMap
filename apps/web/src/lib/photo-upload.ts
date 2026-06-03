import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/media/image-compression";
import { buildStorageBusinessMetadata } from "@/lib/supabase/storage-business-classification";
import { logFailure, logWarning } from "@/lib/logging/failure-log";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PhotoUploadResult {
  url: string
  path: string
  error?: string
}

export class PhotoUploadService {
  private supabase: SupabaseClient | null = null
  private bucket = "action-photos"
  private bucketHint = "Le bucket public Supabase 'action-photos' est manquant. Crée-le et rends-le public pour activer les uploads photo."

  private getSupabaseClient(): SupabaseClient | null {
    if (this.supabase) {
      return this.supabase;
    }

    try {
      this.supabase = getSupabaseBrowserClient();
      return this.supabase;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        logWarning("PhotoUpload", "Supabase browser client unavailable in dev", {
          reason: error instanceof Error ? error.message : String(error),
        });
        return null;
      }

      throw error;
    }
  }

  async uploadPhoto(file: File, actionId: string): Promise<PhotoUploadResult> {
    try {
      const supabase = this.getSupabaseClient();
      if (!supabase) {
        return {
          url: "",
          path: "",
          error: "Uploads photo indisponibles tant que Supabase local n'est pas configuré.",
        };
      }

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

      const { data, error } = await supabase.storage
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
        if (this.isMissingBucketError(error)) {
          logWarning("PhotoUpload", "Supabase bucket missing", {
            bucket: this.bucket,
          });
          return { url: '', path: '', error: this.bucketHint }
        }

        logFailure("PhotoUpload", "Upload failed", error, {
          bucket: this.bucket,
          actionId,
        });
        return { url: '', path: '', error: "Impossible d'envoyer la photo. Veuillez vérifier votre connexion et réessayer." }
      }

      const { data: { publicUrl } } = supabase.storage
        .from(this.bucket)
        .getPublicUrl(data.path)

      return {
        url: publicUrl,
        path: data.path
      }

    } catch (error) {
      if (this.isMissingBucketError(error)) {
        logWarning("PhotoUpload", "Supabase bucket missing", {
          bucket: this.bucket,
        });
        return { url: '', path: '', error: this.bucketHint }
      }

      logFailure("PhotoUpload", "Service failure", error, {
        bucket: this.bucket,
        actionId,
      });
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
      const supabase = this.getSupabaseClient();
      if (!supabase) {
        return false;
      }

      const { error } = await supabase.storage
        .from(this.bucket)
        .remove([path])

      return !error
    } catch (error) {
      logFailure("PhotoUpload", "Delete failed", error, {
        bucket: this.bucket,
        path,
      });
      return false
    }
  }
}

export const photoUploadService = new PhotoUploadService()
