"use client";

import { useEffect, useMemo, useState } from "react";
import { BackLink } from "@/components/ui/back-link";
import {
  lireMemoiresNarratives,
  sauvegarderMemoiresNarratives,
  type MemoireNarrative,
} from "@/lib/memoire-narrative";
import {
  createChapitreId,
  lireNarrativeRelationsAvecAutomatiques,
  type NarrativeRelation,
} from "@/lib/narrative-relations";

const PERIODES: Array<MemoireNarrative["periode"]> = [
  "0-5",
  "6-11",
  "12-17",
  "18-24",
  "adulte",
  "transgenerationnel",
];

const TYPES: Array<MemoireNarrative["type"]> = [
  "scene",
  "souvenir",
  "corps",
  "violence",
  "refuge",
  "relation",
  "transmission",
  "fragment",
];

const STATUTS: Array<MemoireNarrative["statut"]> = [
  "non-traite",
  "a-integrer",
  "integre",
  "archive",
];

const STATUT_LABELS: Record<MemoireNarrative["statut"], string> = {
  "non-traite": "non traité",
  "a-integrer": "à intégrer",
  integre: "intégré",
  archive: "archive",
};

const BASE_CREATED_AT = "2026-05-14T00:00:00.000Z";
type MemoireNarrativeImport = Omit<MemoireNarrative, "createdAt" | "statut">;

const SOUVENIRS_DE_BASE: MemoireNarrative[] = [
  { id: "base-t1-ch01", titre: "Le corps avant la mémoire", periode: "0-5", ageApprox: "0–2 ans", type: "corps", intensite: 8, motifs: ["corps", "mémoire corporelle", "refuge"], texte: "Bassinette · eau trop chaude · sirop bu · rat dans la tétine · grenier · niche du chien comme refuge", tomeProbable: 1, chapitreProbable: 1, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch02", titre: "La poupée", periode: "0-5", ageApprox: "2 ans", type: "souvenir", intensite: 7, motifs: ["isolement", "attente", "enfance"], texte: "Poupée presque aussi grande · escalier · porte fermée · poignée immobile · attente seule", tomeProbable: 1, chapitreProbable: 2, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch03", titre: "Ce que la nuit contenait", periode: "0-5", ageApprox: "3–4 ans", type: "violence", intensite: 9, motifs: ["nuit", "peur", "corps"], texte: "Main sur le pied · dentifrice · visage blanc · lucarne · hameçon · plancher froid · urine chaude sur les jambes", tomeProbable: 1, chapitreProbable: 3, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch04", titre: "Le bois et le métal", periode: "0-5", ageApprox: "~4 ans", type: "scene", intensite: 8, motifs: ["objets", "danger", "règles"], texte: "Clé dans serrure · corridor · table · vélo trop grand · chute dans l'escalier · douceur qui ne promet rien", tomeProbable: 1, chapitreProbable: 4, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch05", titre: "L’ombre du témoin", periode: "0-5", ageApprox: "< 5 ans", type: "violence", intensite: 9, motifs: ["témoin", "silence", "animal"], texte: "Chien suspendu · garage · chaîne · coups · oncle présent et immobile · il voyait, il ne bougeait pas", tomeProbable: 1, chapitreProbable: 5, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch06", titre: "L’angle mort", periode: "0-5", ageApprox: "~5 ans", type: "violence", intensite: 10, motifs: ["dissociation", "sang", "noir"], texte: "Poules · hache · tronc · corps décapité qui court · violence à table · sang · chambre · noir · yeux ouverts", tomeProbable: 1, chapitreProbable: 6, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch07", titre: "La table et le silence", periode: "0-5", ageApprox: "4–5 ans", type: "scene", intensite: 4, motifs: ["silence", "repas", "hypervigilance"], texte: "Repas en famille · cuillère suspendue · vapeur qui disparaît · verre posé trop fort · voix qui descend · chaise qui recule", tomeProbable: 1, chapitreProbable: 7, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch08", titre: "Les animaux et les règles", periode: "0-5", ageApprox: "3–4 ans", type: "violence", intensite: 5, motifs: ["animaux", "règles", "silence"], texte: "Chiots portés à la rivière · chatons noyés · punitions à genoux sur carrelage · mains dans le dos · mère avec gestes mesurés", tomeProbable: 1, chapitreProbable: 8, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch09", titre: "Devenir invisible", periode: "0-5", ageApprox: "5 ans", type: "corps", intensite: 6, motifs: ["invisibilité", "survie", "corps"], texte: "Gestes appris pour ne pas attirer · rire retenu · corps qui rétrécit · coins de pièce · escalier évité · respiration coupée en deux", tomeProbable: 1, chapitreProbable: 9, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch10", titre: "Ce que les bruits annonçaient", periode: "0-5", ageApprox: "2–3 ans", type: "corps", intensite: 6, motifs: ["bruits", "nuit", "alerte"], texte: "Sons de la maison la nuit · pas dans le corridor · clé dans la serrure · silence qui change · bois qui craque · corps qui écoute dans le noir", tomeProbable: 1, chapitreProbable: 10, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch11", titre: "Ma sœur et moi", periode: "0-5", ageApprox: "5–6 ans", type: "relation", intensite: 5, motifs: ["sœur", "lien", "survie"], texte: "Langage secret · rires à voix basse · jeux inventés · complicité dans le noir · se comprendre sans parler", tomeProbable: 1, chapitreProbable: 11, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch12", titre: "L'eau", periode: "6-11", ageApprox: "6 ans", type: "refuge", intensite: 3, motifs: ["eau", "corps", "respiration"], texte: "Ruisseau ou lac · pieds dans l'eau froide · cailloux sous les orteils · écrevisses · courant · soleil sur la surface · bruit de l'eau", tomeProbable: 1, chapitreProbable: 12, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch13", titre: "Dehors", periode: "6-11", ageApprox: "6–7 ans", type: "refuge", intensite: 2, motifs: ["dehors", "nature", "liberté"], texte: "Framboises · mains qui tachent · odeur de terre chaude · herbe haute · insectes · chaleur sur les bras · seule dehors sans surveillance", tomeProbable: 1, chapitreProbable: 13, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch14", titre: "L'école", periode: "6-11", ageApprox: "6–7 ans", type: "scene", intensite: 4, motifs: ["école", "règles", "normalité"], texte: "Classe · pupitre · crayon · odeur de papier · récréation · un adulte qui parle normalement · règles différentes", tomeProbable: 1, chapitreProbable: 14, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch15", titre: "La figure douce", periode: "6-11", ageApprox: "7 ans", type: "relation", intensite: 3, motifs: ["douceur", "présence", "sécurité"], texte: "Une personne bienveillante · geste simple sans danger · voix qui ne descend pas · présence qui ne surveille pas", tomeProbable: 1, chapitreProbable: 15, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch16", titre: "Ce que je voulais", periode: "6-11", ageApprox: "7–8 ans", type: "souvenir", intensite: 3, motifs: ["désir", "imaginaire", "enfance"], texte: "Un objet désiré · un endroit imaginé · un rêve d'enfant · ce qu'on s'inventait pour tenir", tomeProbable: 1, chapitreProbable: 16, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch17", titre: "Mon frère", periode: "6-11", ageApprox: "8 ans", type: "relation", intensite: 4, motifs: ["frère", "regard", "lien"], texte: "Un moment précis avec lui · comment il te regardait · quelque chose qu'il faisait ou disait · ce qu'il savait sans que tu lui dises", tomeProbable: 1, chapitreProbable: 17, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch18", titre: "Quand l'air a changé", periode: "6-11", ageApprox: "8–9 ans", type: "corps", intensite: 7, motifs: ["alerte", "retour du danger", "corps"], texte: "Tension qui remonte · violence qui reprend · corps qui se remet en alerte · signal que la respiration est finie", tomeProbable: 1, chapitreProbable: 18, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch19", titre: "Les boîtes", periode: "6-11", ageApprox: "9 ans", type: "souvenir", intensite: 7, motifs: ["déménagement", "instabilité", "anticipation"], texte: "Boîtes qui apparaissent · objets emballés · ce qu'on laisse · rumeurs de déménagement · inquiétude sans nom", tomeProbable: 1, chapitreProbable: 19, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch20", titre: "La route", periode: "6-11", ageApprox: "9 ans", type: "scene", intensite: 8, motifs: ["route", "rupture", "Dunham"], texte: "Voiture · paysage qui change · Cowansville qui disparaît · silence dans l'habitacle · odeur de la voiture · premier regard sur Dunham", tomeProbable: 1, chapitreProbable: 20, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch21", titre: "La nouvelle maison", periode: "6-11", ageApprox: "9–10 ans", type: "scene", intensite: 8, motifs: ["maison", "danger", "cartographie"], texte: "Dunham · nouveaux planchers · odeurs inconnues · fenêtres différentes · repérer les zones de danger", tomeProbable: 1, chapitreProbable: 21, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch22", titre: "L'isolement", periode: "6-11", ageApprox: "9–10 ans", type: "scene", intensite: 9, motifs: ["isolement", "Dunham", "absence de témoins"], texte: "Dunham plus loin de tout · moins de voisins · moins de témoins · nouvelle école · sentiment que personne ne verra", tomeProbable: 1, chapitreProbable: 22, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch23", titre: "Le climat reprend", periode: "6-11", ageApprox: "10 ans", type: "violence", intensite: 9, motifs: ["Dunham", "violence", "climat"], texte: "Reprise de la violence à Dunham · atmosphère encore plus lourde · scène précise · peut-être pire qu'avant", tomeProbable: 1, chapitreProbable: 23, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch24", titre: "Ce que le corps faisait seul", periode: "6-11", ageApprox: "10 ans", type: "corps", intensite: 9, motifs: ["corps", "automatisme", "dissociation"], texte: "Réactions automatiques · sursauts · sommeil fragmenté · rapport à la nourriture · corps qui agit avant que l'esprit décide", tomeProbable: 1, chapitreProbable: 24, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch25", titre: "La nuit différente", periode: "6-11", ageApprox: "10 ans", type: "fragment", intensite: 10, motifs: ["nuit", "fracture", "corps"], texte: "Une nuit qui ne ressemble pas aux autres · quelque chose a changé · le corps sait avant les mots · premiers signes — montrer sans jamais nommer", tomeProbable: 1, chapitreProbable: 25, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch26", titre: "Le lendemain ordinaire", periode: "6-11", ageApprox: "10–11 ans", type: "fragment", intensite: 9, motifs: ["ordinaire", "silence", "dissociation"], texte: "Matin qui continue normalement · petit-déjeuner · gestes ordinaires · comme si rien · vie de surface intacte · silence absolu dans le corps", tomeProbable: 1, chapitreProbable: 26, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch27", titre: "Ma sœur ne sait pas", periode: "6-11", ageApprox: "11 ans", type: "relation", intensite: 8, motifs: ["sœur", "secret", "isolement"], texte: "Distance nouvelle · quelque chose qui ne peut plus se dire · lien qui tient mais qui a changé · moment où tu as réalisé que tu ne pouvais pas lui dire", tomeProbable: 1, chapitreProbable: 27, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch28", titre: "Ce que j'avais appris à faire", periode: "6-11", ageApprox: "11 ans", type: "corps", intensite: 8, motifs: ["survie", "posture", "coût"], texte: "Gestes automatiques · comment sourire · comment tenir le corps droit · comment traverser une pièce · ce que ça coûte", tomeProbable: 1, chapitreProbable: 28, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch29", titre: "L'hiver de mes onze ans", periode: "6-11", ageApprox: "11 ans", type: "souvenir", intensite: 7, motifs: ["hiver", "neige", "monde extérieur"], texte: "Dunham en hiver · neige · froid · fenêtre givrée · silence de la neige · monde extérieur blanc et indifférent · attendre sans savoir quoi", tomeProbable: 1, chapitreProbable: 29, statut: "non-traite", createdAt: BASE_CREATED_AT },
  { id: "base-t1-ch30", titre: "Le gel et la lumière", periode: "6-11", ageApprox: "11 ans", type: "fragment", intensite: 8, motifs: ["gel", "lumière", "résistance"], texte: "Une image finale · lumière sur la neige ou sur l'eau · le corps encore debout · rien ne se résout · tout continue · mais quelque chose résiste", tomeProbable: 1, chapitreProbable: 30, statut: "non-traite", createdAt: BASE_CREATED_AT },
];

const SOUVENIRS_COMPLEMENTAIRES: MemoireNarrativeImport[] = [
  { id: "heritage-silences-5ans-punition-nourriture-sol", titre: "Punition avec nourriture au sol", periode: "0-5", ageApprox: "5 ans", type: "violence", intensite: 8, motifs: ["punition", "nourriture", "humiliation"], personnesLiees: ["père"], texte: "Punition : nourriture lancée au sol → obligation de ramasser à genoux.", tomeProbable: 1, chapitreProbable: 7 },
  { id: "heritage-silences-5ans-crochet-mural", titre: "Suspendue au crochet", periode: "0-5", ageApprox: "5 ans", type: "violence", intensite: 9, motifs: ["punition", "corps", "crochet"], personnesLiees: ["père"], texte: "Suspendue par les vêtements à un crochet mural.", tomeProbable: 1, chapitreProbable: 6 },
  { id: "heritage-silences-5ans-ceinture-blanche", titre: "Ceinture blanche", periode: "0-5", ageApprox: "5 ans", type: "violence", intensite: 8, motifs: ["ceinture", "menace", "coups"], personnesLiees: ["père"], texte: "Ceinture blanche claquée avant les coups.", tomeProbable: 1, chapitreProbable: 7 },
  { id: "heritage-silences-9-10ans-attente-parents-nuit", titre: "Attente des parents la nuit", periode: "6-11", ageApprox: "9–10 ans", type: "souvenir", intensite: 7, motifs: ["attente", "nuit", "alcool", "drogue"], personnesLiees: ["parents"], texte: "Attente des parents la nuit pendant qu’ils consommaient alcool/drogue.", tomeProbable: 1, chapitreProbable: 21 },
  { id: "heritage-silences-9-10ans-dormir-lit-parents", titre: "Dormir dans leur lit", periode: "6-11", ageApprox: "9–10 ans", type: "corps", intensite: 7, motifs: ["pleurs", "nuit", "attachement"], personnesLiees: ["parents"], texte: "Dormir dans leur lit en pleurant.", tomeProbable: 1, chapitreProbable: 21 },
  { id: "heritage-silences-9-10ans-peur-mort-voiture", titre: "Peur de l’accident", periode: "6-11", ageApprox: "9–10 ans", type: "souvenir", intensite: 8, motifs: ["peur", "voiture", "mort"], personnesLiees: ["parents"], texte: "Peur qu’ils meurent en voiture.", tomeProbable: 1, chapitreProbable: 20 },
  { id: "heritage-silences-9-10ans-massages-pere", titre: "Massages au père", periode: "6-11", ageApprox: "9–10 ans", type: "relation", intensite: 7, motifs: ["père", "disponibilité", "corps"], personnesLiees: ["père"], texte: "Massages donnés au père après le travail.", tomeProbable: 1, chapitreProbable: 22 },
  { id: "heritage-silences-9-10ans-besoin-amour-peur", titre: "Besoin d’amour malgré la peur", periode: "6-11", ageApprox: "9–10 ans", type: "relation", intensite: 8, motifs: ["amour", "peur", "attachement"], personnesLiees: ["père", "parents"], texte: "Besoin d’amour malgré la peur.", tomeProbable: 1, chapitreProbable: 22 },
  { id: "heritage-silences-9-10ans-disponibilite-rejet", titre: "Disponibilité constante", periode: "6-11", ageApprox: "9–10 ans", type: "corps", intensite: 7, motifs: ["rejet", "survie", "disponibilité"], personnesLiees: ["père", "parents"], texte: "Disponibilité constante pour éviter le rejet.", tomeProbable: 1, chapitreProbable: 28 },
  { id: "heritage-silences-9-10ans-hypervigilance", titre: "Hypervigilance constante", periode: "6-11", ageApprox: "9–10 ans", type: "corps", intensite: 8, motifs: ["hypervigilance", "survie", "alerte"], personnesLiees: ["parents"], texte: "Hypervigilance constante.", tomeProbable: 1, chapitreProbable: 24 },
  { id: "heritage-silences-11ans-agression-copain-tante", titre: "Agression par le copain de la tante", periode: "6-11", ageApprox: "11 ans", type: "violence", intensite: 10, motifs: ["agression sexuelle", "tante", "fracture"], personnesLiees: ["copain de la tante"], texte: "Agression sexuelle par le copain de ma tante.", tomeProbable: 1, chapitreProbable: 25 },
  { id: "heritage-silences-11ans-tante-complice", titre: "Tante complice", periode: "6-11", ageApprox: "11 ans", type: "relation", intensite: 9, motifs: ["tante", "complicité", "trahison"], personnesLiees: ["tante"], texte: "Tante complice.", tomeProbable: 1, chapitreProbable: 26 },
  { id: "heritage-silences-11-12ans-garde-enfants", titre: "Garde d’enfants très jeune", periode: "12-17", ageApprox: "11–12 ans", type: "souvenir", intensite: 5, motifs: ["responsabilité", "enfance", "garde"], personnesLiees: [], texte: "Garde d’enfants très jeune.", tomeProbable: 1, chapitreProbable: 29 },
  { id: "heritage-silences-11-12ans-framboises-montagne", titre: "Framboises sur la montagne", periode: "12-17", ageApprox: "11–12 ans", type: "refuge", intensite: 3, motifs: ["framboises", "montagne", "dehors"], personnesLiees: [], texte: "Framboises cueillies sur la montagne.", tomeProbable: 1, chapitreProbable: 13 },
  { id: "heritage-silences-12ans-pieds-nus-neige", titre: "Pieds nus dans la neige", periode: "12-17", ageApprox: "12 ans", type: "violence", intensite: 9, motifs: ["punition", "neige", "corps"], personnesLiees: ["père"], texte: "Marche pieds nus dans la neige en hiver comme punition.", tomeProbable: 1, chapitreProbable: 29 },
  { id: "heritage-silences-12ans-refuge-roches-ruisseaux", titre: "Refuge sous le pont", periode: "12-17", ageApprox: "12 ans", type: "refuge", intensite: 3, motifs: ["refuge", "roches", "ruisseaux", "pont"], personnesLiees: [], texte: "Refuge près des roches et ruisseaux sous un pont.", tomeProbable: 1, chapitreProbable: 12 },
  { id: "heritage-silences-12ans-ecrevisses", titre: "Écrevisses dans l’eau", periode: "12-17", ageApprox: "12 ans", type: "refuge", intensite: 2, motifs: ["eau", "écrevisses", "refuge"], personnesLiees: [], texte: "Écrevisses dans l’eau.", tomeProbable: 1, chapitreProbable: 12 },
  { id: "heritage-silences-12ans-se-frapper-enfants", titre: "Se frapper entre enfants", periode: "12-17", ageApprox: "12 ans", type: "violence", intensite: 8, motifs: ["enfants", "obligation", "violence"], personnesLiees: ["enfants"], texte: "Obligation de se frapper entre enfants.", tomeProbable: 1, chapitreProbable: 8 },
  { id: "heritage-silences-12ans-bruit-eau-apaisement", titre: "Bruit de l’eau", periode: "12-17", ageApprox: "12 ans", type: "refuge", intensite: 2, motifs: ["eau", "apaisement", "sensoriel"], personnesLiees: [], texte: "Bruit de l’eau comme apaisement.", tomeProbable: 1, chapitreProbable: 12 },
  { id: "heritage-silences-12ans-figure-grand-pere", titre: "Figure de grand-père", periode: "12-17", ageApprox: "12 ans", type: "relation", intensite: 4, motifs: ["grand-père", "homme doux", "refuge"], personnesLiees: ["ami de la grand-mère", "grand-mère"], texte: "Ami de la grand-mère devenu figure de grand-père.", tomeProbable: 1, chapitreProbable: 15 },
  { id: "heritage-silences-12ans-homme-doux-cheveux", titre: "Homme doux et cheveux lavés", periode: "12-17", ageApprox: "12 ans", type: "relation", intensite: 4, motifs: ["douceur", "cheveux", "soin"], personnesLiees: ["ami de la grand-mère"], texte: "Homme doux qui lavait les cheveux.", tomeProbable: 1, chapitreProbable: 15 },
  { id: "heritage-silences-12ans-conflit-pere-figure-masculine", titre: "Conflit autour de la figure masculine", periode: "12-17", ageApprox: "12 ans", type: "relation", intensite: 7, motifs: ["père", "conflit", "figure masculine"], personnesLiees: ["père", "ami de la grand-mère"], texte: "Conflit avec le père autour de cette figure masculine.", tomeProbable: 1, chapitreProbable: 22 },
  { id: "heritage-silences-12ans-dirty-dancing-mere", titre: "Dirty Dancing avec la mère", periode: "12-17", ageApprox: "12 ans", type: "souvenir", intensite: 3, motifs: ["mère", "film", "repère affectif"], personnesLiees: ["mère"], texte: "Dirty Dancing comme repère affectif avec la mère.", tomeProbable: 1, chapitreProbable: 16 },
];

const SOUVENIRS_MERE_HOSPITALISEE_12_ANS: MemoireNarrativeImport[] = [
  { id: "heritage-silences-12ans-hospitalisation-mere-cancer", titre: "Hospitalisation de la mère", periode: "12-17", ageApprox: "12 ans", type: "souvenir", intensite: 7, motifs: ["mère", "cancer", "hospitalisation"], personnesLiees: ["mère"], texte: "Hospitalisation de la mère pour cancer.", tomeProbable: 1, chapitreProbable: 29 },
  { id: "heritage-silences-12ans-homme-crime-organise-soin-enfants", titre: "Homme qui prend soin des enfants", periode: "12-17", ageApprox: "12 ans", type: "relation", intensite: 6, motifs: ["protection", "danger", "enfants"], personnesLiees: ["homme lié plus tard au crime organisé"], texte: "Homme lié plus tard au crime organisé qui prend soin des enfants.", tomeProbable: 1, chapitreProbable: 30 },
  { id: "heritage-silences-12ans-pain-viande-coquilles-oeufs", titre: "Pain de viande aux coquilles d’œufs", periode: "12-17", ageApprox: "12 ans", type: "souvenir", intensite: 4, motifs: ["nourriture", "maison", "quotidien"], personnesLiees: [], texte: "Souvenir du pain de viande avec coquilles d’œufs.", tomeProbable: 1, chapitreProbable: 29 },
  { id: "heritage-silences-12ans-confusion-danger-protection", titre: "Danger et protection confondus", periode: "12-17", ageApprox: "12 ans", type: "corps", intensite: 7, motifs: ["danger", "protection", "confusion"], personnesLiees: ["homme lié plus tard au crime organisé"], texte: "Confusion entre danger et protection.", tomeProbable: 1, chapitreProbable: 30 },
  { id: "heritage-silences-12ans-marche-pieds-nus-neige", titre: "Marche pieds nus dans la neige", periode: "12-17", ageApprox: "12 ans", type: "violence", intensite: 9, motifs: ["punition", "neige", "corps"], personnesLiees: ["père"], texte: "Marche pieds nus dans la neige.", tomeProbable: 1, chapitreProbable: 29 },
  { id: "heritage-silences-12ans-punition-organisee-humiliation", titre: "Punition organisée", periode: "12-17", ageApprox: "12 ans", type: "violence", intensite: 9, motifs: ["punition", "humiliation", "organisation"], personnesLiees: ["père"], texte: "Punition organisée et humiliation.", tomeProbable: 1, chapitreProbable: 29 },
];

const SOUVENIRS_ARCS_LONGS: MemoireNarrativeImport[] = [
  { id: "heritage-silences-adolescence-troubles-alimentaires", titre: "Troubles alimentaires", periode: "12-17", ageApprox: "adolescence", type: "corps", intensite: 8, motifs: ["corps", "alimentation", "adolescence"], personnesLiees: [], texte: "Troubles alimentaires.", tomeProbable: 1, chapitreProbable: 30 },
  { id: "heritage-silences-adolescence-automutilation", titre: "Automutilation", periode: "12-17", ageApprox: "adolescence", type: "corps", intensite: 9, motifs: ["automutilation", "corps", "adolescence"], personnesLiees: [], texte: "Automutilation.", tomeProbable: 1, chapitreProbable: 30 },
  { id: "heritage-silences-adolescence-premier-amour", titre: "Premier amour", periode: "12-17", ageApprox: "adolescence", type: "relation", intensite: 5, motifs: ["premier amour", "relation", "adolescence"], personnesLiees: ["premier amour"], texte: "Premier amour.", tomeProbable: 1, chapitreProbable: 30 },
  { id: "heritage-silences-adolescence-buvard", titre: "Consommation de buvard", periode: "12-17", ageApprox: "adolescence", type: "souvenir", intensite: 7, motifs: ["buvard", "consommation", "adolescence"], personnesLiees: [], texte: "Consommation de buvard.", tomeProbable: 1, chapitreProbable: 30 },
  { id: "heritage-silences-adolescence-premiere-relation-sexuelle", titre: "Première relation sexuelle", periode: "12-17", ageApprox: "adolescence", type: "relation", intensite: 7, motifs: ["sexualité", "relation", "adolescence"], personnesLiees: ["premier partenaire"], texte: "Première relation sexuelle.", tomeProbable: 1, chapitreProbable: 30 },
  { id: "heritage-silences-adolescence-reaction-violente-pere", titre: "Réaction violente du père", periode: "12-17", ageApprox: "adolescence", type: "violence", intensite: 9, motifs: ["père", "violence", "adolescence"], personnesLiees: ["père"], texte: "Réaction extrêmement violente du père.", tomeProbable: 1, chapitreProbable: 30 },
  { id: "heritage-silences-adolescence-depart-partenaire-16ans", titre: "Départ avec partenaire", periode: "12-17", ageApprox: "16 ans", type: "relation", intensite: 8, motifs: ["départ", "partenaire", "rupture familiale"], personnesLiees: ["partenaire"], texte: "Départ avec partenaire à 16 ans.", tomeProbable: 1, chapitreProbable: 30 },
  { id: "heritage-silences-adolescence-recherche-identitaire", titre: "Recherche identitaire", periode: "12-17", ageApprox: "adolescence", type: "fragment", intensite: 6, motifs: ["identité", "adolescence", "recherche"], personnesLiees: [], texte: "Recherche identitaire.", tomeProbable: 1, chapitreProbable: 30 },
  { id: "heritage-silences-jeune-adulte-frere-incarcere-2002", titre: "Frère incarcéré", periode: "18-24", ageApprox: "2002", type: "relation", intensite: 8, motifs: ["frère", "incarcération", "2002"], personnesLiees: ["frère"], texte: "Frère incarcéré en 2002.", tomeProbable: 2 },
  { id: "heritage-silences-jeune-adulte-echographie", titre: "Présence à l’échographie", periode: "18-24", type: "relation", intensite: 6, motifs: ["frère", "échographie", "présence"], personnesLiees: ["frère", "Isaak"], texte: "Présent à l’échographie.", tomeProbable: 2 },
  { id: "heritage-silences-jeune-adulte-accouchement-prison", titre: "Présence à l’accouchement", periode: "18-24", type: "relation", intensite: 8, motifs: ["frère", "accouchement", "prison"], personnesLiees: ["frère", "Isaak"], texte: "Présent à l’accouchement malgré prison.", tomeProbable: 2 },
  { id: "heritage-silences-jeune-adulte-bouquet-hopital", titre: "Bouquet à l’hôpital", periode: "18-24", type: "souvenir", intensite: 6, motifs: ["fleurs", "hôpital", "frère"], personnesLiees: ["frère"], texte: "Bouquet de fleurs à l’hôpital.", tomeProbable: 2 },
  { id: "heritage-silences-jeune-adulte-dernieres-photos", titre: "Dernières photos", periode: "18-24", type: "souvenir", intensite: 9, motifs: ["photos", "frère", "dernières traces"], personnesLiees: ["frère"], texte: "Dernières photos.", tomeProbable: 2 },
  { id: "heritage-silences-jeune-adulte-deces-frere-quatre-mois", titre: "Décès du frère", periode: "18-24", type: "violence", intensite: 10, motifs: ["frère", "deuil", "décès"], personnesLiees: ["frère"], texte: "Décès du frère moins de 4 mois plus tard.", tomeProbable: 2 },
  { id: "heritage-silences-jeune-adulte-nom-isaak-transmis", titre: "Nom Isaak transmis", periode: "18-24", type: "transmission", intensite: 7, motifs: ["Isaak", "nom", "transmission"], personnesLiees: ["Isaak", "frère"], texte: "Nom Isaak transmis.", tomeProbable: 2 },
  { id: "heritage-silences-jeune-adulte-accident-mortel-2004", titre: "Accident mortel 2004", periode: "18-24", ageApprox: "2004", type: "violence", intensite: 10, motifs: ["accident", "frère", "beau-frère", "2004"], personnesLiees: ["frère", "beau-frère"], texte: "Accident mortel 2004 : frère + beau-frère.", tomeProbable: 2 },
  { id: "heritage-silences-adulte-mariage-reactivant-traumas", titre: "Mariage réactivant les traumas", periode: "adulte", type: "relation", intensite: 8, motifs: ["mariage", "traumas", "réactivation"], personnesLiees: ["conjoint"], texte: "Mariage réactivant les traumas.", tomeProbable: 3 },
  { id: "heritage-silences-adulte-relations-post-divorce", titre: "Relations post-divorce", periode: "adulte", type: "relation", intensite: 8, motifs: ["post-divorce", "relations", "destruction"], personnesLiees: ["partenaires post-divorce"], texte: "Relations post-divorce destructrices.", tomeProbable: 3 },
  { id: "heritage-silences-adulte-collegue-dossier-criminel", titre: "Relation avec collègue", periode: "adulte", type: "relation", intensite: 8, motifs: ["collègue", "dossier criminel", "relation"], personnesLiees: ["collègue"], texte: "Relation avec collègue possédant dossier criminel.", tomeProbable: 3 },
  { id: "heritage-silences-adulte-introduction-mdma", titre: "Introduction au MDMA", periode: "adulte", type: "souvenir", intensite: 7, motifs: ["MDMA", "consommation", "progression"], personnesLiees: ["collègue"], texte: "Introduction progressive au MDMA.", tomeProbable: 3 },
  { id: "heritage-silences-adulte-refus-initial", titre: "Refus initial", periode: "adulte", type: "fragment", intensite: 6, motifs: ["refus", "limite", "MDMA"], personnesLiees: ["collègue"], texte: "Refus initial.", tomeProbable: 3 },
  { id: "heritage-silences-adulte-controle-dependance", titre: "Contrôle et dépendance", periode: "adulte", type: "relation", intensite: 9, motifs: ["contrôle", "dépendance", "relation"], personnesLiees: ["collègue"], texte: "Contrôle psychologique et dépendance.", tomeProbable: 3 },
  { id: "heritage-silences-adulte-epuisement-extreme", titre: "Épuisement extrême", periode: "adulte", type: "corps", intensite: 9, motifs: ["épuisement", "corps", "survie"], personnesLiees: [], texte: "Épuisement extrême.", tomeProbable: 3 },
  { id: "heritage-silences-adulte-menaces-enfants", titre: "Menaces liées aux enfants", periode: "adulte", type: "violence", intensite: 9, motifs: ["menaces", "enfants", "contrôle"], personnesLiees: ["collègue", "enfants"], texte: "Menaces implicites liées aux enfants.", tomeProbable: 3 },
  { id: "heritage-silences-adulte-decouverte-dossier-criminel", titre: "Découverte du dossier criminel", periode: "adulte", type: "souvenir", intensite: 8, motifs: ["dossier criminel", "découverte", "danger"], personnesLiees: ["collègue"], texte: "Découverte du dossier criminel.", tomeProbable: 3 },
  { id: "heritage-silences-adulte-rupture", titre: "Rupture", periode: "adulte", type: "relation", intensite: 8, motifs: ["rupture", "séparation", "survie"], personnesLiees: ["collègue"], texte: "Rupture.", tomeProbable: 3 },
  { id: "heritage-silences-adulte-fuite-granby-drummondville", titre: "Fuite Granby vers Drummondville", periode: "adulte", type: "scene", intensite: 8, motifs: ["fuite", "Granby", "Drummondville"], personnesLiees: ["enfants"], texte: "Fuite Granby → Drummondville.", tomeProbable: 3 },
  { id: "heritage-silences-adulte-isolement-total", titre: "Isolement total", periode: "adulte", type: "corps", intensite: 8, motifs: ["isolement", "survie", "adulte"], personnesLiees: [], texte: "Isolement total.", tomeProbable: 3 },
  { id: "heritage-silences-adulte-mode-survie-hibernation", titre: "Mode survie hibernation", periode: "adulte", type: "corps", intensite: 8, motifs: ["survie", "hibernation", "corps"], personnesLiees: [], texte: "Mode survie / hibernation.", tomeProbable: 3 },
  { id: "heritage-silences-judiciaire-plainte-pere-mai-2022", titre: "Plainte criminelle contre le père", periode: "adulte", ageApprox: "mai 2022", type: "fragment", intensite: 9, motifs: ["plainte criminelle", "père", "justice"], personnesLiees: ["père"], texte: "Dépôt de plainte criminelle contre le père en mai 2022.", tomeProbable: 3 },
  { id: "heritage-silences-judiciaire-deuxieme-deposition-procureur", titre: "Deuxième déposition procureur", periode: "adulte", type: "fragment", intensite: 8, motifs: ["déposition", "procureur", "justice"], personnesLiees: ["procureur"], texte: "Deuxième déposition procureur.", tomeProbable: 3 },
  { id: "heritage-silences-judiciaire-procedures-ivac", titre: "Procédures IVAC", periode: "adulte", type: "fragment", intensite: 7, motifs: ["IVAC", "procédure", "justice"], personnesLiees: [], texte: "Procédures IVAC.", tomeProbable: 3 },
  { id: "heritage-silences-judiciaire-ptsd-diagnostique", titre: "PTSD diagnostiqué", periode: "adulte", type: "corps", intensite: 8, motifs: ["PTSD", "diagnostic", "corps"], personnesLiees: [], texte: "PTSD diagnostiqué.", tomeProbable: 3 },
  { id: "heritage-silences-judiciaire-arret-travail-prolonge", titre: "Arrêt de travail prolongé", periode: "adulte", type: "corps", intensite: 7, motifs: ["arrêt de travail", "épuisement", "santé"], personnesLiees: [], texte: "Arrêt de travail prolongé.", tomeProbable: 3 },
  { id: "heritage-silences-transgenerationnel-grand-mere-enceinte-13ans", titre: "Grand-mère enceinte à 13 ans", periode: "transgenerationnel", ageApprox: "13 ans", type: "transmission", intensite: 9, motifs: ["grand-mère", "grossesse", "13 ans"], personnesLiees: ["grand-mère"], texte: "Grand-mère enceinte à 13 ans.", tomeProbable: 4 },
  { id: "heritage-silences-transgenerationnel-homme-24ans", titre: "Homme de 24 ans", periode: "transgenerationnel", type: "relation", intensite: 9, motifs: ["homme de 24 ans", "grand-mère", "frontières"], personnesLiees: ["grand-mère", "homme de 24 ans"], texte: "Homme de 24 ans impliqué.", tomeProbable: 4 },
  { id: "heritage-silences-transgenerationnel-pauvrete-extreme", titre: "Pauvreté extrême", periode: "transgenerationnel", type: "transmission", intensite: 8, motifs: ["pauvreté", "famille", "transmission"], personnesLiees: ["famille maternelle"], texte: "Pauvreté extrême.", tomeProbable: 4 },
  { id: "heritage-silences-transgenerationnel-rats-manges", titre: "Rats mangés", periode: "transgenerationnel", type: "transmission", intensite: 10, motifs: ["rats", "pauvreté", "faim"], personnesLiees: ["mère de la grand-mère"], texte: "Rats mangés par la mère de la grand-mère.", tomeProbable: 4 },
  { id: "heritage-silences-transgenerationnel-mort-bebe-reno", titre: "Mort du bébé Reno", periode: "transgenerationnel", type: "transmission", intensite: 10, motifs: ["bébé Reno", "mort", "famille"], personnesLiees: ["Reno", "grand-mère"], texte: "Mort du bébé Reno.", tomeProbable: 4 },
  { id: "heritage-silences-transgenerationnel-infidelite-grand-mere", titre: "Infidélité de la grand-mère", periode: "transgenerationnel", type: "relation", intensite: 7, motifs: ["grand-mère", "infidélité", "famille"], personnesLiees: ["grand-mère"], texte: "Infidélité de la grand-mère.", tomeProbable: 4 },
  { id: "heritage-silences-transgenerationnel-amant-neige", titre: "Amant dans la neige", periode: "transgenerationnel", type: "scene", intensite: 7, motifs: ["amant", "neige", "grand-mère"], personnesLiees: ["grand-mère", "amant"], texte: "Amant venant dans la neige.", tomeProbable: 4 },
  { id: "heritage-silences-transgenerationnel-bonbons-silence", titre: "Bonbons pour le silence", periode: "transgenerationnel", type: "transmission", intensite: 8, motifs: ["bonbons", "chocolats", "silence"], personnesLiees: ["enfants"], texte: "Bonbons/chocolats pour acheter le silence.", tomeProbable: 4 },
  { id: "heritage-silences-transgenerationnel-grand-pere-carabine", titre: "Grand-père avec carabine", periode: "transgenerationnel", type: "violence", intensite: 9, motifs: ["grand-père", "carabine", "menace"], personnesLiees: ["grand-père"], texte: "Grand-père avec carabine.", tomeProbable: 4 },
  { id: "heritage-silences-transgenerationnel-pere-cache-voiture", titre: "Père caché sous voiture", periode: "transgenerationnel", type: "scene", intensite: 8, motifs: ["père", "voiture", "observation"], personnesLiees: ["père"], texte: "Père caché sous voiture observant scène.", tomeProbable: 4 },
  { id: "heritage-silences-transgenerationnel-neuf-enfants-trois-peres", titre: "Neuf enfants trois pères", periode: "transgenerationnel", type: "transmission", intensite: 7, motifs: ["9 enfants", "3 pères", "famille"], personnesLiees: ["grand-mère"], texte: "9 enfants / 3 pères.", tomeProbable: 4 },
  { id: "heritage-silences-transgenerationnel-possibles-abus", titre: "Possibles abus transgénérationnels", periode: "transgenerationnel", type: "transmission", intensite: 9, motifs: ["abus", "transgénérationnel", "famille"], personnesLiees: ["famille"], texte: "Possibles abus transgénérationnels.", tomeProbable: 4 },
  { id: "heritage-silences-transgenerationnel-frontieres-effondrees", titre: "Frontières familiales effondrées", periode: "transgenerationnel", type: "transmission", intensite: 9, motifs: ["frontières", "famille", "effondrement"], personnesLiees: ["famille"], texte: "Frontières familiales effondrées.", tomeProbable: 4 },
  { id: "heritage-silences-transgenerationnel-exposition-sexualite-adultes", titre: "Exposition aux adultes", periode: "transgenerationnel", type: "transmission", intensite: 8, motifs: ["sexualité", "adultes", "enfants"], personnesLiees: ["adultes", "enfants"], texte: "Exposition à sexualité/adultes.", tomeProbable: 4 },
  { id: "heritage-silences-transgenerationnel-humiliations-enfants", titre: "Humiliations imposées aux enfants", periode: "transgenerationnel", type: "violence", intensite: 8, motifs: ["humiliation", "enfants", "famille"], personnesLiees: ["enfants"], texte: "Humiliations imposées aux enfants.", tomeProbable: 4 },
];

function formatValue(value: string) {
  return value.replaceAll("-", " ");
}

function signatureMemoire(memoire: MemoireNarrative) {
  return `${memoire.titre.trim().toLowerCase()}::${memoire.texte.trim().toLowerCase()}`;
}

function preparerMemoiresImport(memoires: MemoireNarrativeImport[]): MemoireNarrative[] {
  const createdAt = new Date().toISOString();
  return memoires.map((memoire) => ({
    ...memoire,
    statut: "non-traite",
    createdAt,
  }));
}

function filtrerNouvellesMemoires(
  memoiresExistantes: MemoireNarrative[],
  memoiresAImporter: MemoireNarrative[],
) {
  const existingIds = new Set(memoiresExistantes.map((memoire) => memoire.id));
  const existingSignatures = new Set(memoiresExistantes.map(signatureMemoire));

  return memoiresAImporter.filter((memoire) => {
    return !existingIds.has(memoire.id) && !existingSignatures.has(signatureMemoire(memoire));
  });
}

function getLienChapitreMemoire(memoire: MemoireNarrative, relations: NarrativeRelation[]) {
  const memoireIds = new Set([`memoire:${memoire.id}`, memoire.id]);
  const relation = relations.find((item) => {
    const sourceIsMemoire = memoireIds.has(item.sourceId);
    const targetIsMemoire = memoireIds.has(item.targetId);
    const sourceIsChapitre = item.sourceType === "chapitre" || item.sourceType === "chapter" || /^tome-\d+-chapitre-/.test(item.sourceId);
    const targetIsChapitre = item.targetType === "chapitre" || item.targetType === "chapter" || /^tome-\d+-chapitre-/.test(item.targetId);
    return (sourceIsMemoire && targetIsChapitre) || (targetIsMemoire && sourceIsChapitre);
  });
  const chapterId = relation
    ? memoireIds.has(relation.sourceId)
      ? relation.targetId
      : relation.sourceId
    : memoire.tomeProbable && memoire.chapitreProbable
      ? createChapitreId(memoire.tomeProbable, memoire.chapitreProbable)
      : "";
  const match = chapterId.match(/tome-(\d+)-chapitre-(.+)$/);
  if (!match) return "";

  return `Chapitre ${match[2]}`;
}

export default function MemoiresPage() {
  const [memoires, setMemoires] = useState<MemoireNarrative[]>([]);
  const [relations, setRelations] = useState<NarrativeRelation[]>([]);
  const [periode, setPeriode] = useState<"all" | MemoireNarrative["periode"]>("all");
  const [statut, setStatut] = useState<"all" | MemoireNarrative["statut"]>("all");
  const [type, setType] = useState<"all" | MemoireNarrative["type"]>("all");
  const [tome, setTome] = useState<"all" | string>("all");
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => {
    setMemoires(lireMemoiresNarratives());
    setRelations(lireNarrativeRelationsAvecAutomatiques());
  }, []);

  const tomesDisponibles = useMemo(() => {
    return Array.from(
      new Set(
        memoires
          .map((memoire) => memoire.tomeProbable)
          .filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
      ),
    ).sort((a, b) => a - b);
  }, [memoires]);

  const compteurs = useMemo(() => {
    return {
      total: memoires.length,
      nonTraite: memoires.filter((memoire) => memoire.statut === "non-traite").length,
      aIntegrer: memoires.filter((memoire) => memoire.statut === "a-integrer").length,
      integre: memoires.filter((memoire) => memoire.statut === "integre").length,
      archive: memoires.filter((memoire) => memoire.statut === "archive").length,
    };
  }, [memoires]);

  const memoiresFiltrees = useMemo(() => {
    return memoires.filter((memoire) => {
      if (periode !== "all" && memoire.periode !== periode) return false;
      if (statut !== "all" && memoire.statut !== statut) return false;
      if (type !== "all" && memoire.type !== type) return false;
      if (tome !== "all" && String(memoire.tomeProbable ?? "") !== tome) return false;
      return true;
    });
  }, [memoires, periode, statut, tome, type]);

  function importerSouvenirsDeBase() {
    const nouvellesMemoires = filtrerNouvellesMemoires(memoires, SOUVENIRS_DE_BASE);

    if (nouvellesMemoires.length === 0) {
      setImportMessage("Aucun nouveau souvenir à importer.");
      return;
    }

    const nextMemoires = sauvegarderMemoiresNarratives([...nouvellesMemoires, ...memoires]);
    setMemoires(nextMemoires);
    setRelations(lireNarrativeRelationsAvecAutomatiques());
    setImportMessage(`${nouvellesMemoires.length} souvenir${nouvellesMemoires.length > 1 ? "s" : ""} importé${nouvellesMemoires.length > 1 ? "s" : ""}.`);
  }

  function importerSouvenirsComplementaires() {
    const memoiresAImporter = preparerMemoiresImport(SOUVENIRS_COMPLEMENTAIRES);
    const nouvellesMemoires = filtrerNouvellesMemoires(memoires, memoiresAImporter);

    if (nouvellesMemoires.length === 0) {
      setImportMessage("Aucun nouveau souvenir complémentaire à importer.");
      return;
    }

    const nextMemoires = sauvegarderMemoiresNarratives([...nouvellesMemoires, ...memoires]);
    setMemoires(nextMemoires);
    setRelations(lireNarrativeRelationsAvecAutomatiques());
    setImportMessage(`${nouvellesMemoires.length} mémoire${nouvellesMemoires.length > 1 ? "s" : ""} complémentaire${nouvellesMemoires.length > 1 ? "s" : ""} importée${nouvellesMemoires.length > 1 ? "s" : ""}.`);
  }

  function importerSouvenirsMereHospitalisee() {
    const memoiresAImporter = preparerMemoiresImport(SOUVENIRS_MERE_HOSPITALISEE_12_ANS);
    const nouvellesMemoires = filtrerNouvellesMemoires(memoires, memoiresAImporter);

    if (nouvellesMemoires.length === 0) {
      setImportMessage("Aucun nouveau souvenir 12 ans à importer.");
      return;
    }

    const nextMemoires = sauvegarderMemoiresNarratives([...nouvellesMemoires, ...memoires]);
    setMemoires(nextMemoires);
    setRelations(lireNarrativeRelationsAvecAutomatiques());
    setImportMessage(`${nouvellesMemoires.length} mémoire${nouvellesMemoires.length > 1 ? "s" : ""} 12 ans importée${nouvellesMemoires.length > 1 ? "s" : ""}.`);
  }

  function importerSouvenirsArcsLongs() {
    const memoiresAImporter = preparerMemoiresImport(SOUVENIRS_ARCS_LONGS);
    const nouvellesMemoires = filtrerNouvellesMemoires(memoires, memoiresAImporter);

    if (nouvellesMemoires.length === 0) {
      setImportMessage("Aucune nouvelle mémoire adolescence/adulte à importer.");
      return;
    }

    const nextMemoires = sauvegarderMemoiresNarratives([...nouvellesMemoires, ...memoires]);
    setMemoires(nextMemoires);
    setRelations(lireNarrativeRelationsAvecAutomatiques());
    setImportMessage(`${nouvellesMemoires.length} mémoire${nouvellesMemoires.length > 1 ? "s" : ""} adolescence/adulte importée${nouvellesMemoires.length > 1 ? "s" : ""}.`);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0D0C0A", color: "#F5F0E8", fontFamily: "'Georgia', serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "42px 20px 64px" }}>
        <header style={{ display: "grid", gap: 24, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <BackLink label="Système" />
              <p style={{ color: "#9A9080", fontFamily: "system-ui, sans-serif", fontSize: 11, letterSpacing: "0.18em", margin: "22px 0 8px", textTransform: "uppercase" }}>
                STRATE · mémoire narrative
              </p>
              <h1 style={{ color: "#F5F0E8", fontSize: 34, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0 }}>
                Mémoires
              </h1>
              <p style={{ color: "#B8AA91", fontFamily: "system-ui, sans-serif", fontSize: 14, lineHeight: 1.6, margin: "10px 0 0", maxWidth: 620 }}>
                Souvenirs narratifs structurés, prêts à être relus, filtrés puis intégrés au manuscrit.
              </p>
            </div>

            <div style={{ alignSelf: "end", display: "grid", gap: 6, justifyItems: "end" }}>
              <button
                onClick={importerSouvenirsDeBase}
                style={{
                  background: "rgba(214, 178, 94, 0.16)",
                  border: "1px solid rgba(214, 178, 94, 0.34)",
                  borderRadius: 999,
                  color: "#F5F0E8",
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                  fontSize: 12,
                  padding: "9px 14px",
                }}
                type="button"
              >
                Importer souvenirs de base
              </button>
              <button
                onClick={importerSouvenirsComplementaires}
                style={{
                  background: "rgba(245, 240, 232, 0.06)",
                  border: "1px solid rgba(245, 240, 232, 0.14)",
                  borderRadius: 999,
                  color: "#F5F0E8",
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                  fontSize: 12,
                  padding: "9px 14px",
                }}
                type="button"
              >
                Importer souvenirs complémentaires
              </button>
              <button
                onClick={importerSouvenirsMereHospitalisee}
                style={{
                  background: "rgba(245, 240, 232, 0.06)",
                  border: "1px solid rgba(245, 240, 232, 0.14)",
                  borderRadius: 999,
                  color: "#F5F0E8",
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                  fontSize: 12,
                  padding: "9px 14px",
                }}
                type="button"
              >
                Importer souvenirs 12 ans
              </button>
              <button
                onClick={importerSouvenirsArcsLongs}
                style={{
                  background: "rgba(245, 240, 232, 0.06)",
                  border: "1px solid rgba(245, 240, 232, 0.14)",
                  borderRadius: 999,
                  color: "#F5F0E8",
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                  fontSize: 12,
                  padding: "9px 14px",
                }}
                type="button"
              >
                Importer adolescence adulte
              </button>
              {importMessage && (
                <p style={{ color: "#9A9080", fontFamily: "system-ui, sans-serif", fontSize: 11, margin: 0 }}>
                  {importMessage}
                </p>
              )}
            </div>
          </div>

          <section style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            {[
              { label: "total", value: compteurs.total },
              { label: "non traité", value: compteurs.nonTraite },
              { label: "à intégrer", value: compteurs.aIntegrer },
              { label: "intégré", value: compteurs.integre },
              { label: "archive", value: compteurs.archive },
            ].map((item) => (
              <div key={item.label} style={{ background: "#14120F", border: "1px solid rgba(214,178,94,0.12)", borderRadius: 10, padding: "14px 16px" }}>
                <p style={{ color: "#8B7355", fontFamily: "system-ui, sans-serif", fontSize: 10, letterSpacing: "0.14em", margin: "0 0 8px", textTransform: "uppercase" }}>
                  {item.label}
                </p>
                <p style={{ color: "#F5F0E8", fontSize: 28, lineHeight: 1, margin: 0 }}>{item.value}</p>
              </div>
            ))}
          </section>
        </header>

        <section style={{ background: "#11100E", border: "1px solid rgba(214,178,94,0.12)", borderRadius: 12, marginBottom: 18, padding: 14 }}>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", fontFamily: "system-ui, sans-serif" }}>
            <label style={{ display: "grid", gap: 6, color: "#9A9080", fontSize: 11 }}>
              Période
              <select value={periode} onChange={(event) => setPeriode(event.target.value as typeof periode)} style={selectStyle}>
                <option value="all">Toutes</option>
                {PERIODES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, color: "#9A9080", fontSize: 11 }}>
              Statut
              <select value={statut} onChange={(event) => setStatut(event.target.value as typeof statut)} style={selectStyle}>
                <option value="all">Tous</option>
                {STATUTS.map((value) => (
                  <option key={value} value={value}>{STATUT_LABELS[value]}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, color: "#9A9080", fontSize: 11 }}>
              Type
              <select value={type} onChange={(event) => setType(event.target.value as typeof type)} style={selectStyle}>
                <option value="all">Tous</option>
                {TYPES.map((value) => (
                  <option key={value} value={value}>{formatValue(value)}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, color: "#9A9080", fontSize: 11 }}>
              Tome probable
              <select value={tome} onChange={(event) => setTome(event.target.value)} style={selectStyle}>
                <option value="all">Tous</option>
                {tomesDisponibles.map((value) => (
                  <option key={value} value={String(value)}>Tome {value}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section style={{ display: "grid", gap: 10 }}>
          {memoiresFiltrees.length === 0 ? (
            <div style={{ background: "#11100E", border: "1px solid rgba(214,178,94,0.12)", borderRadius: 12, padding: "32px 24px", textAlign: "center" }}>
              <p style={{ color: "#F5F0E8", fontSize: 18, margin: "0 0 8px" }}>
                Aucune mémoire narrative à afficher.
              </p>
              <p style={{ color: "#9A9080", fontFamily: "system-ui, sans-serif", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                L’espace est prêt. L’import massif viendra remplir cette table sans toucher aux chapitres existants.
              </p>
            </div>
          ) : (
            memoiresFiltrees.map((memoire) => {
              const lienChapitre = getLienChapitreMemoire(memoire, relations);

              return (
                <article key={memoire.id} style={{ background: "#11100E", border: "1px solid rgba(214,178,94,0.12)", borderLeft: "3px solid rgba(214,178,94,0.45)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                      <h2 style={{ color: "#F5F0E8", fontSize: 18, fontWeight: 400, lineHeight: 1.3, margin: 0 }}>
                        {memoire.titre}
                      </h2>
                      <span style={statusStyle}>{STATUT_LABELS[memoire.statut]}</span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontFamily: "system-ui, sans-serif" }}>
                      <span style={badgeStyle}>période {memoire.periode}</span>
                      {memoire.ageApprox && <span style={badgeStyle}>âge {memoire.ageApprox}</span>}
                      <span style={badgeStyle}>{formatValue(memoire.type)}</span>
                      <span style={badgeStyle}>int. {memoire.intensite ?? "—"}</span>
                      <span style={badgeStyle}>tome {memoire.tomeProbable ?? "—"}</span>
                      <span style={badgeStyle}>ch. {memoire.chapitreProbable ?? "—"}</span>
                    </div>

                    {lienChapitre && (
                      <p style={{ color: "#9A9080", fontFamily: "system-ui, sans-serif", fontSize: 11, lineHeight: 1.5, margin: 0, opacity: 0.78 }}>
                        Lié à : {lienChapitre}
                      </p>
                    )}

                    {memoire.motifs && memoire.motifs.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, fontFamily: "system-ui, sans-serif" }}>
                        {memoire.motifs.map((motif) => (
                          <span key={motif} style={motifStyle}>{motif}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

const selectStyle = {
  background: "#0D0C0A",
  border: "1px solid rgba(214,178,94,0.18)",
  borderRadius: 8,
  color: "#F5F0E8",
  fontSize: 12,
  padding: "8px 10px",
};

const badgeStyle = {
  background: "rgba(245,240,232,0.04)",
  border: "1px solid rgba(245,240,232,0.08)",
  borderRadius: 999,
  color: "#B8AA91",
  fontSize: 11,
  padding: "2px 8px",
};

const motifStyle = {
  background: "rgba(214,178,94,0.08)",
  border: "1px solid rgba(214,178,94,0.16)",
  borderRadius: 999,
  color: "#C9A84C",
  fontSize: 10,
  padding: "2px 7px",
};

const statusStyle = {
  background: "rgba(214,178,94,0.08)",
  border: "1px solid rgba(214,178,94,0.18)",
  borderRadius: 999,
  color: "#C9A84C",
  flexShrink: 0,
  fontFamily: "system-ui, sans-serif",
  fontSize: 11,
  padding: "3px 9px",
};
