# Catalogue des badges - système de gamification CleanMyMap

Documentation complète des familles de badges et des systèmes de progression utilisés dans CleanMyMap.

Référence canonique à lire en premier:

- [Spec canonique de la gamification](../pages_site/routes/03-cartographie-impact/gamification/gamification-SPEC_CANONIQUE.md)

## Vue d ensemble

Le système de gamification comprend 4 familles de badges exposées par l API, 2 systèmes infinis affichés dans la zone profil, 2 badges one-shot d'entrée, ainsi que 5 badges hérités basés sur des points. Chaque famille récompense un comportement différent :

- **Explorer** : découverte géographique
- **Participant** : participation aux actions de nettoyage
- **Forms** : formulaires éligibles soumis
- **Clean Zones** : lieux propres et déclarations validées
- **Premiers jalons** : première trace utile et badge compagnon de jalon
- **Infinite Badges** : progression personnelle continue sur les déchets, les mégots, les nouveaux lieux, les actions créées et l équilibre des contextes
- **Mohs Badge** : progression continue de type minérale pour les déchets et les mégots

## Matrice des échelles

| Famille | Échelle | Remarque |
|---|---|---|
| Explorer | Échelle d exploration dédiée | Pas de vocabulaire gemme |
| Participant | Échelle cartographique dédiée | Base `Observateur`, paliers propres à la participation |
| Forms | Échelle végétale dédiée | Graine → Forêt primaire |
| Clean Zones | Échelle atmosphérique dédiée | Brise → Eden |
| Actions créées | Échelle gemme | Observateur → Pilier |
| Équilibre des contextes | Échelle gemme | Observateur → Pilier |
| Régularité mensuelle | Échelle gemme | Observateur → Pilier |
| Zone sensible apaisée | Échelle gemme | Observateur → Pilier |
| Mohs | Échelle minérale héritée | Talc → Diamant, distincte de la gemme |

Règle produit:

- toute nouvelle famille doit déclarer explicitement son échelle;
- les échelles non gemme ne doivent pas emprunter le vocabulaire `Quartz / Topaze / Pilier`;
- `Mohs` reste une exception héritée documentée à part.

---

## 1. Badge Explorer - Échelle d exploration dédiée

**Objectif** : récompenser l exploration géographique et la révélation de nouvelles zones sur la carte.

**Échelle d exploration** : dédiée / cartographique - 13 paliers

- cette famille n utilise pas l échelle gemme;
- ses grades et son vocabulaire restent propres à l exploration;
- l UI doit afficher des `paliers d exploration`, jamais des grades gemmes.

| Palier | Nom | Icône | Seuil | Progression | Déclenchement |
|-------|------|-------|-------|-------------|---------------|
| 1 | Observateur | 👀 | 0 | 1 zone | 0+ zone |
| 2 | Promeneur Local | 👣 | 1 | 2 zones | 1-2 zones |
| 3 | Arpenteur | 🥉 | 3 | 2 zones | 3-4 zones |
| 4 | Éclaireur | 🔦 | 5 | 3 zones | 5-7 zones |
| 5 | Patrouilleur | 🚶 | 8 | 3 zones | 8-10 zones |
| 6 | Repéreur | 📍 | 11 | 4 zones | 11-14 zones |
| 7 | Cartographe | 🗺️ | 15 | 5 zones | 15-19 zones |
| 8 | Coordinateur | 🧭 | 20 | 5 zones | 20-24 zones |
| 9 | Sentinelle | 🛡️ | 25 | 5 zones | 25-29 zones |
| 10 | Régulateur | ⚖️ | 30 | 5 zones | 30-34 zones |
| 11 | Conservateur | 🌳 | 35 | 10 zones | 35-44 zones |
| 12 | Gardien | 🦺 | 45 | 5 zones | 45-49 zones |
| 13 | Maître des Cartes | 🔭 | 50 | ∞ | 50+ zones |

**Récompense XP** : +1 XP par palier débloqué, sans bonus

**Source de données** : table `user_visited_places` - comptage des enregistrements uniques par utilisateur

**Direction visuelle** :

- Icônes : métaphore de l exploration (yeux, pas, bottes, boussole, carte, bouclier, arbre)
- Textures : parchemin → bronze → argent → or → diamant → cosmique
- Fond : progression visuelle basée sur la texture

**Composants** :

- `ExplorerBadge.tsx` - composant UI avec rendu des paliers
- `ExplorerBadgeWrapper.tsx` - récupération des données et gestion des états
- `explorer-badge.module.css` - styles de texture et de dégradé

**État d implémentation** : ✅ complet avec tests

---

## 2. Badge Participant - Actions de nettoyage

**Objectif** : récompenser la participation aux actions communautaires de dépollution.

**Échelle** : exploration / cartographie - base zéro + 8 paliers

| Palier | Nom | Icône | Seuil | Emoji | Info-bulle |
|-------|------|-------|-------|-------|------------|
| 0 | Observateur | marker | 0 | 👀 | Point de départ de la participation |
| 1 | Promeneur Local | footprints | 1 | 👣 | Première participation utile |
| 2 | Éclaireur | compass | 3 | 🔦 | Participation assidue |
| 3 | Patrouilleur | boots | 5 | 🚶 | Participation récurrente |
| 4 | Cartographe | map | 10 | 🗺️ | Contribue à la couverture |
| 5 | Coordinateur | compass-rose | 15 | 🧭 | Rôle central |
| 6 | Sentinelle | shield | 20 | 🛡️ | Pérennité garantie |
| 7 | Conservateur | tree | 25 | 🌳 | Impact notable |
| 8 | Gardien | guardian | 30 | 🦺 | Ambassadeur de terrain |

**Seuils** : 0 → 1 → 3 → 5 → 10 → 15 → 20 → 25 → 30 participations

**Récompense XP** : +1 XP par palier débloqué, sans bonus

**Source de données** : table `action_participants` - comptage des enregistrements où `user_id = userId`

**Direction visuelle** :

- Icônes : métaphore action / exploration (marker, compass, boots, map, shield, tree)
- Variantes : parchemin, bronze, argent, or, platine, diamant, cosmique
- Barre de progression : affiche la participation vers le palier suivant

**Composants** :

- Rendu inline dans la réponse API de la liste des badges
- Pas de fichier composant séparé (utilise la route de liste des badges)

**État d implémentation** : ✅ complet

---

## 3. Badge Forms - Formulaires soumis

**Objectif** : récompenser la création de formulaires d action éligibles.

**Échelle** : croissance végétale - 8 paliers (Graine → Forêt primaire)

| Palier | Nom | Icône | Seuil | Emoji | Visuel |
|-------|------|-------|-------|-------|--------|
| 1 | Graine | plant-seed | 1 | 🌱 | Vert léger de semence |
| 2 | Pousse | plant-sprout | 3 | 🌿 | Vert de pousse |
| 3 | Jeune plante | plant-seedling | 5 | 🌱 | Vert de plantule |
| 4 | Arbuste | plant-sapling | 8 | 🎋 | Vert de jeune arbre |
| 5 | Jeune arbre | plant-young-tree | 10 | 🌳 | Vert d arbre jeune |
| 6 | Arbre mature | plant-mature-tree | 15 | 🌲 | Vert d arbre mature |
| 7 | Bosquet | plant-grove | 20 | 🌴 | Vert de bosquet |
| 8 | Forêt primaire | plant-primary-forest | 25 | 🌳🌳 | Vert de forêt primaire |

**Seuils** : 1 → 3 → 5 → 8 → 10 → 15 → 20 → 25 formulaires

**Récompense XP** :

- **+1 XP** par palier débloqué
- **+2 XP de bonus** à chaque décennie (10, 20 formulaires) - attribué une seule fois par décennie

**Règles d éligibilité** :

- le formulaire doit être validé par un admin (`validated_by_admin = true`)
- exclusion : brouillons, supprimés, tests, formulaires incomplets
- le type d action doit être `spontanée` (exclut le type `zone_propre`)
- **Déduplication** : un seul formulaire par paire `(action_id, group_id)` est compté
  - lorsqu il existe plusieurs formulaires pour la même action et le même groupe, seul le premier validé est pris en compte

**Source de données** : table `action_responses` (approche indicative) - filtrée et dédupliquée par action + groupe

**Logique de calcul** :

```text
eligible_forms = count distinct des paires (action_id, group_id)
  où status='validated' AND validated_by_admin=true
  ET action.status='approved'
  ET action.type != 'zone_propre'

bonus_xp = floor(eligible_forms / 10) * 2  // un bonus par décennie
```

**Direction visuelle** :

- Échelle : croissance végétale (graine → forêt mature)
- Couleurs : spectre de verts allant du vert très pâle (#f3f7f1) au vert forêt profond (#15783a)
- Variables CSS : `--plant-*-light`, `--plant-*-dark`, `--plant-*-progress`, `--plant-*-border`
- Emojis : 🌱 → 🌿 → 🎋 → 🌳 → 🌲 → 🌴 → 🌳🌳

**Composants** :

- `FormsBadge.tsx` - composant UI avec rendu des paliers et mapping des emojis végétaux
- `FormsBadgeWrapper.tsx` - récupération des données, gestion des erreurs et des chargements
- `forms-badge.module.css` - tokens de couleur liés à la croissance végétale

**Tests** :

- `forms.integration.test.ts` - vérifie la déduplication et les récompenses XP
- Les tests couvrent : doublon `(action, group)` ignoré, brouillon ignoré, formulaire validé compté, XP attribuée une fois par palier, bonus par décennie

**État d implémentation** : ✅ complet avec tests

---

## 4. Badge Clean Zones - Lieux propres validés

**Objectif** : récompenser la déclaration et la validation des lieux propres et des sites de pollution.

**Échelle** : atmosphérique / écologique - 10 paliers (Brise → Eden)

| Palier | Nom | Icône | Seuil | Emoji | Description |
|-------|------|-------|-------|-------|-------------|
| 1 | Brise | breeze | 1 | 🌬️ | Brise légère, vent doux |
| 2 | Horizon | horizon | 3 | 🌅 | Là où le ciel rencontre la terre |
| 3 | Azur | azure | 5 | 🔵 | Ciel bleu profond |
| 4 | Aurore | dawn | 8 | 🌄 | Aube rose-orange |
| 5 | Zénith | zenith | 10 | ☀️ | Zénith lumineux |
| 6 | Stratosphère | stratosphere | 15 | ☁️ | Haute altitude, bleus froids |
| 7 | Éther | ether | 20 | ✨ | Atmosphère légère et éthérée |
| 8 | Hélios | helios | 25 | 🌟 | Référence solaire, teinte dorée |
| 9 | Harmonie | harmony | 30 | 🦋 | Équilibre bleu-vert |
| 10 | Eden | eden | 40 | 🌿 | Paradis végétal, vert profond |

**Seuils** : 1 → 3 → 5 → 8 → 10 → 15 → 20 → 25 → 30 → 40 zones

**Récompense XP** :

- **+1 XP** par zone / tâche éligible
- **+2 XP de bonus** à chaque décennie (10, 20, 30... zones) - attribué une seule fois par décennie

**Critères d éligibilité** :

- **Source 1** : table `trash_spotter_spots`
  - `spot_type = clean_place`
  - `status = validated` ou `cleaned`
  - `latitude` et `longitude` non nulles
  - `notes` non nulles
  - `validated_at` ou `cleaned_at` antérieur d au moins 24h

- **Source 2** : table `spots` (source alternative pour les déclarations de pollution)
  - `status = validated` ou `cleaned`
  - `created_by_clerk_id` correspondant à l utilisateur
  - `latitude` et `longitude` non nulles
  - `notes` non nulles
  - `validated_at` ou `cleaned_at` antérieur d au moins 24h

**Déduplication** : fusionner les résultats des deux sources en s appuyant sur une clé canonique de lieu afin d éviter tout double comptage

**Garde-fou de cooldown** :

- un cooldown de 24h sur la revalidation empêche le farming via des validations répétées
- seuls les lieux validés / nettoyés depuis au moins 24h comptent dans la progression
- chaque lieu éligible génère +1 événement XP de progression (suivi par ID de lieu)

**Logique de calcul** :

```text
normalized_candidates =
  union all des lignes de trash_spotter_spots et de spots,
  après projection vers :
  canonical_place_key, source_table, source_id, status, latitude, longitude,
  notes, validated_at_or_cleaned_at

eligible_candidates =
  lignes où status IN ('validated', 'cleaned')
  ET latitude IS NOT NULL ET longitude IS NOT NULL
  ET notes IS NOT NULL
  ET validated_at_or_cleaned_at <= now - interval '24 hours'

deduped_candidates =
  première ligne par canonical_place_key,
  ordonnée d abord par validated_at_or_cleaned_at ASC,
  puis par priorité de source si nécessaire pour départager les égalités

clean_zones_count = count(distinct canonical_place_key)

per_task_xp = 1 par zone éligible (via insertion dans progression_events)
bonus_xp = floor(clean_zones_count / 10) * 2  // un bonus par décennie
```

**Direction visuelle** :

- Échelle : progression atmosphérique / écologique (brise → paradis)
- Couleurs : bleus ciel, violets et verts pour refléter la progression
- Variables CSS : `--atmosphere-*-light`, `--atmosphere-*-dark`, `--atmosphere-*-progress`, `--atmosphere-*-border`
- Emojis : 🌬️ → 🌅 → 🔵 → 🌄 → ☀️ → ☁️ → ✨ → 🌟 → 🦋 → 🌿
- Texture : léger scintillement atmosphérique

**Composants** :

- `CleanZonesBadge.tsx` - composant UI avec mapping des emojis atmosphériques
- `CleanZonesBadgeWrapper.tsx` - récupération des données et fusion multi-source
- `clean-zones-badge.module.css` - tokens de couleur atmosphériques

**Tests** :

- `clean-zones.integration.test.ts` - vérifie le comptage, le cooldown et la déduplication
- Les tests couvrent : géolocalisation et documentation obligatoires, validation du cooldown, XP attribuée par zone, bonus par décennie

**État d implémentation** : ✅ complet avec tests et cooldown

---

## 5. Infinite Badges - Progression personnelle continue

**Objectif** : récompenser l accumulation continue des compteurs d impact affichés dans la zone profil.

**Familles** :

- **Waste** : progression `wasteKg` basée sur `BADGE_STEP_DECHETS`
- **Butts** : progression `butts` basée sur `BADGE_STEP_MEGOTS`
- **Places** : progression `newPlaces` basée sur un pas de 5 lieux
- **Actions créées** : progression `actionsCreated` basée sur les actions de dépollution réelles validées par un formulaire, puis prolongée avec des grades infinis
- **Équilibre des contextes** : progression `balancedCycles` par cycles croissants sur les actions validées: 1 de chaque type, puis 2, puis 3, etc., avec remise à zéro entre paliers, XP gagnés = 1, puis 2, puis 3, une ligne d audit indiquant les types et quantités manquants, et suite infinie en grades gem puis Pilier

**Échelle** : progression ouverte avec changement de titre, de rang, d icône et de style visuel lorsque le total augmente.

**Garde-fou métier** :

- une action créée ne donne pas d XP tant qu aucun formulaire validé n est rattaché à cette action et tant que les organisateurs ne sont pas renseignés ou déterminables
- la progression `Actions créées` ne compte donc que les actions réellement validées par le workflow métier, pas les simples brouillons ou remplissages de formulaire
- après le dernier grade d exploration, la progression continue avec des paliers infinis de type `Pilier II`, `Pilier III`, `Pilier IV`, etc.
- pour l équilibre des contextes, la progression avance uniquement quand les trois contextes sont présents dans les actions validées: spontanée, association et entreprise
- le compteur d équilibre est gouverné par le contexte le moins représenté afin d encourager une répartition plus diverse sans punir les préférences individuelles

**Source de données** : table `user_badge_totals` - `waste_kg`, `butts`, `places_count` pour les trois premières familles, et calcul dérivé depuis les actions + formulaires validés pour `Actions créées`; pour `Équilibre des contextes`, la progression est reconstruite chronologiquement avec remise à zéro de chaque cycle

**Direction visuelle** :

- Les rangs évoluent de wood à cosmic
- Les titres et les icônes changent à chaque rang
- Une barre de progression montre le total actuel par rapport au prochain seuil
- Chaque famille utilise le patron `InfiniteBadge` + `BadgeSurface`

**Composants** :

- `InfiniteBadgesPanel.tsx` - panneau profil qui regroupe les trois compteurs
- `InfiniteBadge.tsx` - calcul et affichage du rang
- `infinite-badges/utils.ts` - helpers de mappage rang / tier
- `infinite-badges/BadgeModal.tsx` - vue détaillée en modal
- `action-balance-badge.tsx` - badge gem d équilibre des contextes avec cycle courant, XP cumulés, progression vers le prochain palier et ligne d audit des manquants

**État d implémentation** : ✅ complet

---

## 6. Mohs Badge - Échelle de grades pour déchets et mégots

**Objectif** : récompenser une accumulation longue avec une échelle minérale à 10 grades affichée dans la zone de progression personnelle.

**Familles** :

- **Waste** : un grade tous les 20 kg
- **Butts** : un grade tous les 2 000 mégots

**Échelle** : progression Mohs - 10 grades de Talc à Diamant

**Règle de séparation** :

- cette échelle reste explicitement distincte de l échelle gemme utilisée par les autres badges infinis;
- elle ne doit pas être convertie en `Observateur / Quartz / Topaze ...`;
- elle sert uniquement aux compteurs hérités déchets et mégots;
- elle conserve ses noms minéraux propres et son affichage compact secondaire.

**Sources de données** :

- valeurs `wasteKg` pour la famille déchets
- valeurs `butts` pour la famille mégots

**Direction visuelle** :

- Noms de grades : Talc, Gypse, Calcite, Fluorite, Apatite, Orthose, Quartz, Topaze, Corindon, Diamant
- Couleurs de grades : gris ardoise → pierre → violet → teal → ambre → rose → rose vif → rouge → ciel
- Le grade courant et le prochain grade sont affichés avec une barre de progression compacte
- Le badge peut afficher l historique des grades passés lorsqu il est demandé

**Composants** :

- `mohs-badge.tsx` - badge compact basé sur les grades
- Utilisé dans `personal-progress.tsx` comme affichage de progression secondaire

**État d implémentation** : ✅ complet

---

## 7. Badges one-shot - Premiers jalons d'entrée

Badges uniques débloqués une seule fois, sans répétition, pour marquer les premiers seuils de contribution.

| Badge | Nom | Déclencheur | XP | Icône |
|------|-----|-------------|----|-------|
| first_trace_utile | Première trace utile | Première action validée avec données complètes | +1 XP | badge-check |
| trace_fondatrice | Trace fondatrice | Même premier jalon, version mémorielle / vitrine | 0 XP | sparkles |

**Règles** :

- l'action doit être `approved`
- elle doit disposer d'un formulaire validé
- la complétude de données doit atteindre 100 % sur les champs clés
- le badge `Première trace utile` attribue +1 XP une seule fois
- `Trace fondatrice` sert de badge compagnon visuel pour renforcer le premier jalon

**Source de données** : table `actions` + `forms` validés + `progression_events` pour l'unicité d'attribution

**État d implémentation** : ✅ complet

---

## 8. Badges hérités basés sur les points

Badges de jalons simples basés sur les points cumulés dans `user_points.total_points` :

| Badge | Nom | Seuil | Icône |
|------|-----|-------|-------|
| first_step | Premier pas | 10 points | 👣 |
| contributor | Contributeur | 100 points | 🌱 |
| active | Actif | 500 points | 🔥 |
| champion | Champion | 1000 points | ⭐ |
| legend | Légende | 5000 points | 👑 |

**Récompense XP** : intégrée au système de points (points ≈ XP)

**État d implémentation** : ✅ complet

---

## 9. Règle de bonus par décennie

**S applique aux badges utilisant la progression [1, 3, 5, 8, 10, 15, 20, ...] :**

Quand le nombre d éléments éligibles d un utilisateur franchit un **multiple de 10** (10, 20, 30...), il reçoit :

- **+2 XP de bonus**
- **une seule fois par décennie** (non répété pour le même seuil)
- suivi via un index unique sur `(user_id, source_table, source_id)` où `source_id = '<badge>:bonus:10'`

**Implémentation** :

```typescript
const bonusCount = Math.floor(eligibleCount / 10);
for (let i = 1; i <= bonusCount; i++) {
  const bonusKey = `<badge>:bonus:${i*10}`;
  // Vérifier si le bonus a déjà été attribué (l unicité empêche les doublons)
  // Si non, insérer un progression_event avec xp_base=2, xp_awarded=2
}
```

**Appliqué à** :

- Badge Forms (10, 20 formulaires)
- Badge Clean Zones (10, 20, 30, 40 zones)
- Toute future famille de badges utilisant le motif [1,3,5,8,10,15,20...]

## 10. Correction historique des actions

Quand la règle `Actions créées` a été corrigée pour n accorder de XP qu après un formulaire validé, un backfill dédié a été prévu pour remettre l historique au bon niveau.

**Ce que fait le backfill** :

- annule les anciens bonus `action_created` et `action_validated` enregistrés dans `points_ledger`
- ajoute une écriture de compensation `refund` pour chaque ligne legacy concernée
- ajoute une ligne miroir dans `xp_audit` pour garder la trace de la correction
- rejoue ensuite la progression des actions validées, afin de ne conserver que les actions réellement reliées à un formulaire validé

**Commande associée** :

- `npm run gamification:backfill:actions -w apps/web`

**Sécurité** :

- mode dry-run par défaut
- `--apply` requis pour écrire en base
- exécution idempotente grâce à des clés de correction stables

---

## Flux de données

### Table des événements de progression des badges

Toutes les attributions de XP sont enregistrées dans `progression_events` :

```sql
CREATE TABLE progression_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,  -- 'tier_unlock', 'tier_bonus', 'clean_zone_task', etc.
  source_table TEXT NOT NULL, -- 'action_responses', 'trash_spotter_spots', 'spots', etc.
  source_id TEXT NOT NULL,   -- 'forms:forms-seed', 'clean-zone:clean-zones-breeze', etc.
  status_phase TEXT NOT NULL DEFAULT 'pending',
  weight INT DEFAULT 1,
  xp_base INT NOT NULL,
  xp_awarded INT NOT NULL,
  occurred_on DATE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(user_id, source_table, source_id)  -- Empêche les doublons d XP
);
```

**L unicité empêche** :

- les doublons de déblocage de palier (un même palier n est attribué qu une fois)
- les doublons de bonus décennaux (chaque seuil x10 n est attribué qu une fois)
- les doublons de XP par tâche (chaque zone / formulaire n est attribué qu une fois)

### Journal d audit

Toutes les attributions de XP sont enregistrées dans `xp_audit` avec :

- qui a gagné les XP (`user_id`)
- pourquoi (raison / description)
- combien (`xp_base`, `xp_awarded`)
- à partir de quoi (`source_table`, `source_id`)
- les métadonnées de contexte (palier, seuil, etc.)

Accessible via :

- panneau admin : `/admin/audit-xp` (trié par date / utilisateur / XP total)
- endpoint utilisateur : `/api/gamification/xp_audit/me` (historique personnel)

---

## Notifications en temps réel

Lorsqu un palier de badge est débloqué ou qu un bonus est attribué :

1. **Événement NOTIFY** : la RPC Supabase émet `notify_gamification`
2. **Diffusion WebSocket** : le relais diffuse l événement aux clients connectés
3. **Toast UI** : le client affiche une notification de célébration avec le nom du palier et le montant XP

Structure du payload :

```json
{
  "type": "tier_unlocked" | "tier_bonus" | "clean_zone_task_awarded",
  "userId": "...",
  "tierId": "forms-seed",
  "threshold": 1,
  "xp": 1
}
```

---

## Checklist d implémentation pour un nouveau badge

Pour ajouter une nouvelle famille de badges, suivre cette checklist :

- [ ] Définir les paliers (libellés, seuils, icônes, info-bulles)
- [ ] Implémenter le comptage des éligibilités avec déduplication
- [ ] Ajouter la boucle de déblocage des paliers avec attribution de XP (1 XP par palier)
- [ ] Ajouter la logique de bonus décennal si le motif [1,3,5,8,10,15,20...] est utilisé
- [ ] Créer le composant UI (`[BadgeName]Badge.tsx`) avec le mapping des emojis
- [ ] Créer le wrapper de données (`[BadgeName]BadgeWrapper.tsx`) avec la gestion des états
- [ ] Créer le module CSS (`[badge-name]-badge.module.css`) avec les variables de couleur
- [ ] Ajouter la route `/api/gamification/badges/list`
- [ ] Écrire les tests d intégration dans `[badge-name].integration.test.ts`
- [ ] Tester les notifications en temps réel avec le relais WebSocket
- [ ] Vérifier les entrées du journal d audit dans `xp_audit`
- [ ] Mettre à jour ce document avec les détails du badge

---

## Références

- Guide d implémentation des badges : `documentation/BADGE_IMPLEMENTATION_GUIDE.md`
- Guide notifications & WebSocket : `documentation/gamification/BADGE_NOTIFY_WS_GUIDE.md`
- Tests de contrôle d accès : `documentation/gamification/TESTING_ACCESS_CONTROL.md`
- Route API : `apps/web/src/app/api/gamification/badges/list/route.ts`
- Exemples de composants : `apps/web/src/components/gamification/`

---

**Dernière mise à jour** : 2026-06-01
**État** : 4 familles de badges implémentées, 5 badges hérités basés sur les points actifs
