import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../../../supabase/migrations/20260826081000_align_chat_admin_elu_max_rls.sql",
  import.meta.url,
);

describe("chat authorization RLS migration", () => {
  it("keeps admin_elu max access aligned with the application channel helper", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toMatch(/alter\s+policy\s+app_messages_select_channels/i);
    expect(sql).toMatch(
      /channel_type\s*=\s*'admin_elu'[\s\S]+current_profile_role_label\(\)[\s\S]+in\s*\('admin',\s*'elu',\s*'max'\)/i,
    );
    expect(sql).toMatch(/can_view_territory_message\(arrondissement_id\)/i);
    expect(sql).toMatch(/sender_id[\s\S]+recipient_id/i);
  });
});
