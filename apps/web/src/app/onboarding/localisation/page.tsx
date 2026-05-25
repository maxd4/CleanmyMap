import { redirect } from "next/navigation";

type LocalisationOnboardingPageProps = {
  searchParams: Promise<{ next?: string }>;
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
  redirect(nextPath === "/onboarding" ? "/onboarding" : `/onboarding?next=${encodeURIComponent(nextPath)}`);
}
