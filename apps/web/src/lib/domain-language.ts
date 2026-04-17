/**
 * Vocabulaire metier canonique de la plateforme.
 *
 * Objectif:
 * - Aligner les termes utilises dans la navigation, les pages et les droits.
 * - Eviter les glissements de sens entre "role", "parcours", "rubrique" et "page".
 */

// Role metier attribue a un utilisateur authentifie.
export type Role =
  | "benevole"
  | "coordinateur"
  | "scientifique"
  | "elu"
  | "admin";

// Role de session (inclut l'etat non connecte).
export type SessionRole = Role | "anonymous";

// Parcours produit: lens de navigation appliquee a un role.
export type Parcours = Role;

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
  role: "Attribution metier d'un utilisateur (benevole, coordinateur, scientifique, elu, admin).",
  parcours:
    "Projection UX du role dans la navigation, sans dupliquer les pages.",
  espace:
    "Groupe stable de navigation transverse (Executer, Superviser, Decider, Preparer).",
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
  role: SessionRole,
): EffectiveAccess {
  const isAuthenticated = role !== "anonymous";
  const isAdmin = role === "admin";

  return {
    canAccessProtectedApp: isAuthenticated,
    canAccessAdminPage: isAdmin,
    canModerate: isAdmin,
    canImportActions: isAdmin,
    canExportActionsCsvJson: isAdmin,
    canExportCommunityFunnelCsv: isAdmin,
    // /api/reports/elus-dossier est accessible a tout utilisateur authentifie.
    canExportElusDossier: isAuthenticated,
    // /api/sandbox/runbook-checks est reserve aux admins.
    canRunSandboxChecksWithoutAuth: false,
  };
}
