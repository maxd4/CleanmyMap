# Mes événements SPOGOMI

## Fiche canonique

- **Route** : `/spogomi/mes-evenements`
- **Source** : `apps/web/src/app/(app)/spogomi/mes-evenements/page.tsx`
- **Type fonctionnel** : catalogue privé des événements liés à l'identité courante
- **Famille / bloc fonctionnel** : Agir
- **Accès / SEO** : `protected` ; `NOINDEX`, `INTERNAL_ONLY`, `NONE`
- **Autorisation** : la session est vérifiée côté serveur puis le catalogue est filtré par les relations vérifiées d'organisateur, d'arbitre, d'accueil, d'opérateur terrain, d'observateur ou de participant ; aucune donnée privée n'est ajoutée à la page publique
- **Navigation** : `parcours=volunteers|referees|organizers` est une intention strictement validée pour filtrer l'affichage, jamais une permission ; `section=attendance|operations|results|arbitration|teams|bilan|settings` est accepté seulement pour le parcours compatible. Après le choix d'une édition, le lien ouvre `/spogomi/[eventSlug]/espace#section` lorsque la relation active le permet, sinon la section sûre déterminée par cette relation. La création passe par `/spogomi/nouveau` ; `/dashboard/spogomi` reste une redirection de compatibilité
- **Scénario synthétique** : l’édition Cachan mixed n’est présentée que si elle existe dans le catalogue serveur du compte organisateur autorisé. Sa carte affiche le marquage « Démonstration fictive, données synthétiques, règlement non officiel » et ouvre le cockpit canonique ; un participant multirôle reste dans le parcours bénévole lorsqu’il a choisi `parcours=volunteers`.
- **Limites** : aucun nouveau privilège, service métier, modèle de donnée ou système d'identité n'est introduit ; un participant sans fiche publique n'obtient pas de route privée de gestion

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
