# Refonte Vulgarisation : candidat d'intégration Web

**Statut : PLAN / CANDIDATE.** Patch temporaire, aucun runtime intégré ni déployé.

Base de lecture GitHub : `a7fb3775a08fe853b6a77af1967c8af2d4e26e2e`. Ce n'est pas un checkout imposé. Le candidat est publié ici sous forme de diff Git, contrôlé contre le main `1f2fa1f083eb7d5d092f9a8b9846e977d4fc327c` : les 23 blobs préexistants correspondent aux bases attendues et les deux nouveaux chemins étaient absents. Le manifeste enregistre les empreintes avant/après. Conserver toute modification concurrente.

## Application depuis le checkout courant

Consulter [01-vulgarisation.patch](./01-vulgarisation.patch) et [MANIFEST.json](./MANIFEST.json). Vérifier les 25 chemins cibles et les changements dirty/staged des autres writers avant toute écriture. Depuis la racine du dépôt :

```sh
git apply --check documentation/specs/vulgarisation-ui/01-vulgarisation.patch
git apply documentation/specs/vulgarisation-ui/01-vulgarisation.patch
```

Si le contrôle échoue ou si un chemin attribué est dirty, ne pas forcer ni écraser ; rapprocher uniquement les hunks compatibles selon AGENTS. Le patch reprend les 17 fichiers complets et les 8 transformations ciblées du candidat initial, dont deux changements documentaires. Ne pas publier les documents CURRENT avant l'intégration validée. Le dossier spec temporaire ne constitue pas un deuxième owner et doit être retiré après consommation vérifiée.

## Périmètre et décisions

- Six panneaux accessibles au clavier, Repères par défaut. Panneaux montés et masqués pour maintenir leurs états ; pas de nouvelle route, persistance, API ou dépendance.
- Réduction de la hero et suppression de l'illustration factice, remplacement par un schéma de lecture scientifique. Suppression du faux progrès, des répétitions et des hauteurs fixes des six modules différés. Quiz inchangé.
- Les deux calculateurs existants restent les owners de leurs calculs. Les mesures, proxys et résultats modélisés ne sont pas assimilés.
- GIEC : quatre fiches AR6, résultats corrigés, datés et liens vers les sources primaires. Limites planétaires : Planetary Health Check 2026 ; représentation catégorielle et non faux radar quantitatif. ODD : correction des classes de couleur interprétées à tort comme valeurs CSS ; cibles et indicateurs existants conservés. Les contenus détaillés historiques en français sont explicitement étiquetés dans l'interface anglaise.
- Politiques publiques : données publiques existantes seulement, compte documentaire réel, filtres conditionnels, périmètre Monde/France et archives conservés. Les fiches non validées ne sont pas publiées, les comptes documentaires ne sont pas un classement politique.
- Art : galerie à partir des ressources existantes, images, légendes et sources ; ouverture par défaut seulement dans Vulgarisation. Les autres consommateurs conservent l'état fermé par défaut.
- Famille Apprendre : palette canonique `#A64B08`, `#92400E`, `#FFF9D6`, `#FFE5B6`, `#9A3412`, `#3D2A16`. Canvas neutre conservé. Aucun changement dans les autres familles.

## Vérifications et clôture

Prévalidation locale : transpilation syntaxique de 17 TS/TSX sans erreur ; compilation syntaxique du script Python ; contraste calculé du primaire sur blanc 5,78:1, sur surface claire 5,45:1, sur surface teintée 4,72:1. Pas de typecheck complet, de test Vitest, de navigateur, de build, de mesure de couverture ou de preuve déployée. Le checkout et les dépendances réels sont nécessaires. Contrôles complémentaires de publication du candidat : CRC de l'archive, encodage UTF-8, recherche ciblée de secrets, comparaison des blobs attendus sur main, relecture/rejeu textuel des hunks et empreintes avant/après. `git apply --check` réel et contrôles documentaires du checkout : NOT_RUN ; hooks locaux : HOOK_NOT_AVAILABLE ; couverture : NOT_MEASURED. Ces contrôles statiques ne prouvent ni le typecheck, ni le rendu, ni les interactions.

Exécuter les tests ciblés de la page, des composants Learning modifiés et de la palette, puis les contrôles obligatoires du dépôt. Vérifier sur le navigateur les six thèmes à 375, 768 et 1440 px, trois modes d'affichage, FR/EN, les flèches/Home/End et le focus, la conservation des valeurs du comparateur et filtres entre onglets, l'ouverture des cartes GIEC/ODD/art, les statuts et la sélection des limites planétaires, l'absence de surfaces vides prolongées, les liens et les comportements sans connexion. Tester un corpus politique public vide et un corpus publié en fixture sans modifier les données de production. Vérifier contraste réel et absence de régression sur les autres pages Apprendre (palette et shell partagés). Contrôler les autres consommateurs des composants communs. Si nécessaire ajuster uniquement les défauts démontrés.

STOP CONDITION : candidat intégré sans écraser de travail concurrent, tests et validations obligatoires réussis, comportements observés et captures desktop/mobile conformes, documentation canonique synchronisée, commit publié sur main et SHA relu. Ne pas annoncer de déploiement sans preuve distincte.
