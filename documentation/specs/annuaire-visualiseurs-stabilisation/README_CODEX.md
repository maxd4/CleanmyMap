# Raccordement plogging et mégots : complément des visualiseurs

**Statut : CANDIDATE.** Référence factuelle : `cbff380b786c52d3a322168f4c09b26bb222dd79`. EXTEND_EXISTING. Ne pas imposer un checkout historique. Les patches 09/10/11 portent déjà CKFD, MéGO!, Carton Plein Cyclo, Les Runners Laveurs, les limites ALCOME et les relations sourcées. Le [plan parisien](../../plans/plogging-et-filiere-megots-paris.md) reste PLAN ; ni accord ni filière opérationnelle acquis.

## Contrat

Le [patch 12](12-plogging-megots-fiches-orientation.patch) complète les identités éditoriales, les références explicites et le parcours existant. Les quatre ressources sont des seeds non qualifiés, jamais des published_partner. Carton Plein Cyclo est distinct de l'association Carton Plein (asso-3). Pas de coordonnées ni d'arrondissements fictifs. Réutiliser le panneau Limites de 09 uniquement avec ID éditorial canonique égal à annuaireEntryId ; aucun transfert par nom, ni contact privé. Le parcours cigarette réutilise DPE, ALCOME, sites municipaux, CKFD et Carton Plein Cyclo ; MéGO! demeure l'aval annoncé, non un point de dépôt. Aucun nouveau filtre, registre, migration, droit ou relation de prospection. Les run clubs uniquement prospectés, devis, propositions et accords privés restent hors runtime public. Le plogging est indépendant de la filière mégots.

## Sources publiques complémentaires (25 novembre 2026)

- CKFD : [offre mégots](https://www.ckfd.fr/recyclage-dechets/megot-de-cigarette), [mentions légales](https://www.ckfd.fr/mentions-legales), [identité](https://www.pappers.fr/entreprise/ckfd-environnement-498485416).
- MéGO! : [offre](https://www.me-go.fr/contact/), [identité](https://www.pappers.fr/entreprise/mego-828153718).
- Carton Plein : [services professionnels](https://cartonplein.org/nos-services-cyclologistique/), [collecte](https://cartonplein.org/nos-services-cyclologistique/collecte-de-dechets-a-paris-et-en-proche-banlieue/), [filiale](https://www.pappers.fr/entreprise/carton-plein-cyclo-978296325), [équipe](https://cartonplein.org/association/notre-equipe/).
- Les Runners Laveurs : [Fondation de la Mer](https://www.fondationdelamer.org/nos-programmes/un-geste-pour-la-mer/associations/les-runners-laveurs/), [plogging 20 km de Paris](https://www.fondationdelamer.org/agenda/plogging-avec-les-20k-de-paris/), [annuaire officiel](https://annuaire-entreprises.data.gouv.fr/entreprise/les-runners-laveurs-923727572), [HelloAsso](https://www.helloasso.com/associations/les-runners-laveurs).
- ALCOME : [FAQ](https://alcome.eco/faq-3/) et [soutiens](https://alcome.eco/nos-soutiens/). Seuil de massification, pas droit de dépôt ni seuil annuel. Petits volumes à négocier, non offre attestée.

## Preuves et intégration restante

Les 13 chemins cibles et leurs hunks ont été reconstruits et rejoués textuellement sur les sources GitHub et les états cibles de 10 pour les fichiers concernés. Les hunks documentaires partent des sources publiées ; adapter le contexte après 11. Contrôle textuel uniquement. Checkout inaccessible (git ls-remote : résolution DNS impossible). HOOK_NOT_AVAILABLE ; Vitest, TypeScript, ESLint, Playwright NOT_RUN ; couverture NOT_MEASURED. Aucun runtime ou DB modifié.

Depuis le checkout courant, intégrer les candidats publics 09/10/11 et leurs dépendances publiques si non intégrés ; puis adapter/appliquer 12 avec git apply --check. Ne pas réappliquer les modifications acquises. Pas de lot privé 03/04 ni de migration. Exécuter les tests ciblés de seeds, registre 3D, organisation/needs 2D, liens croisés, contexte public et drawer ; rechercher attentes de comptage et fixtures dépendantes. Vérifier rendu des quatre fiches et parcours mégots sur les 20 arrondissements, navigation clavier et repli WebGL selon les lots précédents. Mesurer couverture ciblée. Intégrer les contrats CURRENT et la fiche de route dans le même lot que le runtime. Préserver les modifications concurrentes ; vérifier carte sans marqueurs inconnus, pas de relation prospective, pas de fusion de fiches par nom. Retirer les candidats consommés uniquement après validation.

**STOP CONDITION :** quatre identités uniques et raccordées, limites sourcées visibles dans les fiches, orientation petits volumes correcte dans tous les arrondissements, tests exécutés et preuve de rendu, contrats à jour et publication fast-forward vérifiée. Aucun développement de gestion des tournées ou dépôt sans preuves terrain.
