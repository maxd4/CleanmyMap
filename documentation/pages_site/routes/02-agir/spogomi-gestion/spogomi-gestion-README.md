# Gestion SPOGOMI

## Fiche canonique

- **Route** : `/spogomi/[eventSlug]/gestion`
- **Source** : `apps/web/src/app/(app)/spogomi/[eventSlug]/gestion/page.tsx`
- **Type fonctionnel** : cockpit privé de préparation
- **Famille / bloc fonctionnel** : Agir
- **Statut** : CURRENT — lot 5, prolongement des services des lots 2 à 4
- **Accès / SEO** : `protected` ; session puis relation organisateur canonique vérifiée côté serveur ; `NOINDEX`, `INTERNAL_ONLY`, `NONE`
- **Entrée** : `/dashboard/spogomi` liste les événements réellement gérables par l'identité courante et renvoie vers ce cockpit ; la route de gestion revalide ensuite l'autorisation côté serveur
- **Parcours réutilisés** : consultation/publication de l'événement, visibilité publique des résultats, import CSV/XLSX, composition et verrouillage des équipes, édition auditée des pseudonymes publics (`spogomi_teams.public_name`) sans changement d'effectif, génération volontaire puis ouverture directe du lien temporaire de saisie équipe, révocation, revue et certification des versions, publication des classements officiels, consultation et rattachement du GPX officiel, aperçu et publication explicite du bilan environnemental dans l'action cible, export XLSX authentifié
- **Confidentialité** : roster et opérations restent dans les routes API protégées ; aucun rôle global ni paramètre client ne suffit
- **Export** : `GET /api/spogomi/events/[eventId]/export.xlsx` est réservé à l'organisateur habilité. Le classeur contient `Synthèse`, `Équipes`, `Catégories` et `Traçabilité`; les valeurs brutes non certifiées sont exclues des données exportées.
- **Limites** : aucune création d'action par équipe, aucun transfert vers `public.forms` ou la gamification, aucune publication automatique de l'action ; l'aperçu bloque les catégories ou mesures sans correspondance et les règles sportives restent bloquées tant que le règlement n'est pas complet

La route serveur `GET|POST /api/spogomi/events/[eventId]/consolidation` est
réservée à l'organisateur authentifié, limitée en débit et sépare l'aperçu de
la publication. La publication exige le hash de l'aperçu courant. Elle écrit
une projection versionnée dans l'action déjà liée à l'événement ; une
correction remplace la projection courante et conserve la version précédente.

Le panneau des équipes affiche `Équipe <numéro> — <pseudonyme>` et propose
Modifier, Enregistrer et Annuler pour les organisateurs autorisés à tous les
états de l'événement. Le serveur normalise et valide le pseudonyme, contrôle
les collisions dans l'événement et refuse une écriture concurrente fondée sur
une valeur obsolète. Le numéro, l'identifiant, les accès, les participants,
les soumissions et les classements ne sont jamais recréés ou modifiés par ce
parcours ; un refus doit être rechargé depuis l'état canonique courant.

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
