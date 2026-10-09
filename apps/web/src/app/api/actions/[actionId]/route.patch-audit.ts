import { appendActionModerationAudit } from "@/lib/actions/moderation-audit";

export function createAdminAuditOnceAppender(): (
  params: Parameters<typeof appendActionModerationAudit>[0],
) => Promise<void> {
  let recorded = false;
  return async (params) => {
    if (recorded) return;
    recorded = true;
    await appendActionModerationAudit(params);
  };
}
