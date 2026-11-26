# Données publiques et sciences participatives

**Statut : CURRENT.**

La route canonique /sections/open-data, alias /open-data, expose un catalogue de trois types de données dans la projection cartographique existante : action, spot, clean_place. La consultation est publique. Aucune donnée personnelle, export privé, licence ouverte générale ni disponibilité d'un corpus exhaustif n'est promis.

## Accès et méthode

GET /api/actions/map retourne un JSON borné (limit 1 à 300), type, date basse et contexte selon le contrat du serveur. Le client ne change pas les règles d'accès. L'explorateur charge à la demande, conserve la requête exécutée et l'heure UTC, affiche le nombre reçu, retenu et écarté, et signale isTruncated, partialSource ou état non établi. L'échec de lecture ne devient pas un résultat vide. La route ne garantit ni pagination exhaustive ni dénombrement total.

Pour l'échantillon des collectes, la projection exige type action, status approved, phase post_action_complete et une date non future. Les événements futurs publiés peuvent porter le statut cartographique approved ; ce statut seul est donc insuffisant. Les signalements et lieux propres ne sont pas des collectes. L'aperçu utilise une liste explicite de champs non personnels et n'affiche pas coordonnées exactes, textes libres ou identifiants de personne. Les valeurs absentes ne deviennent pas zéro ; la durée nulle historiquement ambiguë reste non renseignée. Les méthodes de masse et provenance des mégots restent distinctes.

Le dictionnaire présente les champs principaux du contrat existant ; il n'est ni un schéma OpenAPI ni un nouveau référentiel. Les limites de sélection, couverture, méthodes et représentativité sont affichées. Le protocole scientifique canonique demeure documentation/product/SCIENTIFIC_PROTOCOL.md, la méthode cartographique documentation/product/methodologie-carte-actions.md et la gouvernance documentation/architecture/data-governance.md. Les proxys environnementaux ne sont pas des mesures instrumentales.

## Conditions et collaboration

La licence AGPL couvre le code. Selon les CGU, une licence ouverte n'est définie que pour un jeu explicitement publié à cette fin ; les sources tierces gardent leurs licences. Le portail donne accès au JSON existant et à un exemple Python de consultation, pas à un export de masse ni à une autorisation de redistribution. Les demandes de corpus et de partenariat scientifique passent par /contact. La contribution terrain utilise /actions/new et /actions/map. Le financement détaillé reste sur /sections/funding et son CTA partagé existant.

Présentation : composants canoniques, cartes neutres, hiérarchie compacte, formulaire accessible et table à défilement horizontal interne. Ancres formats, api, acces-chercheurs et villes-territoires conservées. La compatibilité responsive et les tests doivent être vérifiés sur le candidat réellement exécuté.
