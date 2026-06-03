import { redirect } from "next/navigation";

type LocalisationOnboardingPageProps = {
  searchParams: Promise<{ next?: string; ref?: string }>;
};

function sanitizeNextPath(nextParam: string | undefined): string {
  if (!nextParam) {
    return "/onboarding";
  }
  if (!nextParam.startsWith("/") || nextParam.startsWith("//")) {
    return "/onboarding";
  }
  if (nextParam.startsWith("/onboarding/localisation")) {
    return "/onboarding";
  }
  return nextParam;
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
