import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

const MISSION_ASSETS_BUCKET = 'mission-assets';
const MISSION_ASSETS_BUCKET_HINT =
  "Le bucket public Supabase 'mission-assets' est manquant. Crée-le et rends-le public pour activer les uploads photo.";

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return '';
  }

  const candidate = error as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };

  return [candidate.message, candidate.details, candidate.hint]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase();
}

function isMissingBucketError(error: unknown): boolean {
  const message = getErrorMessage(error);
  if (!message) {
    return false;
  }

  return (
    message.includes(MISSION_ASSETS_BUCKET) &&
    (message.includes('bucket') ||
      message.includes('not found') ||
      message.includes('does not exist') ||
      message.includes('404'))
  );
}

/**
 * Télécharge une image vers le bucket Supabase 'mission-assets'.
 */
export async function uploadMissionPhoto(
  missionId: string,
  localUri: string
): Promise<{ publicUrl?: string; error?: string }> {
  try {
    const fileName = `${missionId}/${Date.now()}.jpg`;

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: 'base64',
    });

    const { data, error } = await supabase.storage
      .from(MISSION_ASSETS_BUCKET)
      .upload(fileName, decode(base64), {
        contentType: 'image/jpeg',
      });

    if (error) {
      if (isMissingBucketError(error)) {
        return { error: MISSION_ASSETS_BUCKET_HINT };
      }

      return { error: "Impossible d'envoyer la photo. Vérifie la connexion et réessaie." };
    }

    const { data: { publicUrl } } = supabase.storage
      .from(MISSION_ASSETS_BUCKET)
      .getPublicUrl(data.path);

    return { publicUrl };
  } catch (e: unknown) {
    if (isMissingBucketError(e)) {
      return { error: MISSION_ASSETS_BUCKET_HINT };
    }

    const message = e instanceof Error ? e.message : "Une erreur technique est survenue lors de l'upload.";
    return { error: message };
  }
}
