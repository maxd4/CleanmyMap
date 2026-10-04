/**
 * Types partagés pour l'application compagnon GPS CleanMyMap.
 */

type MissionStatus = 'pending' | 'tracking' | 'completed' | 'cancelled'

export interface Mission {
  id: string
  volunteer_id?: string
  action_id?: string | null
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

export interface ForegroundTrackPoint {
  latitude: number
  longitude: number
  recordedAt: string
}

export type TrackingPhase = 'idle' | 'requesting' | 'tracking' | 'stopping' | 'error'

export type MissionFinalizationStage = 'synchronizing' | 'finalizing'

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }
