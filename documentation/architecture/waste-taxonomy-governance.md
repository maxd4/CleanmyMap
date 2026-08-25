# Référentiel métier global des déchets

## Décision

Le référentiel canonique est `apps/web/src/lib/waste/`. Il décrit les déchets
indépendamment de la surface qui les collecte, les signale, les cartographie ou
les explique. Le slug est l'identifiant métier stable ; les libellés, exemples
et consignes sont des contenus localisés.

Le référentiel couvre actuellement :

`cigarette_butt`, `nicotine_pouch`, `plastic`, `glass`, `broken_glass`, `metal`,
`mixed_residual`, `bulky_furniture`, `wood`, `electrical_equipment`, `battery`,
`medicine`, `sharps` et `other`.

Chaque définition porte la famille, les labels FR/EN, des exemples, le niveau
de danger (`hazardLevel`), la politique de prise en charge (`pickupPolicy`), la
filière indicative (`disposalRoute`), les EPI, les consignes terrain, les
interdictions et les tags pédagogiques. Les consignes locales et les règles de
la collectivité restent prioritaires sur la route indicative.

## Périmètre et compatibilité

L'audit a trouvé plusieurs vocabulaires historiques :

| Surface | Vocabulaire observé | Décision |
| --- | --- | --- |
| `ActionWasteBreakdown` | `megotsKg`, `plastiqueKg`, `verreKg`, `metalKg`, `mixteKg` | Contrat de stockage conservé ; adaptateur vers les slugs canoniques |
| `recycling/breakdown.ts` | lignes `megots`, `plastique`, `verre`, `metal`, `mixte` | Sortie publique conservée ; calcul interne relié au référentiel |
| `QuickSignalementForm` | IDs historiques `megots`, `plastique`, `encombrant`, `mixte` | IDs de payload conservés ; labels issus du référentiel |
| formulaires d'action et admin | champs historiques `waste*Kg` et conditions de mégots | Pas de migration fonctionnelle dans ce lot |
| communauté | types attendus historiques (`megots`, `plastique`, `verre`, `metal`, `mixte`) | Valeurs de transport conservées ; labels reliés au référentiel |
| assistant recyclage et learning | mots-clés, exemples et tags pédagogiques | UI et quiz conservés ; convergence progressive possible via les tags |
| `trash_spotter_spots` | table de signalements `spot` / `clean_place` | Provenance de données, jamais taxonomie de déchets |

Les anciens slugs ne doivent pas être supprimés tant que les payloads et les
données existantes les utilisent. La table `trash_spotter_spots` n'est ni
renommée ni transformée par cette décision.

## Persistance future

La capacité actuelle ne nécessite pas de table : le registre code-first est la
source de vérité runtime. Si une administration éditoriale ou une persistance
devient nécessaire, la table autorisée sera `public.waste_categories`, avec une
migration dédiée et un contrat de compatibilité explicite. Il ne faut pas
créer une table de taxonomie couplée à la source Trash Spotter.

## Gouvernance

- Un nouveau slug nécessite un cas métier distinct et un test de contrat.
- Un slug existant ne doit pas être réutilisé pour un autre déchet.
- Les anciens slugs sont traités dans `apps/web/src/lib/waste/legacy.ts`.
- Les données d'action ne sont pas refondues pour introduire les nouveaux slugs
  sans migration et plan de lecture rétrocompatible.
- `hazardLevel`, `pickupPolicy` et `prohibitions` servent d'abord à éviter une
  collecte dangereuse ; ils ne constituent pas une habilitation réglementaire.
- Les consignes locales de collecte et les services habilités priment toujours.
- Les formulaires, la carte et les quiz peuvent afficher des vues adaptées,
  mais ne doivent pas créer une deuxième définition contradictoire d'une
  catégorie.

## Limites métier des catégories sensibles

### `medicine`

`medicine` désigne un médicament non utilisé, périmé ou un contenant qui porte
encore du médicament. La consigne de référence est le retour en pharmacie dans
le périmètre de Cyclamed. Une boîte, un blister, un flacon ou un autre emballage
totalement vide ne doit pas être envoyé automatiquement en pharmacie : sa
matière et la consigne locale de tri déterminent la suite. Le référentiel ne
choisit pas la filière locale à la place de la collectivité.

Référence interne : [Info-tri médicament Adelphe / Cyclamed](https://www.cyclamed.org/wp-content/uploads/2025/07/ADELPHE_CYCLAMED_FICHE-REFLEXE_INFO_TRI-MEDICAMENT.pdf), qui distingue les emballages vides des emballages contenant encore un médicament.

### `sharps`

`sharps` est réservé aux seringues et aiguilles à risque, notamment lorsqu'une
seringue ou une aiguille est trouvée sur le terrain. La politique reste
`no_pickup` : ne pas ramasser, sécuriser la zone et signaler au service local ou
habilité approprié. Les lames, cutters et objets coupants génériques ne sont
pas assimilés à cette catégorie ; ils nécessitent leur propre description et la
consigne locale appropriée, généralement via `other` lorsque le référentiel ne
permet pas une qualification plus précise.

DASTRI n'est pas une filière universelle pour tout objet trouvé : son périmètre
concerne les DASRI perforants produits par les patients en auto-traitement et
les utilisateurs d'autotests de diagnostic. La décision runtime ne déduit donc
pas automatiquement « DASTRI » d'un signalement de terrain.

Références internes : [DASTRI — qui sommes-nous ?](https://www.dastri.fr/qui-sommes-nous/) et [DASTRI — autres profils et limites d'agrément](https://www.dastri.fr/espace-dedie-autres-profils/).
