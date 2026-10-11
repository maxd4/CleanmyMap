import * as ImagePicker from 'expo-image-picker'
import { getAuthenticatedSupabaseClient, getClerkSupabaseAccessToken } from './supabase'

export type MobilePickedPhoto = ImagePicker.ImagePickerAsset
export type MobileMediaItem = { id: string; originalName: string; signedUrl: string; uploadState: string }

const baseUrl = () => process.env.EXPO_PUBLIC_WEB_APP_URL?.trim().replace(/\/$/, '')

async function authorizedFetch(path: string, init: RequestInit = {}) {
  const token = await getClerkSupabaseAccessToken()
  if (!token) { const error = new Error('Session Clerk expirée ou indisponible.'); (error as Error & { status?: number }).status = 401; throw error }
  const origin = baseUrl()
  if (!origin) throw new Error('URL du site web absente.')
  const response = await fetch(`${origin}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } })
  const body = await response.json().catch(() => null) as { error?: string; items?: MobileMediaItem[]; intent?: { mediaId: string; bucket: string; path: string; token: string; uploadState: 'pending' | 'ready' } } | null
  if (!response.ok) { const error = new Error(body?.error ?? 'La preuve photo est indisponible.'); (error as Error & { status?: number }).status = response.status; throw error }
  return { body, token }
}

export async function pickSignalementPhotos(): Promise<MobilePickedPhoto[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) throw new Error('La permission photo est nécessaire pour ajouter une preuve.')
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: 3, quality: 0.82 })
  return result.canceled ? [] : result.assets.slice(0, 3)
}

async function uploadOne(signalementId: string, photo: MobilePickedPhoto, sortOrder: number): Promise<void> {
  const blob = await (await fetch(photo.uri)).blob()
  const mimeType = photo.mimeType && ['image/jpeg', 'image/png', 'image/webp'].includes(photo.mimeType) ? photo.mimeType : 'image/jpeg'
  const stableAssetKey = `${photo.fileName ?? 'photo'}-${photo.assetId ?? photo.uri.slice(-48)}`.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 96)
  const clientUploadId = `mobile-${sortOrder}-${stableAssetKey}`.slice(0, 128)
  const { body } = await authorizedFetch(`/api/signalements/${encodeURIComponent(signalementId)}/media/intents`, {
    method: 'POST',
    body: JSON.stringify({ originalName: photo.fileName ?? `signalement-${sortOrder}.jpg`, mimeType, sizeBytes: photo.fileSize ?? blob.size, width: photo.width, height: photo.height, sortOrder, clientUploadId }),
  })
  if (!body?.intent || body.intent.uploadState === 'ready') return
  const storage = await getAuthenticatedSupabaseClient()
  if (!storage) throw new Error('Session Clerk expirée avant la transmission photo.')
  const upload = await storage.storage.from(body.intent.bucket).uploadToSignedUrl(body.intent.path, body.intent.token, blob, { upsert: true, contentType: mimeType })
  if (upload.error) throw new Error('La transmission de la photo a échoué.')
  await authorizedFetch(`/api/signalements/${encodeURIComponent(signalementId)}/media/${encodeURIComponent(body.intent.mediaId)}/finalize`, { method: 'POST', body: JSON.stringify({}) })
}

export async function uploadSignalementPhotos(signalementId: string, photos: MobilePickedPhoto[]) {
  const failed: Array<{ photo: MobilePickedPhoto; message: string }> = []
  let uploadedCount = 0
  for (const [index, photo] of photos.slice(0, 3).entries()) {
    try { await uploadOne(signalementId, photo, index); uploadedCount += 1 }
    catch (value) { failed.push({ photo, message: value instanceof Error ? value.message : 'La photo n’a pas pu être transmise.' }) }
  }
  return { uploadedCount, failed }
}

export async function loadSignalementMedia(signalementId: string) {
  const result = await authorizedFetch(`/api/signalements/${encodeURIComponent(signalementId)}/media`)
  return result.body?.items ?? []
}
