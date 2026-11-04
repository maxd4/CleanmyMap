import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261104000004_pedestrian_network.sql", import.meta.url),
  "utf8",
);

describe("pedestrian network migration STATIC_CONTRACT", () => {
  it("installs PostGIS and stores versioned directed graph data", () => {
    expect(migration).toContain("create extension if not exists postgis with schema extensions");
    expect(migration).toContain("create table if not exists public.pedestrian_network_versions");
    expect(migration).toContain("unique (network_key, importer_version, source_sha256)");
    expect(migration).toContain("create table if not exists public.pedestrian_network_nodes");
    expect(migration).toContain("create table if not exists public.pedestrian_network_edges");
    expect(migration).toContain("direction in ('forward', 'reverse')");
    expect(migration).toContain("create table if not exists public.pedestrian_network_connections");
    expect(migration).toContain("create table if not exists public.pedestrian_network_diagnostics");
  });

  it("keeps spatial indexes and server-only access", () => {
    expect(migration).toContain("using gist (geom)");
    expect(migration).toContain("alter table public.pedestrian_network_edges enable row level security");
    expect(migration).toContain("revoke all on table public.pedestrian_network_versions");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("create or replace function public.get_active_pedestrian_network(");
    expect(migration).toContain("revoke all on function public.get_active_pedestrian_network");
  });
});
