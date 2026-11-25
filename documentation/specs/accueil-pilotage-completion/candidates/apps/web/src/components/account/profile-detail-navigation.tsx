"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PROFILE_DETAIL_TABS, profileDetailTabHref, type ProfileDetailTab } from "@/lib/account/profile-tabs";
import { tabStripClassName, tabItemClassName } from "@/components/ui/cmm-tab-strip.styles";

const labels = { summary: "Ma progression", badges: "Badges et distinctions", referrals: "Parrainage", account: "Compte et rôles" } as const;

export function ProfileDetailNavigation({ profile, activeTab }: { profile: string; activeTab: ProfileDetailTab }) {
  const router = useRouter();
  useEffect(() => {
    function syncLegacyAnchor() {
      if (window.location.hash === "#parrainage" && !new URLSearchParams(window.location.search).has("tab") && activeTab !== "referrals") {
        router.replace(profileDetailTabHref(profile, "referrals"));
      }
    }
    syncLegacyAnchor();
    window.addEventListener("hashchange", syncLegacyAnchor);
    return () => window.removeEventListener("hashchange", syncLegacyAnchor);
  }, [profile, activeTab, router]);
  return <nav aria-label="Navigation du profil" className={tabStripClassName("family","grid-cols-2 lg:grid-cols-4")}>
    {PROFILE_DETAIL_TABS.map(tab => <Link key={tab} href={profileDetailTabHref(profile,tab)} prefetch={false} aria-current={activeTab === tab ? "page" : undefined} className={tabItemClassName("family", activeTab === tab)}>{labels[tab]}</Link>)}
  </nav>;
}
