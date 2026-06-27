import type { AppProfile } from "./profiles";

export type AccountBadge = {
  id: string;
  label: string;
  icon: string;
};

const BADGE_CATALOG: Record<string, AccountBadge> = {
  admin: { id: "admin", label: "Administrateur", icon: "shield" },
  role_admin: { id: "role_admin", label: "Administration", icon: "crown" },
  role_benevole: { id: "role_benevole", label: "Bénévole", icon: "users" },
  role_coordinateur: { id: "role_coordinateur", label: "Coordination", icon: "target" },
  role_scientifique: { id: "role_scientifique", label: "Scientifique", icon: "sparkles" },
  role_entreprise: { id: "role_entreprise", label: "Entreprise", icon: "building-2" },
  role_elu: { id: "role_elu", label: "Elu", icon: "badge-check" },
  role_max: { id: "role_max", label: "IMU", icon: "shield-check" },
  profile_admin: { id: "profile_admin", label: "Profil administration", icon: "shield" },
  profile_benevole: { id: "profile_benevole", label: "Profil bénévole", icon: "users" },
  profile_coordinateur: { id: "profile_coordinateur", label: "Profil coordination", icon: "target" },
  profile_scientifique: { id: "profile_scientifique", label: "Profil scientifique", icon: "sparkles" },
  profile_entreprise: { id: "profile_entreprise", label: "Profil Entreprise", icon: "building-2" },
  profile_elu: { id: "profile_elu", label: "Profil Elu", icon: "badge-check" },
  profile_max: { id: "profile_max", label: "Profil IMU", icon: "shield-check" },
  pioneer: { id: "pioneer", label: "Pionnier", icon: "zap" },
  mentor: { id: "mentor", label: "Mentor", icon: "award" },
  cleanwalk_10: { id: "cleanwalk_10", label: "10 cleanwalks", icon: "medal" },
  cleanwalk_50: { id: "cleanwalk_50", label: "50 cleanwalks", icon: "trophy" },
  impact_100kg: { id: "impact_100kg", label: "100 kg collectes", icon: "droplets" },
};

export function getRoleBadgeId(profile: AppProfile): string {
  return `role_${profile}`;
}

export function getProfileBadgeId(profile: AppProfile): string {
  return `profile_${profile}`;
}

export function mapBadgeIdsToBadges(ids: string[]): AccountBadge[] {
  const deduped = Array.from(new Set(ids));
  return deduped
    .map((id) => BADGE_CATALOG[id] ?? { id, label: id.replace(/_/g, " "), icon: "BAD" })
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export function getRoleBadge(profile: AppProfile): AccountBadge {
  return mapBadgeIdsToBadges([getRoleBadgeId(profile)])[0];
}

export function getProfileBadge(profile: AppProfile): AccountBadge {
  return mapBadgeIdsToBadges([getProfileBadgeId(profile)])[0];
}
