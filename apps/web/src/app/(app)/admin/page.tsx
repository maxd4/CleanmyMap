import type { Metadata } from "next";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { AdminAccessState } from "@/components/ui/admin-access-state";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import {
  isAdminLikeProfile,
  toProfile,
} from "@/lib/profiles";
import { getServerLocale } from "@/lib/server-preferences";
import { loadAdminSources } from "@/lib/admin/admin-dashboard-contract";
import {
  parseAdminModerationParam,
} from "@/components/reports/admin-workflow/helpers";
import { AdminPageContent } from "./admin-page-content";

export const metadata: Metadata = {
  title: "Administration",
  description:
    "Back-office du site pour gérer les utilisateurs, la modération et les demandes.",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const moderationPreset = parseAdminModerationParam(resolvedSearchParams?.moderation);
  const { userId, clerkReachable } = await getSafeAuthSession();
  const locale = await getServerLocale();

  if (!clerkReachable) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(255,249,243,0.98)_0%,_rgba(246,239,228,0.96)_48%,_rgba(238,231,219,0.98)_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-center">
          <AdminAccessState className="w-full" authUnavailable />
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(255,249,243,0.98)_0%,_rgba(246,239,228,0.96)_48%,_rgba(238,231,219,0.98)_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-center">
          <AdminAccessState className="w-full" />
        </div>
      </div>
    );
  }

  const accountCompletion = await loadAccountCompletionGateState({
    userId,
    clerkReachable,
  }).catch(() => null);

  const identity = await getCurrentUserIdentity().catch(() => null);
  const role = identity?.activeRole ?? "benevole";
  const grantedRole = identity?.role ?? "benevole";
  const profile = toProfile(role);

  if (!isAdminLikeProfile(profile)) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(255,249,243,0.98)_0%,_rgba(246,239,228,0.96)_48%,_rgba(238,231,219,0.98)_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-center">
          <AdminAccessState className="w-full" />
        </div>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(255,249,243,0.98)_0%,_rgba(246,239,228,0.96)_48%,_rgba(238,231,219,0.98)_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-center"><AdminAccessState className="w-full" /></div>
      </div>
    );
  }

  const adminSources = await loadAdminSources();

  return (
    <AccountCompletionGate state={accountCompletion}>
      <AdminPageContent
        adminSources={adminSources}
        identity={identity}
        profile={profile}
        role={role}
        grantedRole={grantedRole}
        locale={locale}
        moderationPreset={moderationPreset}
      />
    </AccountCompletionGate>
  );
}
