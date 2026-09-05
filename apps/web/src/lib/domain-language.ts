/**
 * Vocabulaire metier canonique de la plateforme.
 *
 * Objectif:
 * - Aligner les termes utilises dans la navigation, les pages et les droits.
 * - Eviter les glissements de sens entre "role", "parcours", "rubrique" et "page".
 */

// Rôles ouverts, sélectionnables par tous les comptes authentifiés.
export type OpenRole =
  | "benevole"
  | "coordinateur"
  | "scientifique"
  | "entreprise";

// Niveau de privilège obtenu. Cette valeur est l'autorité persistée côté
// serveur et ne doit jamais être remplacée par le rôle actif.
export type GrantedRole =
  | OpenRole
  | "elu"
  | "admin"
  | "max";

// Rôle actuellement utilisé pour calculer les capabilities effectives.
export type ActiveRole = GrantedRole;

// Alias public historique : `role` signifie désormais GRANTED_ROLE.
export type Role = GrantedRole;

// Role de session (inclut l'etat non connecte).
export type SessionRole = Role | "anonymous";

// Parcours produit: lens de navigation appliquee a un role.
export type Parcours = ActiveRole;

// Espace stable de navigation transverse.
export type Espace = "execute" | "supervise" | "decide" | "prepare";

// Route applicative explicite.
export type PageRoute = `/${string}`;

// Nature de rubrique dans le produit.
export type RubriqueKind = "app-route" | "section";

// Slot CTA principal/secondaire (et complementaire).
export type CtaSlot = "primary" | "secondary" | "additional";

export type EffectiveAccess = {
  canAccessProtectedApp: boolean;
  canAccessAdminPage: boolean;
  canAccessPilotage: boolean;
  canModerate: boolean;
  canImportActions: boolean;
  canExportActionsCsvJson: boolean;
  canExportCommunityFunnelCsv: boolean;
  canExportElusDossier: boolean;
  canRunSandboxChecksWithoutAuth: boolean;
};

export const DOMAIN_GLOSSARY: Record<
  | "role"
  | "parcours"
  | "espace"
  | "rubrique"
  | "page"
  | "cta_primary"
  | "cta_secondary"
  | "effective_access",
  string
> = {
  role: "Attribution metier d'un utilisateur (benevole, coordinateur, scientifique, entreprise, elu, admin, max / IMU).",
  parcours:
    "Projection UX du role dans la navigation, sans dupliquer les pages.",
  espace:
    "Bloc stable de navigation transverse (Accueil & Pilotage, Agir, Cartographie & Impact, Réseau & Discussions, Apprendre).",
  rubrique: "Entree de navigation rattachee a un espace et a une route.",
  page: "Route applicative rendue (app-route) ou section rendue via /sections/[sectionId].",
  cta_primary: "Action principale affichee pour le parcours courant.",
  cta_secondary: "Action secondaire affichee a cote du CTA principal.",
  effective_access:
    "Droits reels observes dans le code (middleware + checks de role/API).",
};

/**
 * Droits effectifs observes dans le code actuel.
 * Attention: ce mapping decrit l'etat reel d'implementation, pas l'intention produit cible.
 */
export function getEffectiveAccessForSessionRole(
  activeRole: SessionRole,
): EffectiveAccess {
  const isAuthenticated = activeRole !== "anonymous";
  const isAdmin = activeRole === "admin" || activeRole === "max";
  const canAccessPilotage = activeRole === "coordinateur" || isAdmin;
  const canModerate = activeRole === "elu" || isAdmin;

  return {
    canAccessProtectedApp: isAuthenticated,
    canAccessAdminPage: isAdmin,
    canAccessPilotage,
    canModerate,
    canImportActions: isAdmin,
    canExportActionsCsvJson: isAdmin,
    canExportCommunityFunnelCsv: isAdmin,
    // /api/reports/elus-dossier est accessible a tout utilisateur authentifie.
    canExportElusDossier: isAuthenticated,
    // API de runbook interne reservee aux admins.
    canRunSandboxChecksWithoutAuth: false,
  };
}

export function isAdminLikeRole(role: SessionRole): boolean {
  return role === "admin" || role === "max";
}
