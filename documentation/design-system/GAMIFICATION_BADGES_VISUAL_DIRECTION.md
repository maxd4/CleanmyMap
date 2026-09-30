# Direction visuelle des badges de gamification

**Statut documentaire : `PLAN`**
**Domaine responsable : Design System / Gamification**
**Implémentation finale : gelée tant que l’architecture de gamification n’est pas stabilisée et validée sur `main`.**

## 1. Objet

Ce document fixe une direction visuelle de référence pour les badges, paliers et jalons de CleanMyMap.

Il ne remplace pas :

- la spécification métier canonique de la gamification ;
- les règles XP ;
- les règles d’éligibilité ;
- les registres de progressions et de jalons ;
- le design system global.

Il définit uniquement la **grammaire visuelle à privilégier** lorsque l’architecture fonctionnelle sera stabilisée.

La priorité, lors de la reprise de ce chantier, est :

1. lisibilité ;
2. distinction immédiate entre progression et jalon ;
3. cohérence avec la gamification non compétitive ;
4. compatibilité mobile ;
5. cohérence avec le design system CleanMyMap ;
6. évolutivité sans recréer un langage visuel par badge.

---

## 2. Direction retenue

La direction recommandée est un système **2D hybride “patch / médaille plate + icône métier + traitement de palier”**.

Le badge ne doit pas être un objet décoratif isolé : il doit permettre de comprendre rapidement :

- la famille de progression ;
- le type de mécanique ;
- le palier atteint ;
- l’état de progression ;
- le caractère nouveau éventuel ;
- si la récompense donne de l’XP ou constitue uniquement une reconnaissance.

### Principe central

```text
identité de famille
+ forme de mécanique
+ traitement de palier
+ état utilisateur
+ marqueurs UI séparés
```

Les informations secondaires comme `New`, `+1 XP` ou `Reconnaissance` ne doivent pas être fusionnées dans l’illustration principale du badge.

---

## 3. Forme des progressions infinies

Les progressions infinies utilisent en priorité une **forme circulaire ou quasi circulaire**.

Cette forme sert à communiquer :

- continuité ;
- progression ;
- répétition ;
- passage de palier.

Structure recommandée :

```text
anneau / contour de palier
        ↓
fond du badge
        ↓
icône métier centrale
        ↓
ornements éventuels du palier
```

Le badge de progression ne doit pas être confondu avec une coupe ou un trophée de victoire.

### États

#### Non commencé

- traitement atténué ;
- contraste secondaire ;
- saturation réduite ;
- pas de cadenas agressif si la mécanique est simplement à découvrir.

#### En cours

- identité visuelle déjà active ;
- progression vers le prochain palier affichée dans la carte UI ;
- un anneau ou indicateur partiel peut être utilisé si cela reste lisible.

#### Palier atteint

- badge plein ;
- contraste normal ;
- palier actuel clairement nommé ;
- paliers précédents affichables de manière compacte à côté ou sous la carte.

Une progression infinie n’est jamais présentée comme « terminée ».

---

## 4. Forme des jalons one-shot

Les jalons utilisent un langage différent des progressions infinies.

Formes recommandées :

- écusson ;
- patch ;
- hexagone doux ;
- médaille plate ;
- sceau simplifié.

Leur silhouette doit permettre de comprendre sans lecture détaillée :

```text
forme circulaire = progression
forme écusson / médaille = jalon
```

Un jalon n’a pas d’anneau de progression infini.

S’il possède un progrès intermédiaire réellement défini par le métier, ce progrès est affiché dans la carte ou la ligne UI, pas transformé artificiellement en niveaux permanents.

---

## 5. Icône métier centrale

Chaque progression possède une identité métier stable.

Les icônes ci-dessous sont des **pistes**, pas des assets finaux.

| Progression | Pistes iconographiques |
|---|---|
| Participation | groupe, silhouettes, pas, présence terrain |
| Organisation | drapeau, porte-voix, checklist, point d’organisation |
| Exploration | boussole, carte, repère, jumelles |
| Zones propres | feuille, zone, vague, pince de collecte |
| Régularité | calendrier, cycle, horloge, répétition |
| Polyvalence | trois branches, triangle équilibré, nœud à trois axes |
| Apprentissage | livre, question, ampoule, connaissance |
| Modération | bouclier, validation, tampon, contrôle vérifié |

Règles :

- une famille doit garder la même identité fondamentale entre ses paliers ;
- le palier ne doit pas changer l’objet central au point de rendre la famille méconnaissable ;
- ne pas créer un vocabulaire illustratif totalement différent à chaque seuil.

---

## 6. Utilisation des pierres précieuses

Les pierres précieuses sont pertinentes comme **langage de palier**, notamment pour les familles qui utilisent déjà l’échelle gemme.

Elles ne doivent pas devenir l’identité unique de toutes les progressions.

### Usage recommandé

Pour une progression qui suit l’échelle gemme :

- l’icône métier reste centrale ;
- le palier modifie le contour, la matière, les accents ou l’ornementation ;
- la gemme peut apparaître comme détail secondaire ;
- le nom du grade reste lisible dans l’UI.

Exemple conceptuel :

```text
Organisation
icône drapeau
+ contour Rubis
+ petit traitement gemme Rubis
```

et non :

```text
simple image d’un rubis générique
```

### Échelle gemme

Respecter la source métier canonique pour les noms et seuils.

Le design ne doit jamais inventer une nouvelle échelle métier.

### Familles non gemmes

Les familles qui ont une échelle thématique propre conservent leur vocabulaire.

Ne pas forcer visuellement toutes les familles dans :

```text
Quartz → Topaze → Saphir → Rubis...
```

si leur contrat métier prévoit une autre échelle.

---

## 7. Marqueur `New`

Le caractère nouveau est un marqueur UI transversal.

Il ne fait pas partie de l’illustration du badge.

### Forme

Petite bulle / pill :

```text
New
```

Direction :

- fond vert clair ;
- texte vert foncé ;
- contraste accessible ;
- taille compacte ;
- placée près du titre ou du badge d’état.

Le texte `New` doit rester visible : la couleur seule ne suffit pas.

### Règle

Une tâche nouvelle qui passe :

```text
non commencée → en cours
```

ou :

```text
en cours → terminée
```

conserve le marqueur `New` jusqu’à l’acquittement défini par le contrat de migration.

Le statut `New` ne doit jamais être intégré en dur dans l’asset SVG/PNG du badge.

---

## 8. XP et reconnaissance

Le visuel du badge ne doit pas induire qu’un badge donne nécessairement de l’XP.

### XP

Lorsqu’une mécanique attribue de l’XP, l’UI affiche un marqueur séparé :

```text
+1 XP
```

ou la valeur applicable.

### Badge sans XP

Pour un jalon `BADGE_ONLY` :

- ne jamais afficher `+0 XP` ;
- utiliser si nécessaire :
  - `Reconnaissance`
  - ou aucune mention XP dans la vue compacte.

Le statut XP appartient au contrat métier et à l’UI, pas à l’illustration du badge.

---

## 9. 2D, pseudo-3D et 3D

### Direction principale

**2D.**

Caractéristiques :

- formes nettes ;
- bonne lisibilité à petite taille ;
- profondeur légère possible ;
- ombres discrètes ;
- texture minimale ;
- pas de réalisme obligatoire.

### Pseudo-3D

Tolérée avec parcimonie :

- léger relief ;
- reflet ;
- ombre ;
- profondeur optique.

Elle ne doit pas nécessiter un second système graphique.

### 3D réaliste

Non retenue comme langage principal.

Raisons :

- moins lisible en petit ;
- plus coûteuse à produire ;
- plus difficile à maintenir ;
- risque de rupture avec l’interface ;
- risque d’esthétique “jeu mobile premium” excessive.

Une utilisation ponctuelle future dans une illustration marketing ou une célébration majeure reste possible après décision explicite.

---

## 10. Trophées

Les trophées / coupes ne sont pas le langage principal.

Raisons :

- sémantique de victoire ;
- proximité avec classement et compétition ;
- faible différenciation entre familles ;
- contradiction potentielle avec la gamification non compétitive.

Ils peuvent être réévalués pour :

- distinction annuelle exceptionnelle ;
- événement spécial ;
- célébration éditoriale.

Ils ne doivent pas devenir le composant standard d’une progression.

---

## 11. Avatars et personnages

Les avatars ne sont pas retenus comme support principal des badges.

Raisons :

- coût de création élevé ;
- difficulté de déclinaison ;
- risque d’infantilisation ;
- confusion entre identité utilisateur et mécanique de progression.

Ils peuvent être réévalués séparément pour :

- mascotte ;
- personnalisation du profil ;
- illustrations pédagogiques.

Ils ne doivent pas être ajoutés au système de badges sans nouveau choix produit.

---

## 12. Puzzle

Le puzzle n’est pas retenu comme grammaire principale des badges.

En revanche, il est considéré comme une **mécanique visuelle secondaire intéressante** pour des collections limitées.

Usages futurs possibles :

- collection territoriale ;
- série événementielle ;
- campagne spécifique ;
- carte composée ;
- ensemble de pièces débloquées.

Ne pas convertir les huit progressions principales en pièces d’un puzzle unique.

Le puzzle ne doit pas rendre une progression dépendante de mécaniques sans rapport métier.

---

## 13. Patchs, dessins et médailles

### Patch

Retenu comme inspiration principale :

- compact ;
- lisible ;
- facilement thématisable ;
- compatible avec des états obtenus / non obtenus.

### Médaille

Retenue surtout pour les jalons.

Éviter :

- rubans militaires ;
- hiérarchie trop compétitive ;
- iconographie de classement.

### Dessins

Autorisés si :

- simplifiés ;
- cohérents entre familles ;
- lisibles à petite taille ;
- compatibles avec les tokens et thèmes.

Ne pas créer des illustrations détaillées incompatibles avec les tailles de badge réelles.

---

## 14. Couleurs

Le badge doit rester cohérent avec le design system.

Principes :

- la couleur de page ne suffit pas à coder l’état ;
- éviter une palette “casino” ;
- éviter l’accumulation de gradients saturés ;
- le grade et la famille doivent rester identifiables sans dépendre uniquement d’une teinte.

Le rouge CleanMyMap peut rester dominant dans la surface Gamification, mais il ne doit pas écraser les couleurs sémantiques nécessaires aux paliers.

Le vert du marqueur `New` est un marqueur local distinct.

---

## 15. Taille et lisibilité

Le système doit rester lisible :

- en petit badge dans une liste ;
- dans une carte de progression ;
- dans le profil ;
- sur mobile.

Priorité :

```text
silhouette
→ icône centrale
→ état
→ grade
→ détails décoratifs
```

Ne pas concevoir un badge qui ne fonctionne qu’en grand.

Le système final devrait privilégier des assets vectoriels ou des composants vectoriels lorsque possible.

Les choix exacts de format d’asset et de pipeline sont différés jusqu’à stabilisation de l’architecture et audit des consommateurs réels.

---

## 16. Interdits de conception

Ne pas introduire comme nouveau standard sans décision explicite :

- trophée pour chaque badge ;
- avatar pour chaque progression ;
- système principal en 3D ;
- puzzle unique comme structure globale ;
- badge totalement différent à chaque palier ;
- conversion de toutes les familles vers les gemmes ;
- `New` dessiné directement dans l’asset ;
- `+XP` intégré dans l’asset ;
- cadenas comme seul moyen d’indiquer « non commencé » ;
- couleur comme seule information d’état ;
- effets de rareté type loot-box ;
- brillance excessive, coffre, jackpot ou vocabulaire de casino ;
- esthétique de podium / victoire comme grammaire principale.

---

## 17. État de décision

### Retenu pour la prochaine phase de design

- 2D comme langage principal ;
- patch / médaille plate ;
- forme distincte progression vs jalon ;
- icône métier centrale stable ;
- palier porté par le contour / traitement visuel ;
- gemmes uniquement là où la règle métier les justifie ;
- `New` comme pill verte indépendante ;
- XP comme information UI séparée ;
- BADGE_ONLY visuellement valorisé sans faux `+0 XP`.

### À réévaluer après stabilisation de l’architecture

- icône exacte de chaque famille ;
- silhouette exacte des patchs ;
- palette finale par palier ;
- textures ;
- niveaux d’ombre ;
- animations ;
- pseudo-3D ;
- assets de célébration ;
- usages secondaires du puzzle ;
- trophées exceptionnels ;
- éventuelle mascotte.

### Non retenu comme base

- trophées généralisés ;
- avatars généralisés ;
- 3D réaliste généralisée ;
- puzzle comme système principal.

---

## 18. Condition de reprise du chantier visuel

Le design détaillé des badges doit reprendre uniquement après :

1. convergence des progressions et jalons ;
2. stabilisation du registre canonique ;
3. stabilisation des règles XP / BADGE_ONLY / NON_GAMIFIED ;
4. mise en place de la réconciliation ;
5. stabilisation des états `not_started`, `in_progress`, `completed` et `New` ;
6. stabilisation des consommateurs front-end.

À ce moment, relire `main` avant tout choix final d’asset ou de composant.
