# `SECURITY_GUIDE.md` — façade de compatibilité

> **Statut : `COMPATIBILITY`**

Ce chemin historique est conservé pour les liens existants. L'index canonique
est [`README.md`](./README.md) ; ce guide ne duplique pas la doctrine ni les
contrats spécialisés.

## Orientation

- Doctrine transverse actuelle : [`SECURITY.md`](./SECURITY.md).
- AuthN/AuthZ actuel : [`authz-authn-regles.md`](./authz-authn-regles.md).
- Modèle AuthZ cible : [`authorization-capabilities.md`](./authorization-capabilities.md), explicitement `PLAN / TARGET`.
- Revue humaine : [`CODE_REVIEW_CHECKLIST.md`](./CODE_REVIEW_CHECKLIST.md).
- Avant merge : [`PRE_MERGE_CHECKLIST.md`](./PRE_MERGE_CHECKLIST.md).
- Rappels opérationnels : [`SECURITY_QUICK_REFERENCE.md`](./SECURITY_QUICK_REFERENCE.md).

## Contrats spécialisés

Consulter directement [`url-validation-security.md`](./url-validation-security.md),
[`regex-security.md`](./regex-security.md),
[`dom-xss-prevention.md`](./dom-xss-prevention.md),
[`RATE_LIMITING.md`](./RATE_LIMITING.md) ou
[`admin-operation-audit.md`](./admin-operation-audit.md) selon la surface.

Les contrôles généraux de développement sont maintenus dans
[`documentation/development/`](../development/) et ne sont pas recopiés ici.
