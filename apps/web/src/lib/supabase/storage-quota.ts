import { env } from "@/lib/env";
import {
  formatStorageBytes,
  formatStorageNumber,
  type StorageQuotaInfo,
} from "@/lib/supabase/storage-usage";

const BYTES_PER_GB = 1024 * 1024 * 1024;

function toPositiveInteger(raw: string | undefined): number | null {
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.trunc(parsed);
}

export function resolveSupabaseStorageQuotaInfo(): StorageQuotaInfo {
  const quotaBytes = toPositiveInteger(env.SUPABASE_STORAGE_QUOTA_BYTES);
  if (quotaBytes) {
    return {
      bytes: quotaBytes,
      label: formatStorageBytes(quotaBytes),
      source: "configured_bytes",
      configuredValue: env.SUPABASE_STORAGE_QUOTA_BYTES ?? null,
    };
  }

  const quotaGbRaw = env.SUPABASE_STORAGE_QUOTA_GB;
  if (quotaGbRaw) {
    const parsed = Number(quotaGbRaw);
    if (Number.isFinite(parsed) && parsed > 0) {
      const bytes = Math.round(parsed * BYTES_PER_GB);
      return {
        bytes,
        label: `${formatStorageNumber(parsed)} GB`,
        source: "configured_gb",
        configuredValue: quotaGbRaw,
      };
    }
  }

  return {
    bytes: BYTES_PER_GB,
    label: "1 GB",
    source: "default_free",
    configuredValue: null,
  };
}
