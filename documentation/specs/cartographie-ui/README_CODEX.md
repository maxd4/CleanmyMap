# Cartographie Web : refonte de présentation

Statut : CANDIDATE (non intégré, non déployé). Base observée : 1f2fa1f083eb7d5d092f9a8b9846e977d4fc327c.
Candidats complets sous candidates/ aux chemins cibles, BASE_FILES.json
identifie les blobs des fichiers existants. Pour le document canonique, le
contenu candidat décrit l'objectif après intégration : ne pas le promouvoir
avant validation. Reprendre les deltas sur le checkout courant; préserver les
writers concurrents, notamment le candidat messagerie dans son dossier séparé.

## Constats vérifiés et décisions

- La capture montre un grand canvas, puis un bilan global, une carte de
  contexte et un journal doublement encadré/titré. Le code confirme les
  conteneurs de largeur imbriqués et les styles locaux (ombres, blur, fonds).
  La nouvelle composition garde l'en-tête canonique centré, une carte dominante
  de 100dvh, une largeur commune, puis contexte de vue, bilan global à six
  tuiles et journal à un seul titre. CmmCard pour les surfaces textuelles.
- Filtrer est absent sur la capture : cause démontrée statiquement,
  MapCanvasView ne transmettait pas onContextFilterChange alors que
  ActionsMapCanvasControls exige les cinq callbacks pour afficher Filtrer.
  Le candidat raccorde le callback existant; pas de nouvelle logique filtre.
- Contrôles actifs bleus, calques contrastés et panneaux scrollables; aucune
  modification des couleurs sémantiques des marqueurs. Mobile : grille de
  trois contrôles, recadrage réservé à droite, pas de duplication.
- Source partielle et troncature étaient masquées par showIntro=false
  hors état vide. Les réexposer dans Données de la vue. États chargement,
  erreur, vide distingués; pas de faux 0 au premier chargement de vue.
  Conserver les résultats déjà disponibles en cas d'échec de rafraîchissement.
- Loading.tsx ne représentait pas la composition réelle (ancienne sidebar,
  quatre KPI); le candidat rétablit la même succession avec six squelettes.
- Préserver PageHeader, source ImpactSnapshot et buildPublicImpactMetrics,
  classification proxy, viewport et recenter, deep-links, sélection
  et export, filtre approved-only, accès publics, références scientifiques,
  tous les calques et attributions Leaflet, prévisualisation homepage,
  requêtes et limite actuelle. Aucun backend/mobile/migration, aucune
  nouvelle dépendance, aucun déploiement.

## Intégration et preuves manquantes

Intégrer les deltas ciblés, pas un remplacement aveugle des fichiers.
Vérifier les consommateurs partagés (MapLoadingState, ImmersiveLayout,
ActionsMapTable, canvas et score scope) et les tests existants. Les
nouveaux tests couvrent le passage du callback de contexte et les états
du journal; compléter par test de frontière UI du filtre (visible, choix
du contexte déclenche le filtre existant), export et état source partielle.
Vérifier le chargement avec et sans erreur, sélection/deep-link, recherche de
zone, période, catégories, modes de score, tous calques, zoom/recentrage,
export, journal et CTA. Vérifier les trois modes d'affichage et thèmes,
largeurs 320/390/768/1024/1440/1920, zoom navigateur 100%, ouverture
des overlays sans chevauchement, attribution toujours accessible, carte
sans débordement horizontal et pas de décalage significatif au chargement.
Vérifier que les autres consommateurs fullViewport et les previews ne
régressent pas; adapter uniquement les incompatibilités démontrées.
Exécuter Vitest ciblé, typecheck/lint et gardes proportionnés; navigateur réel
PUBLIC, pas d'authentification artificielle. Intégrer le delta documentaire
au chemin owner. Commit/push selon AGENTS.md, retirer les candidats consommés.

## STOP CONDITION

Carte, filtres et couches intacts, Filtrer visible et opérationnel, couleur
active contrastée, une seule hiérarchie visuelle cohérente, six indicateurs
canoniques, journal et export opérationnels, états distincts, absence de
régression homepage/mobile Web, preuves et documentation cohérentes.
Relire main publié; déploiement distinct.

## État

Lecture GitHub et vérifications structurelles des candidats uniquement.
HOOK_NOT_AVAILABLE; NOT_RUN pour tests du workspace, typecheck, lint,
CI et navigateur; couverture NOT_MEASURED. Aucune migration. Les preuves
runtime sont non prouvées. La capture ne constitue pas un test du candidat.
