const MODE_BADGES = [
  { id: "mode_exhaustif", label: "Mode exhaustif", icon: "MEX" },
  { id: "mode_sobre", label: "Mode sobre", icon: "MSO" },
  { id: "mode_simplifie", label: "Mode simplifie", icon: "MSI" },
] as const;

const ROLE_BADGES = [
  { id: "role_benevole", label: "Role benevole", icon: "RBV" },
  { id: "role_coordinateur", label: "Role coordinateur", icon: "RCO" },
  { id: "role_scientifique", label: "Role scientifique", icon: "RSC" },
  { id: "role_elu", label: "Role elu", icon: "REL" },
  { id: "role_admin", label: "Role admin", icon: "RAD" },
] as const;

const PROFILE_BADGES = [
  { id: "profile_benevole", label: "Profil benevole", icon: "PBV" },
  { id: "profile_coordinateur", label: "Profil coordinateur", icon: "PCO" },
  { id: "profile_scientifique", label: "Profil scientifique", icon: "PSC" },
  { id: "profile_elu", label: "Profil elu", icon: "PEL" },
  { id: "profile_admin", label: "Profil admin", icon: "PAD" },
] as const;

export function DiscussionBadgesPanel() {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        Badges d&apos;interaction: mode, role, profil
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Ces badges aident a adapter le ton: coordination factuelle avec les
        coordinateurs, synthese avec les elus, detail technique avec les
        scientifiques, et moderation explicite avec les admins.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {MODE_BADGES.map((badge) => (
          <IdentityBadge
            key={badge.id}
            icon={badge.icon}
            label={badge.label}
            tone="mode"
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {ROLE_BADGES.map((badge) => (
          <IdentityBadge
            key={badge.id}
            icon={badge.icon}
            label={badge.label}
            tone="role"
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {PROFILE_BADGES.map((badge) => (
          <IdentityBadge
            key={badge.id}
            icon={badge.icon}
            label={badge.label}
            tone="profile"
          />
        ))}
      </div>
    </div>
  );
}
import { IdentityBadge } from "@/components/ui/identity-badge";

