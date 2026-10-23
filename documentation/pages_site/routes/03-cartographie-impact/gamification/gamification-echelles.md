# Hiérarchie des sources et échelles

> Module associé à [gamification-SPEC_CANONIQUE.md](./gamification-SPEC_CANONIQUE.md). Statut : CURRENT / LEGACY selon les sections.

## Hiérarchie des sources

Ordre de confiance:

1. le code métier dans `apps/web/src/app/api/gamification/badges/list/route.ts` et les modules `apps/web/src/lib/gamification/*`;
2. les composants UI dans `apps/web/src/components/gamification/*`;
3. cette spec canonique;
4. les mémoires produit `documentation/product/*`.

Si un document secondaire contredit cette spec, cette spec prime.

## Scopes temporels

La gamification manipule maintenant des scopes explicitement nommés.

| Scope | Sens | Usage |
|---|---|---|
| `allTime` | cumul depuis la création du compte | progression personnelle, badges persistants, historique |
| `yearToDate` | année civile en cours | bilans et reconnaissance éditoriale |
| `rolling30d` | 30 derniers jours | pilotage opérationnel |
| `rolling90d` | 90 derniers jours | lecture intermédiaire |
| `rolling365d` | 365 derniers jours | tendance de fond |

Règle d implémentation:

- un bloc de données ne doit pas mélanger plusieurs scopes sans le nommer;
- `allTime` sert le socle cumulatif;
- `yearToDate` sert les variantes annuelles ou éditoriales;
- les fenêtres `rolling*` servent les vues d analyse et de pilotage.

## Principes communs

- une récompense doit correspondre à une action réelle, vérifiable et utile;
- chaque badge doit pouvoir expliquer clairement son déclencheur;
- le système doit rester lisible, sobre et non compétitif;
- la progression doit être visible avant et après l obtention;
- les effets visuels doivent rester légers;
- les récompenses d XP doivent être idempotentes;
- les seuils de base doivent commencer à `Observateur` dès que la famille suit l échelle commune.

## Échelles communes

### Matrice des échelles autorisées par progression CURRENT

| Famille | Échelle autorisée | Vocabulaire autorisé | Vocabulaire interdit |
|---|---|---|---|
| Participation | Échelle cartographique dédiée | `Observateur`, `Promeneur Local`, `Éclaireur`, `Patrouilleur`, `Cartographe`, `Coordinateur`, `Sentinelle`, `Conservateur`, `Gardien` | `Quartz`, `Topaze`, `Pilier` |
| Organisation | Échelle gemme | `Observateur`, `Quartz`, `Topaze`, `Saphir`, `Rubis`, `Émeraude`, `Diamant`, `Opale`, `Pilier` | vocabulaire Forms, impact brut, Mohs |
| Exploration | Échelle d'exploration dédiée | `Observateur`, `Promeneur Local`, `Arpenteur`, `Éclaireur`, `Patrouilleur`, `Repéreur`, `Cartographe`, `Coordinateur`, `Sentinelle`, `Régulateur`, `Conservateur`, `Gardien`, `Maître des Cartes` | `Quartz`, `Topaze`, `Pilier` |
| Zones propres | Échelle atmosphérique dédiée | `Brise`, `Horizon`, `Azur`, `Aurore`, `Zénith`, `Stratosphère`, `Éther`, `Hélios`, `Harmonie`, `Eden` | `Quartz`, `Topaze`, `Pilier`, `Talc` |
| Régularité | Échelle gemme | `Observateur`, `Quartz`, `Topaze`, `Saphir`, `Rubis`, `Émeraude`, `Diamant`, `Opale`, `Pilier` | vocabulaire exploration, végétal, atmosphérique, Mohs |
| Polyvalence | Échelle gemme | `Observateur`, `Quartz`, `Topaze`, `Saphir`, `Rubis`, `Émeraude`, `Diamant`, `Opale`, `Pilier` | vocabulaire exploration, végétal, atmosphérique, Mohs |
| Apprentissage | Échelle pédagogique de learning | paliers d'apprentissage définis par le registre | quiz et contenus d'apprentissage | `learning` / Forms |

Règle d application:

- chaque famille doit rester strictement sur son échelle autorisée;
- si une famille non gemme affiche un grade, l UI doit le nommer par sa propre échelle;
- `Mohs` reste explicitement héritée et distincte;
- `Mohs` ne fait pas partie de cette matrice CURRENT : elle reste une lecture
  historique secondaire des compteurs déchets et mégots;
- `Participant` ne bascule jamais vers les gemmes même s il partage une logique de paliers;
- `Explorer` garde son vocabulaire cartographique propre.

### Échelle gemme

L échelle commune des badges infinis et des badges à progression par paliers suit cette logique:

- `Observateur` à `0`;
- `Quartz` à `1`;
- `Topaze` à `3`;
- `Saphir` à `5`;
- `Rubis` à `8`;
- `Émeraude` à `10`;
- `Diamant` à `15`;
- `Opale` à `20`;
- puis `Pilier II`, `Pilier III`, `Pilier IV`, etc. par paliers de `5`.

Cette échelle sert de base à:

- `Organisation`;
- `Polyvalence`;
- `Régularité`;
- la plupart des badges infinis de progression personnelle.

### Échelle d exploration dédiée

Les badges de couverture territoriale conservent une échelle propre, indépendante de l échelle gemme.

- base `Observateur`;
- progression sémantique `Observateur -> Promeneur Local -> Arpenteur -> Éclaireur -> Patrouilleur -> Repéreur -> Cartographe -> Coordinateur -> Sentinelle -> Régulateur -> Conservateur -> Gardien -> Maître des Cartes`;
- aucun vocabulaire gemme n est utilisé pour cette famille;
- l UI doit parler de `palier d exploration`, `niveau d exploration` ou `échelle d exploration`, jamais de `Quartz`, `Topaze`, `Pilier`, etc.

### Échelle minérale héritée

`Mohs` reste une échelle héritée distincte pour les compteurs déchets et mégots.

- elle est conservée pour compatibilité;
- elle ne doit pas devenir le modèle de référence des nouveaux badges;
- elle reste explicitement à part de l échelle gemme;
- elle n est pas la base du contrat `Observateur` des autres familles;
- ses grades conservent leurs noms minéraux propres: `Talc`, `Gypse`, `Calcite`, `Fluorite`, `Apatite`, `Orthose`, `Quartz`, `Topaze`, `Corindon`, `Diamant`.

### Apprentissage

Les paliers quiz par type et quiz équilibré sont des événements et des
indicateurs rattachés à `learning`. Ils ne constituent pas deux progressions
infinies supplémentaires : l'API et la rubrique exposent une seule synthèse
`Apprentissage`, avec les réponses justes comme métrique principale et la
diversité des types ainsi que leur équilibre comme sous-indicateurs. Les IDs
historiques des événements restent conservés pour la compatibilité et
l'historique XP.
