# Preuves versionnées

`.artifacts/` contient les preuves et inventaires qui doivent pouvoir être
relus dans Git : validations, rapports, snapshots et autres éléments de
traçabilité explicitement conservés.

Il ne faut pas confondre ce dossier avec `artifacts/` :

```text
.artifacts/
→ preuves versionnées et contrôlées par Git

artifacts/
→ sorties locales, temporaires ou régénérables ignorées par Git
```

Ne jamais mélanger les deux emplacements. Une sortie temporaire ne doit pas
être copiée dans `.artifacts/` simplement parce qu'elle est utile localement ;
elle devient une preuve versionnée seulement si le lot l'exige et que son
contenu, sa provenance et son caractère durable sont établis.

Les dossiers de preuve doivent rester structurés par type de validation ou de
rapport. Les caches, logs de travail et résultats régénérables restent dans
`artifacts/` ou dans l'emplacement explicitement prévu par l'outil.
