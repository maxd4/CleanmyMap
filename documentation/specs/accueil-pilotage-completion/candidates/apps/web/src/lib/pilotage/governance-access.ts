import type { SessionRole } from "@/lib/domain-language";

/** Published aggregate reading, not a territorial assignment or mutation right. */
export function canReadGovernanceAggregates(role: SessionRole): boolean {
  return role === "elu" || role === "max";
}
