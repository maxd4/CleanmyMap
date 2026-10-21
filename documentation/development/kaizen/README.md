# Kaizen : index opérationnel

Statut : `CURRENT` (processus), non source de contrats métier et non autorisation d'élargir un lot.

| Besoin | Source propriétaire |
|---|---|
| Critères d'opportunité, limites, priorités | [`PRINCIPLES.md`](./PRINCIPLES.md) |
| Méthode d'audit ciblé et preuve | [`AUDIT_METHOD.md`](./AUDIT_METHOD.md) |
| Contre-exemples et arbitrages | [`EXAMPLES.md`](./EXAMPLES.md) |
| Trame d'audit | [`templates/TEMPLATE-AUDIT.md`](./templates/TEMPLATE-AUDIT.md) |
| Preuves historiques | [`audits/`](./audits/) (AUDIT / HISTORY) |

Contrat de sélection : `problème observé` → `owner` → `invariant` → `preuve` → `correction bornée` → `validation` → `STOP CONDITION`. Un audit dédié limite la sélection à trois actions prioritaires selon la méthode canonique. Pendant un chantier, n'intégrer que les améliorations nécessaires au périmètre courant ; ne jamais transformer une dette périphérique en extension implicite.

**État des audits** : `working` = en cours ; `closed` = actions closes ou abandonnées ; `historical` = trace sans validité CURRENT. Aucun ancien prompt, métrique, estimation ou recommandation n'est exécutable sans relecture du code et des tests présents.

Sources de priorité : gouvernance racine, [`../TESTING.md`](../TESTING.md), [`../DOCUMENTATION_POLICY.md`](../DOCUMENTATION_POLICY.md), contrats du domaine et, pour l'UI, [`../../design-system/README.md`](../../design-system/README.md). Les fichiers du présent dossier ne sont pas une gouvernance alternative.
