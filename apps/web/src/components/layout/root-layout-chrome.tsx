import { AppNavigationRibbon } from "@/components/navigation/app-navigation-ribbon";
import { DeferredGlobalChrome } from "@/components/layout/deferred-global-chrome";
import { getCurrentUserIdentity } from "@/lib/authz";

export async function RootLayoutChrome() {
  const identity = await getCurrentUserIdentity().catch(() => null);

  return (
    <>
      <DeferredGlobalChrome />
      <AppNavigationRibbon identity={identity} />
    </>
  );
}
