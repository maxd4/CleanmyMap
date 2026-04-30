# Direction UX - Bloc Pages Standalone

## Mission

Le bloc Pages Standalone regroupe les pages transverses qui ne doivent pas etre absorbees par une logique de bloc produit. Leur role est d'offrir des points d'entree, de reglage ou de consultation autonomes, avec une UX immediate et auto-suffisante.

## Pages existantes

- `Explorer`-> `/explorer`
- `Accueil` -> `/accueil`
- `Reglages` -> `/reglages`

## Theme couleur recommande

- Axe chromatique : bleu-vert institutionnel, cyan doux, teal structurel
- Role : neutralite premium, lisibilite transverse, point d'entree stable
- Fond de bloc : `bg-[linear-gradient(180deg,rgba(28,74,95,0.95),rgba(39,85,102,0.98))]`
- Overlay / glow : `from-cyan-400/12 via-emerald-400/08 to-transparent`
- Bordure : `border-cyan-200/18`
- Hover border : `hover:border-cyan-300/34`
- Surface secondaire : `bg-[rgba(53,107,115,0.84)]`
- Ombre : `shadow-[0_24px_56px_-32px_rgba(39,195,217,0.20)]`
- Texte secondaire : `text-white/80`
- Chips / badges : `bg-cyan-400/12 text-cyan-100 border-cyan-200/16`
- Regle stricte : aucun blanc ni noir sur les surfaces, bordures, overlays ou ombres. Reserve au texte uniquement.

## Direction UX

- Chaque page doit pouvoir etre comprise sans contexte fort de bloc.
- L'accueil porte l'image produit et l'orientation initiale.
- Les reglages doivent privilegier la clarte fonctionnelle et la reduction de friction.
- Les pages standalone doivent rester sobres, nettes et tres lisibles.

## Regles d'interface

- Prioriser une hierarchie simple : intention, action, repere, confirmation.
- Eviter les compositions trop dependantes d'un contexte de navigation interne.
- Les actions principales doivent etre visibles rapidement sur desktop comme mobile.
- Les pages de preference doivent minimiser la charge cognitive et les allers-retours.

## Signaux de reussite

- L'utilisateur comprend immediatement l'objet de la page.
- La page peut vivre seule sans perdre en clarte.
- Les actions principales sont visibles sans exploration excessive.
- L'identite visuelle reste coherente avec le reste du produit sans se confondre avec un bloc metier.

## A eviter

- recycler mecanquement les codes d'un bloc produit quand la page a un role transversal
- interfaces trop denses pour des pages d'entree ou de reglage
- effets decoratifs qui concurrencent la comprehension immediate
- dependance a un contexte precedent pour comprendre la page
