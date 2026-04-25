 "use client";

import { IdentityBadge } from "@/components/ui/identity-badge";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

const MODE_BADGES = [
  { id: "mode_exhaustif", label: "Mode exhaustif", icon: "sparkles" },
  { id: "mode_sobre", label: "Mode sobre", icon: "leaf" },
  { id: "mode_minimaliste", label: "Mode simplifié", icon: "sliders-horizontal" },
] as const;

const ROLE_BADGES = [
  { id: "role_benevole", label: "Bénévole", icon: "users" },
  { id: "role_coordinateur", label: "Coordination", icon: "target" },
  { id: "role_scientifique", label: "Scientifique", icon: "sparkles" },
  { id: "role_elu", label: "Autorité locale", icon: "badge-check" },
  { id: "role_admin", label: "Administration", icon: "shield" },
] as const;

const PROFILE_BADGES = [
  { id: "profile_benevole", label: "Profil bénévole", icon: "users" },
  { id: "profile_coordinateur", label: "Profil coordination", icon: "target" },
  { id: "profile_scientifique", label: "Profil scientifique", icon: "sparkles" },
  { id: "profile_elu", label: "Profil autorité locale", icon: "badge-check" },
  { id: "profile_admin", label: "Profil administration", icon: "shield" },
] as const;

export function DiscussionBadgesPanel() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        {fr ? "Badges d'interaction : mode, rôle et profil" : "Interaction badges: mode, role and profile"}
      </p>
      <p className="mt-1 text-xs text-slate-600">
        {fr
          ? "Ces badges aident à adapter le ton : coordination factuelle pour les équipes de terrain, synthèse pour les décideur·euse·s, détail technique pour les profils scientifiques, et modération explicite pour l'administration."
          : "These badges help adapt the tone: factual coordination for field teams, concise summaries for decision-makers, technical detail for scientific profiles, and explicit moderation for administration."}
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
