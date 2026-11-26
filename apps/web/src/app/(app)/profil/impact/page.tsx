import ImpactProfilePage from "@/components/profil/impact-profile-page";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getCurrentUserIdentity } from "@/lib/authz";

export default async function ImpactPage() {
  const session = await getSafeAuthSession();
  const identity = session.userId ? await getCurrentUserIdentity({ userId: session.userId }).catch(() => null) : null;
  const cardIdentity = identity ? {
    userId: identity.userId, displayName: identity.displayName, firstName: identity.firstName,
    handle: identity.handle, username: identity.username, activeRole: identity.activeRole,
  } : null;
  return <ImpactProfilePage key={cardIdentity?.userId ?? "anonymous"} identity={cardIdentity}
    authUnavailable={session.state === "unavailable" || Boolean(session.userId && !identity)} />;
}
