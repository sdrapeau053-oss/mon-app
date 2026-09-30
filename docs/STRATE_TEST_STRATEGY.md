# STRATE_TEST_STRATEGY.md
### STD-009 — Stratégie de test unique pour tous les modules STRATE
Dernière mise à jour : 2026-07-13

> Ce document centralise tout ce qui concerne les tests. Le Standard (STD-001) n'énonce plus les règles de test en détail : il renvoie ici.

---

## Philosophie

Un test ne prouve pas qu'un module est parfait. Il prouve qu'un comportement attendu reste vrai après un changement. La priorité va aux tests qui protègent contre la régression silencieuse, pas à la couverture pour la couverture.

## Niveaux de tests

1. **Tests fonctionnels** — la logique métier (calculs, scores, règles) produit le résultat attendu.
2. **Tests de régression** — un module déjà livré continue de fonctionner après l'ajout d'un nouveau module.
3. **Tests de cas limites** — les scénarios identifiés comme limites dans le prompt métier sont vérifiés explicitement.
4. **Tests d'accessibilité** — navigation clavier, contrastes, labels, conformité WCAG 2.2 AA.
5. **Tests de migration** — toute migration de données est vérifiée avant et après exécution, sur une copie si possible.

## Couverture minimale obligatoire

- Toute fonction de calcul ou de règle métier (score, radar, flag, pattern) : couverte par un test fonctionnel avant d'être considérée terminée.
- Tout module modifiant une structure de données existante : couvert par un test de migration.
- Tout module affectant la navigation ou l'UI partagée : vérifié manuellement pour non-régression visuelle.

## Conventions et nomenclature

- Nom de test : décrit le comportement attendu, pas l'implémentation (`calcule le score global à partir des observations`, pas `test1`).
- Un fichier de test par module ou entité testée, nommé de façon cohérente avec le fichier source.

## Tests obligatoires

- Toute entité du Domain Model (STD-003) ayant une règle métier explicite doit avoir au moins un test qui vérifie cette règle.
- Toute migration doit avoir un test de non-perte de données.

## Tests interdits

- Aucun test qui dépend de données réelles sensibles de l'utilisatrice (dossiers relationnels réels, preuves réelles) : utiliser des données de test fictives uniquement.
- Aucun test qui masque un échec réel (ex. assertions désactivées, tests systématiquement ignorés sans justification documentée dans STRATE_TECH_DEBT.md).

## Données de test

- Toujours fictives, jamais extraites d'un dossier réel.
- Représentatives des cas limites documentés (volumes faibles, volumes élevés, données manquantes, doublons).

## Performance

- Tout test sur un jeu de données volumineux doit vérifier que le temps de traitement reste acceptable à l'échelle prévue (voir STD-001, section 2.7).

## Accessibilité

- Vérification manuelle minimale : navigation complète au clavier, lecteur d'écran sur les parcours critiques, contraste des couleurs.

## Pyramide de tests

Ordre de priorité, du plus rapide au plus lent :

1. Tests unitaires
2. Tests d'intégration
3. Tests UI
4. Tests end-to-end

Les tests les plus rapides sont privilégiés. Un test end-to-end ne remplace jamais un test métier — il vérifie le parcours, pas la justesse du calcul.

## Critères de réussite

Un module ne peut être considéré terminé que si :

- [ ] toutes les règles métier critiques sont couvertes par un test ;
- [ ] les migrations sont testées ;
- [ ] aucun test existant ne casse ;
- [ ] les régressions critiques sur les modules déjà livrés sont vérifiées ;
- [ ] les cas limites documentés dans le prompt métier sont couverts.

## Tests négatifs

Un test ne doit pas seulement vérifier qu'un comportement fonctionne : il doit vérifier que les erreurs sont correctement gérées. À couvrir systématiquement :

- entrée invalide ;
- migration interrompue en cours d'exécution ;
- storage corrompu ;
- permission refusée ;
- données absentes ou incomplètes.

## Tests de sécurité

- Aucune donnée sensible ne doit apparaître dans les logs.
- Validation des permissions avant tout accès à un dossier ou une donnée.
- Comportement sur import malformé.
- Comportement sur export incomplet ou interrompu.
- Tentative de corruption volontaire des données de test.
- Vérification du chiffrement, si applicable au module.

## Stratégie de mocks

**Toujours mocker :**
- le temps ;
- les identifiants générés (UUID) ;
- les API externes ;
- l'horloge système ;
- les valeurs aléatoires.

**Ne jamais mocker :**
- la logique métier elle-même — un mock ne doit jamais masquer si une règle métier est juste ou fausse.

## Données minimales de test

Chaque module doit disposer de :
- un dataset minimal (cas le plus simple) ;
- un dataset standard (cas courant représentatif) ;
- un dataset volumineux (test de charge/performance) ;
- un dataset corrompu (test de robustesse).

Ainsi, tous les modules sont vérifiés selon les mêmes catégories, sans réinventer la logique de test à chaque fois.

## Rapport de tests

À la fin de chaque module, produire un tableau récapitulatif :

| Catégorie | Résultat |
|---|---|
| Fonctionnels | ✅ / ❌ |
| Migration | ✅ / ❌ |
| Accessibilité | ✅ / ❌ |
| Régression | ✅ / ❌ |
| Cas limites | ✅ / ❌ |
| Sécurité | ✅ / ❌ |
| Négatifs | ✅ / ❌ |

Toute case ❌ doit être expliquée dans le rapport final du module (voir STD-001, section 3.5), pas seulement signalée.

---

## Historique des versions

| Version | Date | Changement |
|---|---|---|
| 1.0 | 2026-07-13 | Création — fondation |
| 1.1 | 2026-07-13 | Ajout : pyramide de tests, critères de réussite, tests négatifs, tests de sécurité, stratégie de mocks, données minimales de test, rapport de tests |
