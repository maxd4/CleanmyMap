import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserLocationOnboardingForm } from "@/components/account/user-location-onboarding-form";
import { getCurrentUserLocationPreference } from "@/lib/auth/user-location";

type LocalisationOnboardingPageProps = {
  searchParams: Promise<{ next?: string }>;
};

function sanitizeNextPath(nextParam: string | undefined): string {
  if (!nextParam) {
    return "/profil";
  }
  if (!nextParam.startsWith("/") || nextParam.startsWith("//")) {
    return "/profil";
  }
  if (nextParam.startsWith("/onboarding/localisation")) {
    return "/profil";
  }
  return nextParam;
}

export default async function LocalisationOnboardingPage({
  searchParams,
}: LocalisationOnboardingPageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const existingPreference = await getCurrentUserLocationPreference();
  const resolvedSearchParams = await searchParams;
  const nextPath = sanitizeNextPath(resolvedSearchParams.next);

  if (existingPreference) {
    redirect(nextPath);
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl items-center px-4 py-8">
      <UserLocationOnboardingForm nextPath={nextPath} />
    </main>
  );
}
