import { RoleProfileSwitcher } from "@/components/account/role-profile-switcher";
import type { GrantedRole } from "@/lib/domain-language";
import type { AppProfile } from "@/lib/profiles";

type DashboardProfileSwitcherProps = {
  locale: "fr" | "en";
  activeRole: AppProfile;
  grantedRole: GrantedRole;
};

export function DashboardProfileSwitcher({
  locale,
  activeRole,
  grantedRole,
}: DashboardProfileSwitcherProps) {
  const title =
    grantedRole === "admin" || grantedRole === "max"
      ? locale === "fr"
        ? "Switch de profil (Admin)"
        : "Profile switch (Admin)"
      : locale === "fr"
        ? "Identité active"
        : "Active identity";

  return (
    <RoleProfileSwitcher
      locale={locale}
      grantedRole={grantedRole}
      activeRole={activeRole}
      title={title}
    />
  );
}
