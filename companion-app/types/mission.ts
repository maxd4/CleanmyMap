/**
 * Types partagés pour l'application compagnon GPS CleanMyMap.
 * Ces types reflètent le schéma Supabase défini dans architecture_gps_companion.md.
 */

// ─── Mission ─────────────────────────────────────────────────────────────────

export type MissionStatus = 'pending' | 'tracking' | 'completed' | 'cancelled';

export interface Mission {
  id: string;                  // uuid PK
  volunteer_id: string;        // uuid FK → profiles.id
  created_by?: string;         // uuid FK → profiles.id
  label: string;               // Description courte
  status: MissionStatus;
  started_at?: string | null;  // ISO 8601 — set par l'app au démarrage
  ended_at?: string | null;    // ISO 8601 — set par l'app à la fin
  distance_m?: number | null;  // Calculé post-mission via SQL (Haversine)
  duration_s?: number | null;  // ended_at - started_at en secondes
  created_at: string;          // ISO 8601
}

// ─── GPS Point ───────────────────────────────────────────────────────────────

export interface MissionLocation {
  id?: number;           // bigint PK (auto-généré côté Supabase)
  mission_id: string;    // uuid FK → missions.id
  latitude: number;
  longitude: number;
  accuracy_m?: number | null;
  altitude_m?: number | null;
  recorded_at: string;   // ISO 8601 — timestamp du fix GPS côté appareil
  created_at?: string;   // ISO 8601 — timestamp d'insertion Supabase
}

// Payload d'insertion (sans id ni created_at, générés par Supabase)
export type MissionLocationInsert = Omit<MissionLocation, 'id' | 'created_at'>;

// ─── Tracking Status (état local de l'app) ───────────────────────────────────

export type TrackingPhase =
  | 'idle'           // Aucune mission active
  | 'requesting'     // Demande de permissions GPS en cours
  | 'tracking'       // GPS background actif
  | 'stopping'       // Arrêt en cours (update Supabase + calcul distance)
  | 'error';         // Erreur (permissions refusées, réseau, etc.)

export interface TrackingStatus {
  phase: TrackingPhase;
  missionId: string | null;
  lastLocation: MissionLocation | null;
  pointsRecorded: number;
  bufferedPoints: number;    // Points en attente d'envoi (hors ligne)
  errorMessage: string | null;
  startedAt: string | null;  // ISO 8601
}

// ─── Résultat des opérations du TrackingService ──────────────────────────────

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };
