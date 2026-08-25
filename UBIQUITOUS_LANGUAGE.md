# Ubiquitous Language

## Termes canoniques

| Terme | Définition | À éviter |
| --- | --- | --- |
| `WasteCategorySlug` | Identifiant métier stable d'une catégorie de déchet globale | Créer un slug dépendant d'une page ou de Trash Spotter |
| Famille | Regroupement métier large (`nicotine`, `packaging`, `hazardous`, etc.) | Confondre famille et filière locale |
| Zone de danger | Niveau indicatif de précaution avant manipulation | Présenter le niveau comme une habilitation réglementaire |
| Politique de prise en charge | Capacité d'une collecte terrain générique selon l'équipement et la formation | Déduire qu'un déchet est toujours ramassable |
| Filière indicative | Route de traitement ou de dépôt à vérifier localement | Affirmer une règle universelle de tri |
| Déchet résiduel mélangé | Matière non recyclable ou mélange qui ne peut pas être trié sûrement | Employer « mixte » sans expliquer le périmètre |
| Verre cassé | Verre présentant un risque de coupure | Le traiter comme du verre d'emballage |
| Objet piquant ou coupant | Déchet nécessitant sécurisation, signalement ou service habilité | Le ranger dans « autre » par défaut |
| Adaptateur legacy | Conversion temporaire d'un ancien identifiant vers un slug canonique | Modifier silencieusement le payload historique |
| Signalement Trash Spotter | Provenance d'un point `spot` ou `clean_place` | En faire une taxonomie de déchets |

## Relations

- Une `WasteCategorySlug` appartient à une famille et porte une consigne de
  sécurité.
- Une catégorie peut avoir une filière indicative différente selon le
  territoire.
- Un champ historique d'action peut être converti par l'adaptateur legacy sans
  changer le stockage.
- Un signalement peut être géolocalisé sans contenir une catégorie de déchet.

## Dialogue d'exemple

**Produit :** Le formulaire doit-il remplacer `megots` par `cigarette_butt` ?

**Domaine :** Pas dans ce lot : `megots` est un identifiant de transport
historique. Il est adapté vers `cigarette_butt` et son label vient du registre.

**Produit :** Le point Trash Spotter devient-il une catégorie ?

**Domaine :** Non. C'est une provenance de signalement ; la catégorie de déchet
reste globale et indépendante.

**Produit :** Peut-on ramasser du verre cassé avec les mêmes règles que le verre ?
**Domaine :** Non. `broken_glass` a un niveau de danger et une politique de
prise en charge distincts.

## Ambiguïtés à surveiller

- `glass` désigne ici principalement le verre d'emballage ; vaisselle,
  miroir, céramique et verre cassé ne doivent pas être déduits de ce slug.
- `other` indique que la catégorie n'est pas connue ; il ne signifie pas que
  la collecte est sûre.
- `disposalRoute` est une route indicative, pas la confirmation d'un service
  disponible dans la commune.
- Les mots-clés de l'assistant recyclage et les taxonomies de quiz restent des
  contenus pédagogiques compatibles, mais leur vocabulaire doit progressivement
  pointer vers les slugs canoniques.
