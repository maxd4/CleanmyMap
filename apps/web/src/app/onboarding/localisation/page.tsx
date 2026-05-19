import { redirect } from"next/navigation";
import { AccountSetupForm } from"@/components/account/account-setup-form";
import { getCurrentUserLocationPreference } from"@/lib/auth/user-location";
import { getCurrentUserRoleLabel } from"@/lib/authz";
import { toProfile } from"@/lib/profiles";
import { getSafeAuthSession } from"@/lib/auth/safe-session";

type LocalisationOnboardingPageProps = {
 searchParams: Promise<{ next?: string }>;
};

function sanitizeNextPath(nextParam: string | undefined): string {
 if (!nextParam) {
 return"/profil";
 }
 if (!nextParam.startsWith("/") || nextParam.startsWith("//")) {
 return"/profil";
 }
 if (nextParam.startsWith("/onboarding/localisation")) {
 return"/profil";
 }
 return nextParam;
}

export default async function LocalisationOnboardingPage({
 searchParams,
}: LocalisationOnboardingPageProps) {
 const { userId } = await getSafeAuthSession();
 if (!userId) {
  redirect("/sign-in");
 }

const [existingPreference, role] = await Promise.all([
    getCurrentUserLocationPreference(),
    getCurrentUserRoleLabel(),
  ]);
  const profile = toProfile(role);
 const resolvedSearchParams = await searchParams;
 const nextPath = sanitizeNextPath(resolvedSearchParams.next);

 return (
 <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center px-4 py-8">
 <AccountSetupForm
  nextPath={nextPath}
  initialProfile={profile}
  initialArrondissement={existingPreference?.arrondissement ?? null}
  initialLocationType={existingPreference?.locationType ?? null}
 />
 </main>
 );
}
