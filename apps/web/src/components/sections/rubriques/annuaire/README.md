# Annuaire — seeds éditoriaux et UI

**Statut : CURRENT pour l'emplacement des sources.** Ce README n'est pas une certification de partenaires ni une base de données d'organisations. L'annuaire est un assemblage de données éditoriales et d'interfaces, avec des projections publiques à vérifier selon leur consommateur.

| Source locale | Responsabilité |
|---|---|
| `seed-associations.ts` | Entrées éditoriales d'associations |
| `seed-entreprises.ts` | Entrées éditoriales d'entreprises et commerces |
| `seed-evenements.ts` | Entrées éditoriales d'événements |
| `seed-index.ts` | Assemble les sources, impose des IDs uniques et marque l'origine `editorial_seed` |
| `annuaire-seed-contract.test.ts` | Régression des champs, faits et entrées synthétiques/éditoriales |
| `annuaire-section.tsx` et composants locaux | Composition UI ; la projection publique doit rester bornée |

## Invariants de maintenance

- Le `seed-index.ts` affecte `verificationStatus: "en_cours"` et `qualificationStatus: "contact_non_qualifie"` : **une entrée seed n'est ni un partenariat accepté, ni une activité récente, ni un impact prouvé**.
- Les coordonnées de référents `internalAdminContact` et toute autre information admin ne deviennent pas publiques par simple propagation de l'objet seed. Contrôler les DTO, composants et endpoints consommateurs.
- Ne pas réintroduire les anciens champs qualitatifs non sourcés comme `impactHistory`, `availability` ou `structureStatus` dans les seeds ; le test de contrat en vérifie l'absence.
- Ajouter les nouvelles entrées dans le fichier propriétaire et préserver l'unicité des IDs. Vérifier les URLs et les sources externes au moment de leur mise à jour, sans considérer les anciennes informations comme vérifiées aujourd'hui.
- Ne pas recréer `annuaire-directory-seed.ts` : l'ancien chemin monolithique est retiré. Une migration vers une base n'est pas CURRENT et exige une décision métier/données explicite.

## Validation

Exécuter les tests ciblés de l'annuaire (`annuaire-seed-contract.test.ts`, rendu et navigation concernés), puis le typecheck/lint si les contrats changent. Pour les règles données et droits, consulter `apps/web/src/lib/partners/` et la documentation de sécurité applicable.
