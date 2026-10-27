import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({ SUPABASE_STORAGE_QUOTA_BYTES: undefined as string | undefined, SUPABASE_STORAGE_QUOTA_GB: undefined as string | undefined }));
vi.mock("@/lib/env", () => ({ env: envMock }));

import { resolveSupabaseStorageQuotaInfo } from "./storage-quota";

describe("resolveSupabaseStorageQuotaInfo", () => {
  beforeEach(() => {
    envMock.SUPABASE_STORAGE_QUOTA_BYTES = undefined;
    envMock.SUPABASE_STORAGE_QUOTA_GB = undefined;
  });

  it("prefers a positive integer byte quota and preserves its configured source", () => {
    envMock.SUPABASE_STORAGE_QUOTA_BYTES = "2147483648.9";
    envMock.SUPABASE_STORAGE_QUOTA_GB = "8";
    expect(resolveSupabaseStorageQuotaInfo()).toMatchObject({ bytes: 2147483648, source: "configured_bytes", configuredValue: "2147483648.9" });
  });

  it("uses a positive GB quota and rejects invalid, zero or negative values", () => {
    envMock.SUPABASE_STORAGE_QUOTA_BYTES = "0";
    envMock.SUPABASE_STORAGE_QUOTA_GB = "1.5";
    expect(resolveSupabaseStorageQuotaInfo()).toMatchObject({ bytes: Math.round(1.5 * 1024 * 1024 * 1024), source: "configured_gb", label: "1,5 GB" });
    envMock.SUPABASE_STORAGE_QUOTA_BYTES = "not-a-number";
    envMock.SUPABASE_STORAGE_QUOTA_GB = "-2";
    expect(resolveSupabaseStorageQuotaInfo()).toEqual({ bytes: 1024 * 1024 * 1024, label: "1 GB", source: "default_free", configuredValue: null });
  });
});
