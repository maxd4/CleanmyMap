const QUALITY_AUDIT_POLICIES = Object.freeze({
  cycles: Object.freeze({
    status: "SKIPPED_BY_POLICY",
    reason: "L’analyse GitNexus des cycles est suspendue par la politique du dépôt jusqu’à réactivation explicite.",
  }),
});

export function qualityAuditPolicy(audit) {
  return QUALITY_AUDIT_POLICIES[audit] ?? null;
}

export function isQualityAuditSkippedByPolicy(audit) {
  return qualityAuditPolicy(audit)?.status === "SKIPPED_BY_POLICY";
}
