"use client";

import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
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
  appearance?: "family" | "neutral";
};

const PROFILE_BUTTON_CLASS =
  "rounded-2xl border border-amber-200/20 bg-[rgba(69,26,3,0.38)] px-8 py-4 cmm-text-small font-black uppercase tracking-[0.12em] text-amber-50/90 transition-all hover:-translate-y-1 hover:bg-[rgba(69,26,3,0.54)] hover:text-white";
const ACTIVE_PROFILE_BUTTON_CLASS =
  "rounded-2xl border border-amber-200/30 bg-amber-100/12 px-8 py-4 cmm-text-small font-black uppercase tracking-[0.12em] text-white shadow-2xl transition-all hover:-translate-y-1";

export function RoleProfileSwitcher({
  locale,
  grantedRole,
  activeRole,
  title,
  className = "p-8 sm:p-10",
  appearance = "family",
}: RoleProfileSwitcherProps) {
  const switchableProfiles = getSwitchableProfiles(grantedRole);
  const { handleActiveRoleMutation, isUpdatingProfile, profileError } =
    useActiveRoleMutation();

  if (switchableProfiles.length <= 1) {
    return null;
  }

  const neutral = appearance === "neutral";
  const controls = (
    <>
        <div className="flex flex-wrap gap-3">
          {switchableProfiles.map((profile) => {
            const isActive = profile === activeRole;

            return (
              <CmmButton
                key={profile}
                tone={isActive ? "primary" : neutral ? "secondary" : "tertiary"}
                variant="pill"
                disabled={isUpdatingProfile}
                loading={isUpdatingProfile && !isActive}
                onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ handleActiveRoleMutation(profile); }}
                className={neutral ? undefined : isActive ? ACTIVE_PROFILE_BUTTON_CLASS : PROFILE_BUTTON_CLASS}
                ariaPressed={neutral ? isActive : undefined}
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
          <p role="alert" className={neutral ? "mt-4 cmm-text-small cmm-text-danger" : "mt-4 cmm-text-small text-rose-200"}>
            {profileError}
          </p>
        ) : null}
    </>
  );

  if (neutral) return (
    <CmmCard className="space-y-3">
      <h3 className="text-lg font-bold cmm-text-primary">{title}</h3>
      {controls}
    </CmmCard>
  );

  return (
    <div data-gsap-reveal className="mt-6">
      <FamilyRubriqueCard withTopBar={true} topBarContent={title} className={className}>
        {controls}
      </FamilyRubriqueCard>
    </div>
  );
}
