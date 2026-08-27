/**
 * Types partagés pour l'application compagnon GPS CleanMyMap.
 */

export type MissionStatus = 'pending' | 'tracking' | 'completed' | 'cancelled' | 'paused'

export interface Mission {
  id: string
  volunteer_id?: string
  label: string
  status: MissionStatus
  started_at?: string | null
  ended_at?: string | null
  distance_m?: number | null
  duration_s?: number | null
  created_at: string
}

export interface MissionLocation {
  id?: number
  mission_id: string
  latitude: number
  longitude: number
  accuracy_m?: number | null
  altitude_m?: number | null
  recorded_at: string
}

export type MissionLocationInsert = Omit<MissionLocation, 'id'>

export type MissionActionType = 'trash_found' | 'trash_collected' | 'photo' | 'note' | 'hazard'

export interface MissionAction {
  id: string
  mission_id: string
  type: MissionActionType
  content?: string
  image_url?: string
  latitude: number
  longitude: number
  recorded_at: string
}

export type MissionActionInsert = Omit<MissionAction, 'id'>

export type TrackingPhase = 'idle' | 'requesting' | 'tracking' | 'stopping' | 'error'

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }
