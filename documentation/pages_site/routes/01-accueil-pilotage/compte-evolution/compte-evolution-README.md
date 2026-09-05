# Évolution du compte

- **Route** : `/compte/evolution`
- **Fichier source** : `apps/web/src/app/(app)/compte/evolution/page.tsx`
- **Type fonctionnel** : page de compte protégée
- **Famille / bloc fonctionnel** : Accueil & Pilotage
- **Objectif utilisateur principal** : comprendre le niveau obtenu, le rôle utilisé et l’état de sa demande d’évolution.
- **Surface canonique** : le formulaire `PromotionRequestForm` et le suivi des demandes sont centralisés ici.
- **Accès** : utilisateur authentifié ; la lecture API est limitée aux demandes du userId Clerk courant.
- **Rôles ouverts** : Bénévole, Association, Scientifique, Entreprise.
- **Rôles obtenus** : Élu·e et Administrateur, après acceptation IMU.
- **Hors parcours** : IMU.

La demande n’altère jamais le niveau obtenu. Une demande en attente remplace le formulaire par son état d’examen ; une demande refusée peut être renouvelée si le niveau courant l’autorise ; une demande acceptée est reflétée après synchronisation du compte.
