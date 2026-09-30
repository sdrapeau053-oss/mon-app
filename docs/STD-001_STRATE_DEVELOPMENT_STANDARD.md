# STRATE_DEVELOPMENT_STANDARD.md
### Standard d'ingénierie de STRATE — agent-agnostique et humain-compatible
Version : 1.0 (Fondation)
Date : 2026-07-13
Statut : STABLE — modifiable uniquement via le Protocole de changement (Niveau 4)

> Ce n'est pas un prompt. C'est un standard d'ingénierie destiné à survivre à n'importe quel outil ou agent qui construit STRATE — Claude, ChatGPT, Codex, Gemini, Cursor, Windsurf, ou un futur développeur humain. Chaque règle est une exigence de résultat, jamais une instruction liée à une capacité d'outil particulière.

---

# NIVEAU 1 — GOUVERNANCE (Permanent)

Ces règles changent très rarement. Elles définissent pourquoi et selon quelle logique STRATE existe.

## 1.1 Mission

Construire une plateforme modulaire — un noyau partagé (Core) et des applications indépendantes qui s'y greffent (Relations, Atelier, Manuscrit, Business, Coffre, et au-delà) — à un niveau de qualité commerciale, maintenable pendant plusieurs années par une seule développeuse.

## 1.2 Vision

STRATE devient l'infrastructure commune de tous les projets numériques de son autrice : documentation relationnelle, création littéraire, gestion freelance, archivage personnel — chacun sous forme d'application indépendante partageant les mêmes fondations.

## 1.3 Philosophie

- Chaque module s'intègre à ce qui existe ; il ne le contourne jamais.
- Chaque règle déjà décidée s'applique ; elle n'est jamais redécidée par hypothèse.
- Un module n'est pas terminé tant qu'il n'est pas immédiatement exploitable en production.
- La documentation vivante n'est pas une option : c'est ce qui permet à STRATE de continuer d'exister sans dépendre de la mémoire d'une seule session ou d'un seul agent.

## 1.4 Principes non négociables

1. Ne jamais coder sur hypothèse. Si une information manque, arrêter et la signaler.
2. Ne jamais dupliquer une logique métier ou un composant déjà existant.
3. Ne jamais modifier un document officiel verrouillé sans autorisation explicite.
4. Ne jamais présenter une incertitude comme un fait confirmé.
5. Ne jamais casser une fonctionnalité existante sans le signaler et le justifier.

## 1.5 Hiérarchie des décisions

En cas de contradiction entre règles ou documents, l'ordre de priorité est :

1. Sécurité
2. Intégrité des données
3. Décisions d'architecture validées (`STRATE_DECISIONS.md`, statut CLÔTURÉE)
4. Domain Model (`STRATE_DOMAIN_MODEL.md`)
5. Ce Standard
6. Le prompt métier du module en cours
7. Style de code / conventions

Toute contradiction non résolue par cette hiérarchie doit être signalée, jamais tranchée silencieusement.

## 1.6 Sources de vérité

Ordre de consultation obligatoire avant tout travail :

1. `STRATE_DECISIONS.md`
2. `STRATE_DOMAIN_MODEL.md`
3. `STRATE_GLOSSARY.md`
4. `STRATE_ARCHITECTURE.md`
5. Document Fondateur / Cartographie Fonctionnelle / Backlog Produit officiels
6. `STRATE_ROADMAP.md` et `STRATE_TECH_DEBT.md`

Si une source n'est pas accessible dans la session en cours (ex. document vivant hébergé ailleurs et non fourni), le signaler explicitement plutôt que d'en supposer le contenu.

---

# NIVEAU 2 — DÉVELOPPEMENT (Permanent)

Le cœur opérationnel de la méthode.

## 2.1 Audit préalable

Avant toute implémentation, dans cet ordre :

1. Inspecter les routes existantes.
2. Inspecter les types.
3. Inspecter les composants.
4. Inspecter les hooks.
5. Inspecter les services.
6. Identifier les dépendances entrantes et sortantes.
7. Identifier les migrations nécessaires.
8. Identifier les risques de régression sur les modules déjà livrés.
9. Produire un rapport d'audit écrit.
10. Attendre validation explicite si une ambiguïté demeure.

## 2.2 Architecture

- Next.js 16.2, TypeScript strict, pages ≤ 500 lignes.
- Les composants destinés à être réutilisés entre applications STRATE sont conçus comme génériques dès leur création.
- Aucune décision d'architecture nouvelle sans consignation immédiate dans `STRATE_DECISIONS.md`.
- Aucune dépendance circulaire entre modules.

## 2.3 UX / UI

- Cohérence de navigation entre toutes les applications STRATE.
- Accessibilité WCAG 2.2 AA : contrastes, navigation clavier, labels explicites — non négociable.
- Responsive sur l'ensemble des écrans cibles.
- Aucune rupture visuelle ou comportementale non justifiée entre modules.

## 2.4 Domain Model

- Toute entité métier utilisée correspond à celle définie dans `STRATE_DOMAIN_MODEL.md`.
- Une entité manquante est d'abord proposée dans le Domain Model (statut « proposé ») avant d'être codée.
- Aucune règle métier dupliquée : réutiliser une règle existante plutôt que d'en écrire une variante.

## 2.5 Sécurité et confidentialité

- Les données sensibles ne quittent jamais le stockage prévu sans action explicite de l'utilisatrice.
- Aucune fonctionnalité n'expose les données d'un dossier vers un autre sans autorisation explicite.
- Toute nouvelle dépendance externe est justifiée et documentée avant intégration.

## 2.6 Tests

1. Tests fonctionnels sur la logique métier.
2. Tests de régression sur les modules existants susceptibles d'être affectés.
3. Vérification des cas limites identifiés dans le prompt métier.

## 2.7 Performance

- Toute opération sur un volume de données croissant est pensée pour rester fluide à l'échelle.
- Toute limite technique connue est signalée dans `STRATE_TECH_DEBT.md`, jamais ignorée.

---

# NIVEAU 3 — LIVRAISON (Permanent)

Ce qui détermine si un module peut être considéré terminé.

## 3.1 Critères de refus

Un module n'est pas terminé si :
- il introduit une hypothèse non documentée sur une donnée absente ;
- il duplique une logique ou un composant existant ;
- il crée une dépendance circulaire ;
- il modifie un document officiel verrouillé sans autorisation ;
- il casse une fonctionnalité existante sans le signaler ;
- une case de l'auto-audit reste à « non » sans justification explicite.

## 3.2 Interdictions

Il est interdit de :

- inventer une structure de données sans vérifier le dépôt ;
- créer un doublon lorsqu'un composant existe déjà ;
- modifier une migration historique déjà appliquée ;
- supprimer une donnée utilisateur sans procédure de migration documentée ;
- présenter une hypothèse comme un fait ;
- casser une API interne sans migration prévue ;
- ignorer une dette technique déjà identifiée ;
- contourner le Domain Model ;
- ajouter une dépendance externe sans justification écrite ;
- redéfinir un terme du Glossaire différemment de sa définition existante.

## 3.3 Auto-audit final

Avant de considérer un module terminé, vérifier un par un :
- [ ] Architecture respectée
- [ ] Types stricts, cohérents avec le Domain Model
- [ ] UX cohérente avec le reste de l'application
- [ ] Responsive
- [ ] Accessibilité
- [ ] Tests fonctionnels effectués
- [ ] Tests de régression effectués
- [ ] Performances acceptables
- [ ] Migrations proprement gérées, si applicable
- [ ] Cohérence avec les sources de vérité (section 1.6)

## 3.4 Documentation vivante

À la fin de chaque module, mettre à jour lorsque pertinent :
`STRATE_ARCHITECTURE.md`, `STRATE_DECISIONS.md`, `STRATE_ROADMAP.md`, `STRATE_CHANGELOG.md`, `STRATE_TECH_DEBT.md`, `STRATE_DOMAIN_MODEL.md`, `STRATE_GLOSSARY.md` (si un nouveau terme transversal apparaît).

Ces mises à jour décrivent ce qui a été fait, jamais ce qui était prévu.

## 3.5 Rapport final obligatoire

- pourquoi cette architecture a été choisie ;
- quels fichiers ont été créés ou modifiés ;
- quelles migrations ont été effectuées, s'il y a lieu ;
- quels risques résiduels subsistent ;
- quels tests ont été effectués ;
- quelles mises à jour documentaires ont été faites, et lesquelles restent à faire.

---

# NIVEAU 4 — ÉVOLUTION (Vivante)

## 4.1 Définitions (vocabulaire de gouvernance et de processus uniquement)

> Les termes métier (Observation, Preuve, Score, Pattern, Flag, etc.) sont définis exclusivement dans `STRATE_DOMAIN_MODEL.md` et référencés dans `STRATE_GLOSSARY.md`. Cette section ne couvre que le vocabulaire propre à la méthode elle-même, pour éviter toute double définition.

- **Migration** — modification contrôlée et documentée d'une structure de données existante.
- **Source de vérité** — document ou donnée faisant autorité pour une information donnée, au sens de la hiérarchie en 1.5.
- **Décision** — choix d'architecture structurant, consigné dans `STRATE_DECISIONS.md` avec statut EN ATTENTE DE DÉCISION ou CLÔTURÉE.
- **Dette technique** — amélioration identifiée mais volontairement reportée, consignée dans `STRATE_TECH_DEBT.md`.
- **Statut confirmé / partiel / proposé** — niveau de certitude d'une entité ou d'une décision : confirmé (vérifié dans le dépôt ou une source officielle), partiel (partiellement implémenté ou documenté), proposé (pas encore validé).

## 4.2 Protocole de changement

Toute modification de ce Standard (nouvelle version) répond explicitement à :
1. Pourquoi ce changement est-il nécessaire ?
2. Quel problème résout-il ?
3. Quel est son impact sur les modules déjà livrés ?
4. Comment sera-t-il documenté ?

## 4.3 Historique des versions

| Version | Date | Changement | Justification |
|---|---|---|---|
| 1.0 | 2026-07-13 | Création — renommage en Standard, restructuration en 4 niveaux, ajout Interdictions et Définitions scopées | Établir un standard d'ingénierie durable, indépendant de tout agent, avant le développement du premier module fonctionnel (SR-D-001) |
