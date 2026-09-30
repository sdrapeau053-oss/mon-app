# IDENTITÉ AUTEUR — Architecture maître STRATE

Statut du document : architecture de référence pour le futur module `Identité Auteur`.

Périmètre de ce document :

- `VALIDÉ` : décisions humaines et éditoriales confirmées.
- `À VALIDER` : décisions encore ouvertes.
- `PROPOSÉ` : choix d'architecture recommandés, non implémentés.
- `LEGACY` : systèmes existants à conserver/protéger.
- `INTERDIT` : actions ou usages proscrits.

## 1. Résumé exécutif

Le futur module `Identité Auteur` doit être créé comme un système isolé, non destructif, localStorage-first, destiné à devenir la source de vérité de l'identité publique d'une autrice. Il ne doit pas remplacer `/biographie`, ne doit pas modifier `/manuscrit`, et ne doit pas réutiliser `localStorage["biographie-projet"]`.

Décisions `VALIDÉ` :

- Identité civile : `Sylvie Drapeau`.
- Statut de l'identité civile : identité privée par défaut.
- Identité d'autrice officielle : `Léna Montand`.
- Statut du nom d'autrice : nom d'autrice public officiel.
- Relation : `Sylvie Drapeau` et `Léna Montand` désignent la même personne, mais STRATE doit les traiter avec des niveaux de visibilité différents.
- Formulation publique de référence : `Léna Montand est une autrice canadienne établie au Québec.`
- Titre professionnel principal : `Autrice`.
- Oeuvre principale structurante : `L'Héritage des Silences`.
- Nature de l'oeuvre : récit autobiographique littéraire en quatre tomes.
- Premier tome : `Tome I — Le gel et la lumière`.

Décisions `INTERDIT` :

- Ne pas utiliser `Drummondville` comme localisation publique par défaut.
- Ne pas exposer automatiquement l'identité civile dans les contenus publics produits par STRATE.
- Ne pas réduire automatiquement l'identité publique de Léna Montand à un statut de victime, survivante, sujet judiciaire, histoire traumatique ou témoignage médiatique.
- Ne pas inventer de ville précise, profession supplémentaire, diplôme, distinction, prix, publication, maison d'édition, statut professionnel, expérience, événement biographique ou information personnelle.

La recommandation est de créer un nouveau domaine applicatif autour d'un `AuthorIdentityProfile` versionné, stocké dans une nouvelle clé dédiée `author-identity-profile`. Les générations IA doivent produire des brouillons traçables, jamais des faits. Le flux attendu est : faits validés -> profil auteur -> génération IA -> brouillon -> validation humaine -> version approuvée.

MVP recommandé : profil auteur, faits validés, oeuvres, génération de bio via route API serveur, historique, comparaison simple, approbation/rejet, export/copie. Tout le reste, notamment dossiers presse complets, droits, conférences avancées, profils numériques et validation phrase par phrase, doit rester en phase ultérieure.

Note de portée `VALIDÉ` : `Identité Auteur` doit pouvoir accueillir de futures oeuvres, publications, projets littéraires, interventions médiatiques, conférences, collaborations et dossiers de presse. Le système ne doit donc pas être architecturé comme un module limité à `L'Héritage des Silences`.

## 2. État actuel vérifié

Audits demandés :

- `AUDIT_STRATE_PROMPTS.md` : À VÉRIFIER. Le fichier n'a pas été trouvé dans `/Users/growingandchanging/mon-app` ni dans les chemins accessibles vérifiés.
- `BIOGRAPHIE_CONTENU_COMPLET.md` : À VÉRIFIER. Le fichier n'a pas été trouvé dans `/Users/growingandchanging/mon-app` ni dans les chemins accessibles vérifiés.
- `BIOGRAPHIE_AUDIT_TECHNIQUE.md` : À VÉRIFIER. Le fichier n'a pas été trouvé dans `/Users/growingandchanging/mon-app` ni dans les chemins accessibles vérifiés.

Code réel vérifié :

- `/Users/growingandchanging/mon-app/package.json` : Next `16.2.0`, React `19.2.4`, TypeScript, Vitest, `@anthropic-ai/sdk`, `@supabase/supabase-js`. Aucun `zod`, `valibot` ou bibliothèque de validation runtime déclarée directement.
- `/Users/growingandchanging/mon-app/app/layout.tsx` : navigation globale rendue via `components/ConditionalNav`.
- `/Users/growingandchanging/mon-app/components/ConditionalNav.tsx` : masque la navigation uniquement sur `/login`.
- `/Users/growingandchanging/mon-app/components/GlobalNavigation.tsx` : navigation principale codée localement dans `navGroups`.
- `/Users/growingandchanging/mon-app/lib/strateRoutes.ts` : registre de routes STRATE séparé, utilisé comme carte logique/stratégique, mais pas confirmé comme source unique de navigation visible.
- `/Users/growingandchanging/mon-app/app/biographie/page.tsx` : ancien gestionnaire autobiographique local, avec tomes et chapitres, lié à `app/lib/biographie.ts`.
- `/Users/growingandchanging/mon-app/app/lib/biographie.ts` : moteur historique de `/biographie`; clé `localStorage["biographie-projet"]`.
- `/Users/growingandchanging/mon-app/lib/tome1-chapters.ts` : socle canonique actuel du Tome I; clé `localStorage["chapitres-tome-1"]`; 30 chapitres normalisés.
- `/Users/growingandchanging/mon-app/app/manuscrit/page.tsx` : module manuscrit existant, à protéger.
- `/Users/growingandchanging/mon-app/lib/manuscript-source.ts` : agrège chapitres Tome I, fragments et relations narratives.
- `/Users/growingandchanging/mon-app/lib/fragments.ts` : source centrale des fragments; clé `localStorage["fragments"]`.
- `/Users/growingandchanging/mon-app/lib/manuscript-structure.ts` : architecture historique/parallèle; clés `structure-tomes` et `structure-chapitres`.
- `/Users/growingandchanging/mon-app/lib/book-settings.ts` : paramètres livre; clé `book-settings`; auteur par défaut `Léna Montand`.
- Routes API Anthropic existantes : `/api/agent`, `/api/analyser`, `/api/detecteur-voix`, `/api/decisions`, `/api/faiblesses`, plusieurs routes d'audit. Elles utilisent `ANTHROPIC_API_KEY` côté serveur.

Divergence documentaire :

- La mission indique que des audits existent et doivent être utilisés. Dans l'état accessible du dépôt, ils sont absents. Le rapport se fonde donc sur le code réel, prioritaire selon la mission.

## 3. Problèmes à résoudre

1. `/biographie` porte un nom ambigu : il gère une autobiographie structurée, pas une biographie publique d'autrice.
2. Les identités `Sylvie Drapeau` et `Léna Montand` existent dans le système, mais il n'existe pas encore de frontière de données stricte entre identité civile privée et identité publique d'autrice.
3. Les routes IA actuelles contiennent leurs prompts directement dans les fichiers API, ce qui limite la traçabilité et le versionnage.
4. Plusieurs sources manuscrit coexistent : `chapitres-tome-1`, `fragments`, `structure-tomes`, `structure-chapitres`, `biographie-projet`.
5. Aucun module ne gouverne actuellement les faits publics validés, les restrictions d'usage, les versions approuvées ou les sorties professionnelles.
6. La génération IA peut aider, mais sans gouvernance elle risque d'inventer publications, distinctions, titres, diagnostics ou positions publiques.
7. Le futur système doit distinguer explicitement la bio publique de l'autrice du manuscrit autobiographique. La bio publique décrit l'autrice; elle ne remplace pas et ne pilote pas `L'Héritage des Silences`.

## 4. Principes architecturaux

- Nouveau système isolé : ne pas réutiliser `biographie-projet`.
- Faits avant génération : l'IA ne crée jamais de vérité.
- Validation humaine obligatoire : aucun texte généré ne devient approuvé automatiquement.
- Lecture seule vers le manuscrit : `Identité Auteur` peut lire certaines métadonnées, jamais posséder le manuscrit.
- Données versionnées : profil, prompt et sorties doivent porter une version.
- LocalStorage-first : conserver la stratégie actuelle avec validation runtime.
- Migration non destructive : aucune synchronisation automatique entre systèmes historiques.
- Minimalisme MVP : peu de fichiers, peu d'écrans, mais des frontières nettes.
- Séparation des responsabilités `VALIDÉ` : `FACTS`, `POSITIONING`, `VOICE`, `DISCLOSURE`, `OUTPUT`, `APPROVAL` et `VERSIONING` ne doivent pas être mélangés dans un seul champ texte ou un seul prompt.
- Règle de non-réduction `VALIDÉ` : `NON_REDUCTION_RULE`.

`NON_REDUCTION_RULE` :

- Le système doit distinguer `QUI EST L'AUTRICE` de `CE QU'ELLE A VÉCU`.
- Un événement biographique, même majeur ou médiatisé, ne doit jamais devenir automatiquement la définition principale de l'autrice.
- Léna Montand doit être présentée d'abord comme `Autrice`.
- Les éléments sensibles ou traumatiques peuvent faire partie de son histoire lorsque le contexte le justifie, mais ils ne constituent pas son identité publique principale.

## 5. Source de vérité

Source de vérité `PROPOSÉ` :

- Clé principale : `author-identity-profile`
- Responsabilité : profil auteur complet, faits validés, oeuvres, restrictions, niveaux de divulgation, bios et historique.
- Format : objet JSON versionné.
- Propriétaire : futur domaine `lib/author-identity`.

Règles de source de vérité `VALIDÉ` :

- Le futur générateur de biographies ne doit jamais reconstruire des faits à partir de suppositions.
- Il doit fonctionner uniquement avec des données validées, le contexte demandé, les faits autorisés pour ce contexte et les règles éditoriales validées.
- Si une information manque : ne pas l'inventer.
- Aucun fait sensible non validé ne doit être utilisé dans une biographie publique.

Clés à ne pas réutiliser :

- `biographie-projet` : ancien module autobiographique.
- `chapitres-tome-1` : manuscrit canonique Tome I.
- `fragments` : matière narrative centrale.
- `structure-tomes` / `structure-chapitres` : structure historique/parallèle.

Clés optionnelles futures :

- `author-identity-generations` : historique volumineux si le profil devient trop gros.
- `author-identity-backups` : sauvegardes locales contrôlées si nécessaire.

Recommandation MVP : commencer avec une seule clé `author-identity-profile` pour éviter une fragmentation prématurée.

## 6. Modèle de domaine

Entités MVP :

- `AuthorIdentityProfile` : source de vérité.
- `PublicIdentity` : nom d'autrice, territoire, langues, voix publique.
- `CivilIdentity` : identité civile, privée par défaut.
- `AuthorFact` : fait source gouverné, sensible ou non, avec contexte autorisé/interdit.
- `Work` : oeuvre ou projet littéraire.
- `AuthorBioVersion` : bio brouillon/approuvée/rejetée/archivée.
- `AuthorGenerationRecord` : trace d'une génération IA.
- `AuthorIdentitySettings` : règles de sortie et préférences.

Entités phase ultérieure :

- `PressKit`
- `MediaPresentation`
- `ConferenceProfile`
- `RightsProfile`
- `DigitalProfile`
- `ProfessionalContactContext`

## 7. Types TypeScript proposés

```ts
export type IdentityVisibility = "private" | "internal" | "public" | "context_restricted";

export type ValidationStatus = "imported" | "inferred" | "unverified" | "validated" | "obsolete" | "rejected";

export type SensitivityLevel = "none" | "low" | "medium" | "high" | "restricted";

export type DisclosureLevel = "public_general" | "professional_press" | "controlled_interview";

export type FactCategory =
  | "identity"
  | "location"
  | "language"
  | "work"
  | "theme"
  | "positioning"
  | "biographical"
  | "professional"
  | "restriction";

export type SourceType = "human" | "legacy_import" | "manuscript_metadata" | "ai_draft" | "external";

export type BioUsage =
  | "very_short_bio"
  | "short_bio"
  | "medium_bio"
  | "long_bio"
  | "site_author"
  | "press_kit"
  | "publisher"
  | "agent"
  | "back_cover"
  | "conference"
  | "festival"
  | "podcast"
  | "radio"
  | "television"
  | "media"
  | "interview_presentation"
  | "literary_event"
  | "grant"
  | "rights_catalog"
  | "professional_network";

export type LocaleTarget =
  | "fr-CA"
  | "fr-FR"
  | "fr-INTL"
  | "en-CA"
  | "en-INTL";

export type BioLengthProfile =
  | "very_short"
  | "short"
  | "medium"
  | "long"
  | "press"
  | "conference"
  | "site"
  | "back_cover"
  | "agent_publisher";

export type BioStatus = "draft" | "approved" | "rejected" | "archived";

export type WorkStatus = "drafting" | "in_revision" | "completed" | "submitted" | "published" | "paused";

export type WorkType = "autobiographical_literary_narrative" | "novel" | "essay" | "poetry" | "other";

export type AuthorFact = {
  id: string;
  category: FactCategory;
  statement: string;
  visibility: IdentityVisibility;
  source: string;
  sourceType: SourceType;
  verificationStatus: ValidationStatus;
  sensitivity: SensitivityLevel;
  allowedContexts: DisclosureLevel[];
  prohibitedContexts: DisclosureLevel[];
  publicWording?: string;
  internalNotes?: string;
  approved: boolean;
  approvedAt?: string;
  validatedAt?: string;
  allowedUsages?: BioUsage[];
  forbiddenUsages?: BioUsage[];
};

export type Work = {
  id: string;
  title: string;
  subtitle?: string;
  type: WorkType;
  status: WorkStatus;
  territory?: string;
  languages: LocaleTarget[];
  themes: string[];
  validatedDescription?: string;
  publicationInfo?: {
    publisher?: string;
    publicationDate?: string;
    isbn?: string;
  };
  sourceFactIds: string[];
};

export type AuthorBioVersion = {
  id: string;
  createdAt: string;
  usage: BioUsage;
  language: LocaleTarget;
  territory?: string;
  grammaticalPerson: "first" | "third";
  tone: "sobre" | "litteraire" | "institutionnel" | "media" | "professionnel";
  lengthProfile: BioLengthProfile;
  text: string;
  sourceFactIds: string[];
  status: BioStatus;
  profileSchemaVersion: number;
  profileVersion: string;
  promptVersion?: string;
  model?: string;
  warnings: string[];
};

export type AuthorIdentityProfile = {
  schemaVersion: 1;
  id: "author-identity-profile";
  updatedAt: string;
  profileVersion: string;
  civilIdentity: {
    name: string;
    visibility: "private";
  };
  publicIdentity: {
    authorName: string;
    territory?: string;
    languages: LocaleTarget[];
    referencePublicStatement: string;
    primaryProfessionalTitle: "Autrice";
    positioning: string;
    publicVoice: string[];
  };
  works: Work[];
  authorFacts: AuthorFact[];
  bios: AuthorBioVersion[];
  restrictions: {
    nonReductionRule: "NON_REDUCTION_RULE";
    forbiddenClaims: string[];
    forbiddenTone: string[];
    privateTopics: string[];
  };
  history: AuthorGenerationRecord[];
};

export type AuthorGenerationRecord = {
  id: string;
  createdAt: string;
  outputType: "bio";
  usage: BioUsage;
  language: LocaleTarget;
  model: string;
  promptVersion: string;
  profileVersion: string;
  sourceFactIds: string[];
  generatedText: string;
  warnings: string[];
  status: BioStatus;
};
```

Champ `confidence` :

- Non recommandé pour les faits explicitement validés par l'utilisatrice.
- Possible uniquement pour des éléments importés/inférés, mais le statut `verificationStatus` est plus lisible pour le MVP.

Compatibilité de nommage :

- `AuthorFact` remplace conceptuellement l'ancien nom `ValidatedFact`.
- Si l'implémentation choisit de conserver `ValidatedFact` pour cohérence locale, elle doit néanmoins inclure les responsabilités `statement`, `source`, `verificationStatus`, `sensitivity`, `allowedContexts`, `prohibitedContexts`, `publicWording`, `internalNotes`, `approved` et `approvedAt`.

## 8. Gouvernance des faits

Règle centrale : l'IA ne constitue jamais une source de vérité.

Règles `VALIDÉ` :

- Ne pas décider maintenant quels faits sensibles seront publics.
- Prévoir seulement le mécanisme permettant leur classification future.
- Un fait sensible non validé ne doit jamais être utilisé dans une biographie publique.
- Aucun fait sensible ne doit passer automatiquement d'un niveau de divulgation à un autre.

Flux obligatoire :

1. Création ou import d'un fait.
2. Marquage `unverified`, `imported` ou `inferred`.
3. Validation humaine explicite.
4. Passage à `validated`.
5. Utilisation seulement si `visibility`, `sensitivity`, `allowedContexts` et `allowedUsages` autorisent le contexte.
6. Génération IA d'un brouillon.
7. Revue humaine.
8. Approbation ou rejet.

Interdictions :

- Une bio générée ne modifie jamais `authorFacts`.
- Une sortie Anthropic ne passe jamais automatiquement à `approved`.
- Un fait privé n'est jamais injecté dans une bio publique sans autorisation explicite.
- Un contexte presse ou entrevue ne débloque jamais automatiquement l'identité civile.

## 9. Confidentialité et visibilité

Niveaux :

- `private` : non transmissible au modèle pour sortie publique.
- `internal` : visible dans STRATE, utilisable seulement pour contexte interne.
- `public` : utilisable pour bios publiques.
- `context_restricted` : utilisable seulement dans certains usages définis.

Identités :

- Identité civile `VALIDÉ` : `Sylvie Drapeau`, privée par défaut.
- Nom d'autrice `VALIDÉ` : `Léna Montand`, nom d'autrice public officiel.
- Relation `VALIDÉ` : ces deux identités désignent la même personne, avec des niveaux de visibilité différents.

Règle UX : l'interface doit afficher explicitement quel nom sera utilisé avant génération.

Niveaux de contexte public `VALIDÉ` :

### Niveau 1 — Public général

Utilisable pour :

- site officiel;
- quatrième de couverture;
- réseaux sociaux;
- plateformes littéraires;
- événements publics;
- présentations générales.

Règle : niveau le plus sobre. Aucun fait sensible ne doit être inclus automatiquement.

### Niveau 2 — Professionnel / presse

Utilisable pour :

- journalistes;
- TVA Nouvelles ou autres médias;
- maisons d'édition;
- agents littéraires;
- relationnistes;
- organisateurs;
- dossiers de presse.

Règle : peut contenir davantage de contexte biographique, mais uniquement à partir de faits explicitement validés et autorisés pour ce contexte.

### Niveau 3 — Entrevue journalistique contrôlée

Utilisable lorsqu'une entrevue nécessite d'aborder certains événements personnels ou publics.

Ce niveau doit permettre de préparer :

- faits autorisés;
- faits interdits;
- sujets sensibles;
- formulations approuvées;
- limites de divulgation;
- messages centraux;
- sujets nécessitant une validation humaine.

Règle : aucun fait sensible ne doit passer automatiquement d'un niveau à un autre.

## 10. Architecture IA

Flux technique cible :

CLIENT `/identite-auteur`
-> `POST /api/identite-auteur/generate`
-> validation runtime de la requête
-> lecture du profil autorisé côté client envoyé ou payload validé
-> filtrage des faits autorisés
-> prompt versionné
-> Anthropic via `ANTHROPIC_API_KEY` serveur
-> extraction JSON
-> validation runtime de sortie
-> retour d'un brouillon
-> sauvegarde après confirmation humaine.

Clé :

- `ANTHROPIC_API_KEY` reste serveur uniquement.

À prévoir :

- timeout 20-30 secondes.
- erreur claire si clé manquante.
- modèle configurable côté serveur.
- pas de journalisation du texte privé en console production.
- `max_tokens` selon longueur.
- prompt système versionné.
- schéma d'entrée strict.
- schéma de sortie validé.
- conservation du texte original.
- comparaison avant/après.
- versionnage des biographies approuvées.
- traçabilité des faits utilisés.

Règles IA `VALIDÉ` :

- Génération considérée comme `BROUILLON`.
- Validation humaine obligatoire avant adoption.
- Utilisation exclusive de faits approuvés et autorisés pour le contexte demandé.
- Aucune invention factuelle.
- Gestion explicite des erreurs.

## 11. Anti-hallucination et traçabilité

Sortie IA recommandée :

```ts
export type AuthorBioGenerationResponse = {
  text: string;
  sourceFactIds: string[];
  warnings: string[];
  rejectedClaims?: string[];
};
```

Contrôles MVP :

- vérifier que chaque `sourceFactId` existe;
- vérifier que les faits utilisés sont autorisés pour l'usage demandé;
- détecter des mots/affirmations interdites simples : prix, publication, maison d'édition, média, diagnostic, ventes, classement, diplôme, conférence;
- afficher `warnings` au lieu de bloquer automatiquement, sauf violation de visibilité privée.

Contrôle phrase -> faits :

- Pertinent en phase ultérieure pour presse/éditeur.
- Trop lourd pour MVP si fait manuellement phrase par phrase.

Limite documentée : aucun contrôle automatique ne garantit l'absence absolue d'hallucination.

## 12. Versionnage des prompts

Architecture proposée :

- `/Users/growingandchanging/mon-app/lib/prompts/author-identity/index.ts`
- `/Users/growingandchanging/mon-app/lib/prompts/author-identity/bio-generation.ts`
- `/Users/growingandchanging/mon-app/lib/prompts/author-identity/output-config.ts`

Chaque prompt exporte :

- `PROMPT_VERSION`
- `SYSTEM_PROMPT`
- config de longueur
- règles anti-hallucination
- format JSON attendu

Chaque `AuthorBioVersion` conserve `promptVersion`.

## 13. Stockage et versionnage du schéma

Clé MVP :

- `author-identity-profile`

Schéma :

- `schemaVersion: 1`
- `profileVersion`: identifiant de version logique, par exemple timestamp ISO ou `v1-YYYYMMDD-HHMMSS`.
- `updatedAt`: ISO string.

Helpers nécessaires :

- lire profil;
- sauvegarder profil;
- normaliser profil;
- exporter JSON;
- importer JSON après validation;
- créer backup manuel;
- détecter corruption JSON.

Récupération après corruption :

- ne jamais écraser la valeur illisible;
- afficher erreur;
- permettre export brut de la clé corrompue;
- proposer réinitialisation seulement après confirmation.

## 14. UX proposée

Route MVP :

- `/identite-auteur`
- Statut de route : `PROPOSÉ`, non implémenté dans cette mission.

Structure d'écran compacte :

- Header : `Identité Auteur`, sous-titre discret, statut du profil.
- Onglets ou segments : `Identité`, `Faits`, `Œuvres`, `Bios`, `Historique`.
- Panneau latéral ou drawer pour créer/modifier un fait.
- Zone génération bio uniquement dans l'onglet `Bios`.

Principes :

- pas de grosses cartes;
- densité éditoriale;
- libellés clairs : public/privé/interdit;
- bouton principal unique par contexte;
- comparaison version approuvée vs brouillon avant approbation.

Navigation `À VALIDER` :

- Emplacement recommandé : créer un groupe ou sous-groupe `Auteur` dans la navigation STRATE, distinct de `Manuscrit`.
- Raison : l'identité publique de l'autrice est liée à l'oeuvre, mais elle ne doit pas être confondue avec le manuscrit autobiographique ni avec le module legacy `/biographie`.
- Alternative possible : placer `/identite-auteur` près des outils éditoriaux si STRATE consolide une zone `Publication / Auteur`.
- Statut : `À VALIDER`.
- Interdiction de mission : ne modifier aucune navigation maintenant.

## 15. Internationalisation

Locales prévues :

- `fr-CA`
- `fr-FR`
- `fr-INTL`
- `en-CA`
- `en-INTL`

Règles :

- Une version anglaise peut être une adaptation éditoriale, pas une traduction littérale.
- Champ à prévoir : `translationMode: "translation" | "editorial_adaptation" | "independent_approved_version"`.
- Les bios approuvées sont indépendantes par locale.
- Les conventions éditoriales du marché cible doivent primer sur une traduction mot à mot lorsqu'une adaptation professionnelle est requise.

## 15.1 Formats de biographies à prévoir

Formats `VALIDÉ` à supporter architecturalement :

- bio très courte;
- bio courte;
- bio moyenne;
- bio longue;
- bio site officiel;
- bio quatrième de couverture;
- bio maison d'édition;
- bio agent littéraire;
- bio dossier de presse;
- bio média;
- présentation d'entrevue;
- présentation de conférence;
- présentation pour événement littéraire.

Variantes `VALIDÉ` :

- première personne;
- troisième personne;
- français;
- anglais.

## 16. Relations avec les autres modules STRATE

Distinction absolue des systèmes `VALIDÉ` :

- `BIO D'AUTRICE PUBLIQUE` : décrit l'autrice et ses sorties publiques contrôlées.
- `MANUSCRIT AUTOBIOGRAPHIQUE` : reste géré par son système canonique.
- `L'Héritage des Silences` ne doit pas être remplacé, piloté ni migré par `Identité Auteur`.

Manuscrit :

- Source : `lib/tome1-chapters.ts`, `chapitres-tome-1`.
- Consommateur : `Identité Auteur`, lecture optionnelle.
- Données accessibles : titre oeuvre, titre tome, statut global, thèmes validés si exposés explicitement.
- Écriture : interdite.

Fragments :

- Source : `lib/fragments.ts`, `fragments`.
- Consommateur : `Identité Auteur`, non recommandé pour MVP.
- Données accessibles : aucune par défaut, car matière autobiographique privée.
- Écriture : interdite.

Livre virtuel :

- Source : `/manuscrit`, `lib/manuscript-source.ts`.
- Relation : aucune dépendance directe MVP.

StyleDNA :

- Fichier exact : À VÉRIFIER. Routes/composants repérés : `/style-dna`, `components/StyleDNA.tsx`.
- Relation : phase ultérieure seulement pour cohérence de voix publique.

Contrôle éditorial :

- Fichier exact repéré : `components/ControleEditorial.tsx` et `/controle-editorial`.
- Relation : phase ultérieure. Ne doit pas valider les faits auteur.

Audits :

- Routes existantes : `/audit`, `/audit-voix`, `/audit-linguistique`, `/audit-anti-ia`, `/audit-sur-explication`, `/audit-vibration`.
- Relation : lecture conceptuelle seulement. Ne pas dépendre de leurs sorties pour approuver une bio.

Navigation STRATE :

- Navigation visible actuelle : `/Users/growingandchanging/mon-app/components/GlobalNavigation.tsx`.
- Registre secondaire : `/Users/growingandchanging/mon-app/lib/strateRoutes.ts`.
- Future modification `À VALIDER` : ajouter `/identite-auteur` dans un emplacement recommandé `Auteur` ou équivalent, puis synchroniser `GlobalNavigation.tsx` et `strateRoutes.ts` si le registre est utilisé ailleurs.

## 17. Gestion du module legacy `/biographie`

Constat `LEGACY` :

- `/biographie` est un gestionnaire autobiographique historique, pas une bio publique.
- `/biographie` est actuellement un module legacy de gestion narrative locale.
- `/biographie` ne constitue pas la future source de vérité de l'identité auteur.
- `/biographie` ne doit pas être utilisé comme moteur de bio publique.
- Moteur : `/Users/growingandchanging/mon-app/app/lib/biographie.ts`.
- Stockage : `localStorage["biographie-projet"]`.
- Pages connexes : `/biographie/strategie`, `/biographie/inventaire`, `/biographie/migration-audit`, `/biographie/[tomeId]/[chapitreId]`.

Stratégie :

- conserver;
- ajouter ultérieurement un libellé visuel `Ancien système autobiographique`;
- permettre export;
- interdire migration automatique;
- protéger les données historiques présentes dans `biographie-projet`;
- interdire toute migration destructive;
- ne retirer qu'après validation humaine et backup.

## 18. Architecture de fichiers cible

Fichiers à créer pour le MVP :

- `/Users/growingandchanging/mon-app/app/identite-auteur/page.tsx`
  - Responsabilité : UI principale client.
  - Dépendances : `components/author-identity/*`, `lib/author-identity/*`.
  - Raison : route isolée, claire, non ambiguë.

- `/Users/growingandchanging/mon-app/app/api/identite-auteur/generate/route.ts`
  - Responsabilité : route serveur Anthropic pour générer une bio.
  - Dépendances : `@anthropic-ai/sdk`, `lib/prompts/author-identity/*`, validateurs runtime.
  - Raison : protéger `ANTHROPIC_API_KEY`.

- `/Users/growingandchanging/mon-app/components/author-identity/AuthorIdentityShell.tsx`
  - Responsabilité : layout des onglets et orchestration UI.
  - Dépendances : composants enfants.
  - Raison : garder `page.tsx` mince.

- `/Users/growingandchanging/mon-app/components/author-identity/FactsPanel.tsx`
  - Responsabilité : liste, création, édition des faits validés.
  - Dépendances : types domaine.
  - Raison : coeur de gouvernance.

- `/Users/growingandchanging/mon-app/components/author-identity/WorksPanel.tsx`
  - Responsabilité : oeuvres.
  - Dépendances : types domaine.
  - Raison : éviter de coder l'identité autour d'un seul livre.

- `/Users/growingandchanging/mon-app/components/author-identity/BiosPanel.tsx`
  - Responsabilité : génération, comparaison, approbation/rejet.
  - Dépendances : route API, stockage.
  - Raison : bio comme sortie, pas comme source.

- `/Users/growingandchanging/mon-app/components/author-identity/HistoryPanel.tsx`
  - Responsabilité : historique traçable.
  - Dépendances : `AuthorGenerationRecord`.
  - Raison : auditabilité.

- `/Users/growingandchanging/mon-app/lib/author-identity/types.ts`
  - Responsabilité : types domaine.
  - Dépendances : aucune.
  - Raison : source typée centrale.

- `/Users/growingandchanging/mon-app/lib/author-identity/defaults.ts`
  - Responsabilité : profil par défaut minimal.
  - Dépendances : types.
  - Raison : initialisation contrôlée.

- `/Users/growingandchanging/mon-app/lib/author-identity/storage.ts`
  - Responsabilité : lecture/sauvegarde/export/import localStorage.
  - Dépendances : validateurs.
  - Raison : centraliser la clé `author-identity-profile`.

- `/Users/growingandchanging/mon-app/lib/author-identity/validation.ts`
  - Responsabilité : validation runtime sans nouvelle dépendance.
  - Dépendances : types.
  - Raison : protéger localStorage et réponses API.

- `/Users/growingandchanging/mon-app/lib/author-identity/bio-config.ts`
  - Responsabilité : profils d'usage et longueurs.
  - Dépendances : types.
  - Raison : éviter nombres dispersés.

- `/Users/growingandchanging/mon-app/lib/prompts/author-identity/bio-generation.ts`
  - Responsabilité : prompt versionné bio.
  - Dépendances : config de sortie.
  - Raison : traçabilité.

## 19. MVP

Le plus petit MVP professionnel :

1. Créer/éditer le profil auteur.
2. Distinguer identité civile et nom d'autrice.
3. Ajouter des faits validés avec visibilité et usage.
4. Ajouter des oeuvres, dont `L'Héritage des Silences`.
5. Générer une bio via Anthropic côté serveur.
6. Retourner `text`, `sourceFactIds`, `warnings`.
7. Comparer brouillon avec version approuvée actuelle.
8. Approuver/rejeter sans écrasement.
9. Conserver l'historique.
10. Copier/exporter JSON et texte.

Hors MVP :

- dossiers presse complets;
- conférences;
- droits/territoires avancés;
- médias;
- validation phrase par phrase;
- Supabase;
- migration depuis `/biographie`;
- intégration profonde à StyleDNA.

Initialisation factuelle `VALIDÉ` pour le futur profil par défaut :

- Identité civile privée : `Sylvie Drapeau`.
- Identité publique officielle : `Léna Montand`.
- Formulation publique de référence : `Léna Montand est une autrice canadienne établie au Québec.`
- Titre principal : `Autrice`.
- Oeuvre structurante initiale : `L'Héritage des Silences`.
- Nature de l'oeuvre : récit autobiographique littéraire en quatre tomes.
- Premier tome : `Tome I — Le gel et la lumière`.

Initialisation factuelle `INTERDIT` :

- Ne pas initialiser `Drummondville` comme localisation publique.
- Ne pas initialiser de prix, publication, maison d'édition, diplôme, profession supplémentaire, événement biographique sensible ou statut professionnel non validé.

## 20. Phases ultérieures

- Phase A : dossiers de presse.
- Phase B : variantes médias.
- Phase C : anglais/adaptations internationales.
- Phase D : droits et territoires.
- Phase E : lecture contrôlée de métadonnées manuscrit.
- Phase F : Supabase et sauvegarde cloud.
- Phase G : décision de retrait du legacy `/biographie`.

## 21. Plan de migration

PHASE 0 — sauvegarde/audit :

- exporter localStorage complet;
- documenter `biographie-projet`;
- documenter `chapitres-tome-1`;
- vérifier build.

PHASE 1 — nouveau système isolé :

- créer types, storage et page `/identite-auteur`;
- aucune IA;
- aucune lecture manuscrit.

PHASE 2 — génération IA :

- créer route API serveur;
- prompt versionné;
- génération brouillon seulement.

PHASE 3 — historique/comparaison :

- comparer approuvé/brouillon;
- approbation/rejet.

PHASE 4 — intégrations contrôlées :

- lecture optionnelle des métadonnées du livre;
- jamais de synchronisation automatique.

PHASE 5 — décision legacy :

- conserver, exporter, retirer seulement après validation humaine.

## 22. Stratégie de tests

Tests MVP recommandés avec Vitest :

- `lib/author-identity/validation.test.ts` : normalisation de profil corrompu ou incomplet.
- `lib/author-identity/storage.test.ts` : lecture, sauvegarde, import, export sans écrasement silencieux.
- `lib/author-identity/bio-config.test.ts` : profils de longueur.
- `app/api/identite-auteur/generate/route.test.ts` : validation payload, absence clé API, JSON invalide.
- Tests de non-régression : ne pas écrire `biographie-projet`, `chapitres-tome-1`, `fragments`.

Tests manuels :

- build TypeScript;
- création profil;
- génération brouillon;
- approbation;
- export JSON;
- retour arrière sans perte.

## 23. Rollback

Rollback MVP :

1. Ne modifier aucune donnée existante hors `author-identity-profile`.
2. Avant import ou migration future, créer un export localStorage complet.
3. Si problème UI : retirer le lien navigation seulement.
4. Si problème stockage : conserver la clé brute, désactiver les écritures, afficher export.
5. Si problème IA : désactiver route API, garder profil et bios existantes.

## 24. Matrice des risques

| Risque | Probabilité | Impact | Mitigation |
|---|---:|---:|---|
| Perte de données localStorage | Moyenne | Élevé | Backup complet avant phase, import non destructif |
| Collision avec `biographie-projet` | Faible si isolé | Élevé | Nouvelle clé `author-identity-profile` |
| Source de vérité dupliquée | Moyenne | Élevé | `AuthorIdentityProfile` seul propriétaire de l'identité publique |
| Dépendance circulaire manuscrit/identité | Moyenne | Moyen | Lecture seule depuis identité, aucune écriture manuscrit |
| Hallucination IA | Élevée | Élevé | faits source, warnings, validation humaine |
| Fuite de données privées | Moyenne | Élevé | visibilité obligatoire, filtrage avant prompt |
| Dérive de prompt | Moyenne | Moyen | prompt versionné |
| JSON Anthropic invalide | Moyenne | Moyen | extracteur + validation runtime + fallback erreur |
| Coût API | Faible au MVP | Moyen | longueurs configurées, max_tokens, modèle serveur |
| Surarchitecture | Moyenne | Moyen | MVP limité, phases ultérieures |
| Régression navigation | Faible | Moyen | modifier `GlobalNavigation.tsx` et `strateRoutes.ts` seulement au moment d'implémenter |
| Confusion Sylvie/Léna | Moyenne | Élevé | champs séparés, confirmation visible avant génération |

## 25. Fichiers qui seraient créés

- `/Users/growingandchanging/mon-app/app/identite-auteur/page.tsx`
  - Responsabilité : route principale.
  - Dépendances : `components/author-identity/AuthorIdentityShell`.
  - Raison : nouveau module isolé.

- `/Users/growingandchanging/mon-app/app/api/identite-auteur/generate/route.ts`
  - Responsabilité : génération Anthropic côté serveur.
  - Dépendances : `@anthropic-ai/sdk`, prompts, validation.
  - Raison : sécurité clé API.

- `/Users/growingandchanging/mon-app/components/author-identity/AuthorIdentityShell.tsx`
  - Responsabilité : écran global.
  - Dépendances : panneaux.
  - Raison : page route mince.

- `/Users/growingandchanging/mon-app/components/author-identity/IdentityPanel.tsx`
  - Responsabilité : identités civile/publique, langues, positionnement.
  - Dépendances : types, storage.
  - Raison : séparation privé/public.

- `/Users/growingandchanging/mon-app/components/author-identity/FactsPanel.tsx`
  - Responsabilité : faits validés.
  - Dépendances : types.
  - Raison : gouvernance.

- `/Users/growingandchanging/mon-app/components/author-identity/WorksPanel.tsx`
  - Responsabilité : oeuvres.
  - Dépendances : types.
  - Raison : plusieurs livres futurs.

- `/Users/growingandchanging/mon-app/components/author-identity/BiosPanel.tsx`
  - Responsabilité : génération, comparaison, validation.
  - Dépendances : API, types.
  - Raison : bio comme sortie contrôlée.

- `/Users/growingandchanging/mon-app/components/author-identity/HistoryPanel.tsx`
  - Responsabilité : historique.
  - Dépendances : types.
  - Raison : traçabilité.

- `/Users/growingandchanging/mon-app/lib/author-identity/types.ts`
  - Responsabilité : types domaine.
  - Dépendances : aucune.
  - Raison : éviter duplication.

- `/Users/growingandchanging/mon-app/lib/author-identity/storage.ts`
  - Responsabilité : localStorage `author-identity-profile`.
  - Dépendances : validation.
  - Raison : centralisation.

- `/Users/growingandchanging/mon-app/lib/author-identity/validation.ts`
  - Responsabilité : validation runtime.
  - Dépendances : types.
  - Raison : pas de `any`, pas de confiance aveugle.

- `/Users/growingandchanging/mon-app/lib/author-identity/defaults.ts`
  - Responsabilité : profil initial.
  - Dépendances : types.
  - Raison : initialisation propre.

- `/Users/growingandchanging/mon-app/lib/author-identity/bio-config.ts`
  - Responsabilité : usages et longueurs.
  - Dépendances : types.
  - Raison : configuration unique.

- `/Users/growingandchanging/mon-app/lib/prompts/author-identity/bio-generation.ts`
  - Responsabilité : prompt versionné.
  - Dépendances : config.
  - Raison : traçabilité IA.

## 26. Fichiers qui seraient modifiés

- `/Users/growingandchanging/mon-app/components/GlobalNavigation.tsx`
  - Modification envisagée `À VALIDER` : ajouter un item `Identité Auteur`, de préférence dans un groupe distinct `Auteur`.
  - Risque : faible, navigation visible.
  - Raison : rendre le module accessible.

- `/Users/growingandchanging/mon-app/lib/strateRoutes.ts`
  - Modification envisagée : ajouter `/identite-auteur` au registre logique.
  - Risque : faible.
  - Raison : cohérence carte STRATE.

- `/Users/growingandchanging/mon-app/app/page.tsx`
  - Modification envisagée : ajouter une tuile vers `/identite-auteur`.
  - Risque : faible à moyen selon design.
  - Raison : accès depuis l'accueil.

- `/Users/growingandchanging/mon-app/app/biographie/page.tsx`
  - Modification envisagée ultérieure : ajouter un avertissement legacy, pas de migration.
  - Risque : moyen si UX mal formulée.
  - Raison : éviter confusion entre autobiographie et identité auteur.

- `/Users/growingandchanging/mon-app/app/lib/biographie.ts`
  - Modification envisagée : aucune au MVP.
  - Risque : élevé si modifié sans nécessité.
  - Raison : fichier legacy protégé.

## 27. Fichiers explicitement protégés

- `/Users/growingandchanging/mon-app/chapitres-tome-1`
- `/Users/growingandchanging/mon-app/app/manuscrit/page.tsx`
- `/Users/growingandchanging/mon-app/manuscrit`
- `/Users/growingandchanging/mon-app/lib/tome1-chapters.ts`
- `/Users/growingandchanging/mon-app/lib/manuscript-source.ts`
- `/Users/growingandchanging/mon-app/lib/fragments.ts`
- `/Users/growingandchanging/mon-app/lib/manuscript-structure.ts`
- `/Users/growingandchanging/mon-app/app/structure-tome-1/page.tsx`
- `/Users/growingandchanging/mon-app/structure-tome-1`
- `/Users/growingandchanging/mon-app/structure-tomes`
- `/Users/growingandchanging/mon-app/structure-chapitres`
- `/Users/growingandchanging/mon-app/app/lib/biographie.ts`
- `/Users/growingandchanging/mon-app/app/biographie/page.tsx`
- `/Users/growingandchanging/mon-app/biographie-projet`
- localStorage `chapitres-tome-1`
- localStorage `fragments`
- localStorage `biographie-projet`
- localStorage `structure-tomes`
- localStorage `structure-chapitres`

Actions protégées `INTERDIT` :

- ne pas migrer automatiquement les données;
- ne supprimer aucune donnée;
- ne renommer aucun identifiant canonique;
- ne fusionner aucun système de stockage;
- ne pas modifier les données du manuscrit.

## 28. Questions ou décisions réellement bloquantes

1. Confirmer quels faits sensibles ou biographiques seront autorisés par niveau de divulgation.
2. Confirmer si le premier MVP doit générer seulement des bios ou aussi une note de dossier de presse.
3. Confirmer si `/identite-auteur` doit apparaître dans un nouveau groupe `Auteur`, dans `Centre`, ou ailleurs.
4. Retrouver ou fournir les fichiers `AUDIT_STRATE_PROMPTS.md`, `BIOGRAPHIE_CONTENU_COMPLET.md`, `BIOGRAPHIE_AUDIT_TECHNIQUE.md` s'ils existent ailleurs.

## 29. Recommandation finale

Créer `Identité Auteur` comme un module neuf, isolé et très gouverné. Ne pas essayer de transformer `/biographie`, car ce module porte une logique historique de manuscrit autobiographique et une clé localStorage incompatible avec une identité publique professionnelle.

Le MVP doit rester volontairement étroit : profil, faits validés, oeuvres, bios, génération Anthropic, historique, validation humaine. C'est suffisant pour obtenir un système utilisable sans fragiliser le manuscrit.

La règle à ne jamais perdre : le manuscrit est l'oeuvre; l'identité auteur est son expression publique contrôlée. Les deux peuvent se parler en lecture seule, mais ne doivent pas devenir propriétaires l'un de l'autre.
