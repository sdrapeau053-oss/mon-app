# STRATE_DOMAIN_MODEL.md
### Modèle métier — définit les concepts, pas le code
Dernière mise à jour : —

> Ce document décrit les entités métier partagées entre toutes les applications STRATE : leur définition, leurs attributs, leurs relations, leurs règles, leur cycle de vie.
> Objectif : que chaque nouveau module (Relations, Atelier, Manuscrit, Business, Coffre) réutilise les mêmes concepts au lieu de les réinventer.

Format par entité :
```
### Nom de l'entité

Définition :
Attributs :
Relations :
Règles métier :
Autorisé :
Interdit :
Cycle de vie :
```

---

## Entités identifiées (STRATE Relations)

### Relation
*(à compléter)*

### Personne
*(à compléter)*

### Conversation
Définition : objet chronologique de premier niveau représentant un échange complet sur une plateforme donnée.
Attributs : date de début, date de fin, plateforme, personnes impliquées, nombre de messages.
Relations : contient des Messages ; appartient à une Relation.
Règles métier : repliée par défaut dans la chronologie ; développable pour afficher les messages individuels.
Autorisé : filtrage au niveau conversation ou au niveau message si développée.
Interdit : —
Cycle de vie : créée à l'import, jamais modifiée rétroactivement sauf correction explicite de l'utilisatrice.

### Message
*(à compléter)*

### Événement
*(à compléter)*

### Observation
*(à compléter)*

### Preuve
*(à compléter)*

### Flag
*(à compléter)*

### Pattern
*(à compléter)*

### Score
*(à compléter)*

### Rapport
*(à compléter)*

### Décision (utilisateur, dans le cadre d'un dossier)
*(à compléter — ne pas confondre avec STRATE_DECISIONS.md, qui concerne les décisions d'architecture logicielle)*

### Historique
*(à compléter)*
