import { CmmButton } from "@/components/ui/cmm-button";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import { buildProfileRoute } from "@/lib/accueil-pilotage-routes";
import {
  getProfileLabel,
  type AppProfile,
} from "@/lib/profiles";

type DashboardProfileSwitcherProps = {
  locale: "fr" | "en";
  profile: AppProfile;
  isAdmin: boolean;
  switchableProfiles: AppProfile[];
};

export function DashboardProfileSwitcher({
  locale,
  profile,
  isAdmin,
  switchableProfiles,
}: DashboardProfileSwitcherProps) {
  if (switchableProfiles.length <= 1) {
    return null;
  }

  return (
    <div data-gsap-reveal className="mt-6">
      <FamilyRubriqueCard
        withTopBar={true}
        topBarContent={
          isAdmin
            ? locale === "fr"
              ? "Switch de profil (Admin)"
              : "Profile switch (Admin)"
            : locale === "fr"
              ? "Identité active"
              : "Active identity"
        }
        className="p-8 sm:p-10"
      >
        <div className="flex flex-wrap gap-4">
          {switchableProfiles.map((switchableProfile) => (
            <CmmButton
              key={switchableProfile}
              href={buildProfileRoute(switchableProfile)}
              tone={switchableProfile === profile ? "primary" : "tertiary"}
              variant="pill"
              className={
                switchableProfile === profile
                  ? "rounded-2xl border border-amber-200/30 bg-amber-100/12 px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all hover:-translate-y-1"
                  : "rounded-2xl border border-amber-200/14 bg-[rgba(69,26,3,0.38)] px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-amber-50/70 transition-all hover:-translate-y-1 hover:bg-[rgba(69,26,3,0.54)] hover:text-white"
              }
            >
              {getProfileLabel(switchableProfile, locale)}
            </CmmButton>
          ))}
        </div>
      </FamilyRubriqueCard>
    </div>
  );
}
