const GOVERNANCE_METHODOLOGY_PATH = "/methodologie#governance-report";
const GOVERNANCE_ADMIN_FREE_PLANS_PATH = "/admin/services#free-plans";
const GOVERNANCE_ADMIN_STORAGE_PATH = "/admin/services#storage";
const GOVERNANCE_MONTHLY_REPORT_PATH = "/api/reports/governance-monthly";

function buildGovernanceMonthlyReportPath(reportMonth: string): string {
  const encodedMonth = encodeURIComponent(reportMonth);
  return `${GOVERNANCE_MONTHLY_REPORT_PATH}?month=${encodedMonth}`;
}

export function buildGovernanceMethodologyLinks(reportMonth: string) {
  return [
    {
      label: "Méthodologie de calcul",
      href: GOVERNANCE_METHODOLOGY_PATH,
    },
    {
      label: "Fiche admin coûts et quota gratuit",
      href: GOVERNANCE_ADMIN_FREE_PLANS_PATH,
    },
    {
      label: "Suivi du stockage Supabase",
      href: GOVERNANCE_ADMIN_STORAGE_PATH,
    },
    {
      label: "Rapport mensuel courant",
      href: buildGovernanceMonthlyReportPath(reportMonth),
    },
  ] as const;
}
