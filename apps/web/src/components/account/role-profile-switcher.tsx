"use client";

import { CmmButton } from "@/components/ui/cmm-button";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import type { GrantedRole } from "@/lib/domain-language";
import { getProfileLabel, getSwitchableProfiles, type AppProfile } from "@/lib/profiles";
import { useActiveRoleMutation } from "./use-active-role-mutation";

type RoleProfileSwitcherProps = {
  locale: "fr" | "en";
  grantedRole: GrantedRole;
  activeRole: AppProfile;
  title: string;
  className?: string;
};

const PROFILE_BUTTON_CLASS =
  "rounded-2xl border border-amber-200/14 bg-[rgba(69,26,3,0.38)] px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-amber-50/70 transition-all hover:-translate-y-1 hover:bg-[rgba(69,26,3,0.54)] hover:text-white";
const ACTIVE_PROFILE_BUTTON_CLASS =
  "rounded-2xl border border-amber-200/30 bg-amber-100/12 px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all hover:-translate-y-1";

export function RoleProfileSwitcher({
  locale,
  grantedRole,
  activeRole,
  title,
  className = "p-8 sm:p-10",
}: RoleProfileSwitcherProps) {
  const switchableProfiles = getSwitchableProfiles(grantedRole);
  const { handleActiveRoleMutation, isUpdatingProfile, profileError } =
    useActiveRoleMutation();

  if (switchableProfiles.length <= 1) {
    return null;
  }

  return (
    <div data-gsap-reveal className="mt-6">
      <FamilyRubriqueCard withTopBar={true} topBarContent={title} className={className}>
        <div className="flex flex-wrap gap-4">
          {switchableProfiles.map((profile) => {
            const isActive = profile === activeRole;

            return (
              <CmmButton
                key={profile}
                tone={isActive ? "primary" : "tertiary"}
                variant="pill"
                disabled={isUpdatingProfile}
                loading={isUpdatingProfile && !isActive}
                onClick={() => void handleActiveRoleMutation(profile)}
                className={isActive ? ACTIVE_PROFILE_BUTTON_CLASS : PROFILE_BUTTON_CLASS}
                ariaLabel={
                  locale === "fr"
                    ? `Utiliser le profil ${getProfileLabel(profile, locale)}`
                    : `Use ${getProfileLabel(profile, locale)} profile`
                }
              >
                {getProfileLabel(profile, locale)}
              </CmmButton>
            );
          })}
        </div>
        {profileError ? (
          <p role="alert" className="mt-4 cmm-text-caption text-rose-200">
            {profileError}
          </p>
        ) : null}
      </FamilyRubriqueCard>
    </div>
  );
}
