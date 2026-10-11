import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  token: 'clerk-session-token' as string | null,
  storage: null as any,
  permissionGranted: true,
  pickerResult: { canceled: false, assets: [] as any[] },
}))

vi.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'images' },
  requestMediaLibraryPermissionsAsync: vi.fn(async () => ({ granted: state.permissionGranted })),
  launchImageLibraryAsync: vi.fn(async () => state.pickerResult),
}))
vi.mock('../lib/supabase', () => ({
  getClerkSupabaseAccessToken: vi.fn(async () => state.token),
  getAuthenticatedSupabaseClient: vi.fn(async () => state.storage),
}))

import { pickSignalementPhotos, loadSignalementMedia, uploadSignalementPhotos, type MobilePickedPhoto } from '../lib/signalement-media-service'

const photo = { uri: 'file:///tmp/photo.jpg', fileName: 'photo.jpg', mimeType: 'image/jpeg', fileSize: 12, width: 100, height: 80 } as MobilePickedPhoto

describe('signalement media transport', () => {
  beforeEach(() => {
    state.token = 'clerk-session-token'
    state.storage = null
    state.permissionGranted = true
    state.pickerResult = { canceled: false, assets: [photo] }
    process.env.EXPO_PUBLIC_WEB_APP_URL = 'https://cleanmymap.test/'
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('enforces the photo permission and bounds the native selection', async () => {
    state.permissionGranted = false
    await expect(pickSignalementPhotos()).rejects.toThrow('permission photo')

    state.permissionGranted = true
    state.pickerResult = { canceled: false, assets: [photo, photo, photo, photo] }
    await expect(pickSignalementPhotos()).resolves.toHaveLength(3)

    state.pickerResult = { canceled: true, assets: [photo] }
    await expect(pickSignalementPhotos()).resolves.toEqual([])
  })

  it('finalizes a pending upload with the Clerk bearer and signed storage upload', async () => {
    const uploadToSignedUrl = vi.fn(async () => ({ error: null }))
    state.storage = { storage: { from: vi.fn(() => ({ uploadToSignedUrl })) } }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('photo-bytes'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ intent: { mediaId: 'media-1', bucket: 'signalements', path: 'path', token: 'signed', uploadState: 'pending' } }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'finalized' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(uploadSignalementPhotos('signalement/1', [photo])).resolves.toMatchObject({ uploadedCount: 1, failed: [] })
    expect(uploadToSignedUrl).toHaveBeenCalledWith('path', 'signed', expect.any(Blob), { upsert: true, contentType: 'image/jpeg' })
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://cleanmymap.test/api/signalements/signalement%2F1/media/intents', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer clerk-session-token' }) }))
  })

  it('accepts an already-ready intent without a second storage upload', async () => {
    const uploadToSignedUrl = vi.fn()
    state.storage = { storage: { from: vi.fn(() => ({ uploadToSignedUrl })) } }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('photo-bytes'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ intent: { mediaId: 'media-1', bucket: 'signalements', path: 'path', token: 'signed', uploadState: 'ready' } }), { status: 200 })))

    await expect(uploadSignalementPhotos('signalement-1', [photo])).resolves.toMatchObject({ uploadedCount: 1, failed: [] })
    expect(uploadToSignedUrl).not.toHaveBeenCalled()
  })

  it('reports partial media failure and does not fabricate success', async () => {
    state.storage = null
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('photo-bytes'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ intent: { mediaId: 'media-1', bucket: 'signalements', path: 'path', token: 'signed', uploadState: 'pending' } }), { status: 201 })))

    await expect(uploadSignalementPhotos('signalement-1', [photo])).resolves.toMatchObject({ uploadedCount: 0, failed: [{ photo, message: 'Session Clerk expirée avant la transmission photo.' }] })
  })

  it('loads only the server-provided photo evidence and preserves API errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ items: [{ id: 'media-1', originalName: 'photo.jpg', signedUrl: 'https://signed', uploadState: 'ready' }] }), { status: 200 })))
    await expect(loadSignalementMedia('signalement-1')).resolves.toHaveLength(1)

    state.token = null
    await expect(loadSignalementMedia('signalement-1')).rejects.toMatchObject({ status: 401 })
  })
})
