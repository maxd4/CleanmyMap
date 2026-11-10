import { redirect } from "next/navigation";
import { resolveSafeAuthRedirect } from "@/lib/auth/redirect-url";

type LocalisationOnboardingPageProps = {
  searchParams: Promise<{ next?: string; ref?: string }>;
};

function sanitizeNextPath(nextParam: string | undefined): string {
  const safeNextPath = resolveSafeAuthRedirect(nextParam);
  if (!safeNextPath || safeNextPath.startsWith("/onboarding")) {
    return "/onboarding";
  }
  return safeNextPath;
}

export default async function LocalisationOnboardingPage({
  searchParams,
}: LocalisationOnboardingPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextPath = sanitizeNextPath(resolvedSearchParams.next);
  const referralQuery = resolvedSearchParams.ref?.trim()
    ? `&ref=${encodeURIComponent(resolvedSearchParams.ref.trim())}`
    : "";
  redirect(
    nextPath === "/onboarding"
      ? `/onboarding${referralQuery ? `?${referralQuery.slice(1)}` : ""}`
      : `/onboarding?next=${encodeURIComponent(nextPath)}${referralQuery}`,
  );
}
