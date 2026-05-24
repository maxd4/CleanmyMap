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
 <main className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center px-4 py-8">
 <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
  <div className="absolute -left-16 top-10 h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl" />
  <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-amber-400/8 blur-3xl" />
 </div>
 <div className="relative w-full rounded-[2.75rem] border border-indigo-200/60 bg-white/82 p-4 shadow-[0_30px_80px_-50px_rgba(79,70,229,0.35)] backdrop-blur-2xl sm:p-6">
  <AccountSetupForm
   nextPath={nextPath}
   initialProfile={profile}
   initialArrondissement={existingPreference?.arrondissement ?? null}
   initialLocationType={existingPreference?.locationType ?? null}
  />
 </div>
</main>
 );
}
