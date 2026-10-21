import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { renderGovernanceQualityReview } from "./route-quality";
import { renderGovernanceReport } from "./route-pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) return adminAccessErrorJsonResponse(access);
  const url = new URL(request.url);
  return url.searchParams.get("quality") === "1"
    ? renderGovernanceQualityReview(url)
    : renderGovernanceReport(url);
}
