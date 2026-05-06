"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type ChapterType = "severe" | "doux" | "respiration" | "charniere" | "fin" | "mixte";
type ChapterStatus = "a-ecrire" | "ecrit" | "scelle";
type StoredChapterStatus = "à écrire" | "écrit" | "scellé";

interface Chapter {
  num: number;
  age: string;
  title: string;
  type: ChapterType;
  souvenirs: string;
  fonction: string;
  etatInterieur: string;
}

interface Bloc {
  num: number;
  title: string;
  age: string;
  chapitres: Chapter[];
}

interface StoredChapter {
  id: string;
  titre: string;
  bloc: number;
  type: string;
  statut: StoredChapterStatus;
  contenu: string;
}

type SupabaseStoredChapter = {
  id: string;
  titre: string | null;
  bloc: number | null;
  type: string | null;
  statut: string | null;
  contenu: string | null;
};

const CHAPITRES_TOME_1_KEY = "chapitres-tome-1";

const TITRES_OFFICIELS_CHAPITRES_1_6: Record<string, string> = {
  "chapitre-1": "Le corps avant la mémoire",
  "chapitre-2": "La poupée",
  "chapitre-3": "Ce que la nuit contenait",
  "chapitre-4": "Le bois et le métal",
  "chapitre-5": "L’ombre du témoin",
  "chapitre-6": "L’angle mort",
};

const CHAPITRES_TOME_1_INITIAUX: StoredChapter[] = [
  {
    id: "chapitre-1",
    titre: "Le corps avant la mémoire",
    bloc: 1,
    type: "fondation",
    statut: "scellé",
    contenu: "",
  },
  {
    id: "chapitre-2",
    titre: "La poupée",
    bloc: 1,
    type: "fondation",
    statut: "scellé",
    contenu: "",
  },
  {
    id: "chapitre-3",
    titre: "Ce que la nuit contenait",
    bloc: 1,
    type: "fondation",
    statut: "à écrire",
    contenu: "",
  },
  {
    id: "chapitre-4",
    titre: "Le bois et le métal",
    bloc: 1,
    type: "fondation",
    statut: "scellé",
    contenu: "",
  },
  {
    id: "chapitre-5",
    titre: "L’ombre du témoin",
    bloc: 2,
    type: "sévère",
    statut: "à écrire",
    contenu: "",
  },
  {
    id: "chapitre-6",
    titre: "L’angle mort",
    bloc: 2,
    type: "sévère",
    statut: "à écrire",
    contenu: "",
  },
];

function normaliserTexteStructure(texte: string) {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .trim();
}

function detecterChapitreDepuisContenu(contenu: string) {
  const contenuNormalise = normaliserTexteStructure(contenu);
  const matchNumero = contenuNormalise.match(/chapitre\s+([1-6])\b/);

  if (matchNumero?.[1]) {
    return `chapitre-${matchNumero[1]}`;
  }

  return Object.entries(TITRES_OFFICIELS_CHAPITRES_1_6).find(([, titre]) =>
    contenuNormalise.includes(normaliserTexteStructure(titre)),
  )?.[0] || null;
}

function reconcilerChapitresTome1(chapitres: StoredChapter[]) {
  const parId = new Map<string, StoredChapter>();

  [...CHAPITRES_TOME_1_INITIAUX, ...chapitres].forEach((chapitre) => {
    parId.set(chapitre.id, {
      ...chapitre,
      titre: TITRES_OFFICIELS_CHAPITRES_1_6[chapitre.id] || chapitre.titre,
      contenu: chapitre.contenu || "",
    });
  });

  Array.from(parId.values()).forEach((chapitre) => {
    const contenu = chapitre.contenu.trim();
    const chapitreDetecte = contenu ? detecterChapitreDepuisContenu(contenu) : null;

    if (!chapitreDetecte || chapitreDetecte === chapitre.id) {
      return;
    }

    const destination = parId.get(chapitreDetecte);
    if (!destination) {
      return;
    }

    const contenuDestination = destination.contenu.trim();
    destination.contenu = contenuDestination && contenuDestination !== contenu
      ? `${contenuDestination}\n\n--- Contenu déplacé depuis ${chapitre.id} ---\n\n${contenu}`
      : contenu;
    destination.statut =
      chapitre.statut === "scellé" || destination.statut === "scellé" ? "scellé" : "écrit";

    chapitre.contenu = "";
    chapitre.statut = "à écrire";
  });

  return Array.from(parId.values()).map((chapitre) => ({
    ...chapitre,
    titre: TITRES_OFFICIELS_CHAPITRES_1_6[chapitre.id] || chapitre.titre,
  }));
}

function initialiserChapitresTome1() {
  try {
    const saved = localStorage.getItem(CHAPITRES_TOME_1_KEY);

    if (!saved) {
      localStorage.setItem(CHAPITRES_TOME_1_KEY, JSON.stringify(CHAPITRES_TOME_1_INITIAUX));
      return;
    }

    const chapitres = JSON.parse(saved) as StoredChapter[];
    const chapitresCompletes = CHAPITRES_TOME_1_INITIAUX.reduce<StoredChapter[]>(
      (acc, chapitreInitial) => {
        const existe = acc.some((chapitre) => chapitre.id === chapitreInitial.id);
        return existe ? acc : [...acc, chapitreInitial];
      },
      Array.isArray(chapitres) ? chapitres : [],
    );
    const chapitresReconciles = reconcilerChapitresTome1(chapitresCompletes);

    localStorage.setItem(CHAPITRES_TOME_1_KEY, JSON.stringify(chapitresReconciles));
  } catch {
    localStorage.setItem(CHAPITRES_TOME_1_KEY, JSON.stringify(CHAPITRES_TOME_1_INITIAUX));
  }
}

function chargerChapitresTome1() {
  initialiserChapitresTome1();

  try {
    const saved = localStorage.getItem(CHAPITRES_TOME_1_KEY);
    const chapitres = saved ? JSON.parse(saved) as StoredChapter[] : CHAPITRES_TOME_1_INITIAUX;
    return Array.isArray(chapitres) ? reconcilerChapitresTome1(chapitres) : CHAPITRES_TOME_1_INITIAUX;
  } catch {
    return CHAPITRES_TOME_1_INITIAUX;
  }
}

async function chargerChapitresTome1DepuisSupabase() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("chapitres_tome1")
    .select("id,titre,bloc,type,statut,contenu")
    .order("id", { ascending: true });

  if (error || !data?.length) {
    return [];
  }

  return (data as SupabaseStoredChapter[]).map((chapitre) => ({
    id: chapitre.id,
    titre: chapitre.titre || TITRES_OFFICIELS_CHAPITRES_1_6[chapitre.id] || chapitre.id,
    bloc: chapitre.bloc || 1,
    type: chapitre.type || "fondation",
    statut: chapitre.statut === "scellé" || chapitre.statut === "écrit" ? chapitre.statut : "à écrire",
    contenu: chapitre.contenu || "",
  })) satisfies StoredChapter[];
}

type ChapterStorageState = "vide" | "rempli" | "scellé";

function getStoredChapterEffectiveStatus(chapitre?: StoredChapter): ChapterStatus {
  if (chapitre?.statut === "scellé") {
    return "scelle";
  }

  if (chapitre?.contenu?.trim()) {
    return "ecrit";
  }

  return "a-ecrire";
}

function getChapterStorageState(chapitre?: StoredChapter): ChapterStorageState {
  if (chapitre?.statut === "scellé") {
    return "scellé";
  }

  if (chapitre?.contenu?.trim()) {
    return "rempli";
  }

  return "vide";
}

const BLOCS: Bloc[] = [
  {
    num: 1,
    title: "Le corps avant les mots",
    age: "0 à 4 ans",
    chapitres: [
      { num: 1, age: "0–2 ans", title: "Le corps avant la mémoire", type: "severe", souvenirs: "Bassinette · eau trop chaude · sirop bu · rat dans la tétine · grenier · niche du chien comme refuge", fonction: "Le corps enregistre avant que l'esprit comprenne. Aucun mot pour ce qui arrive.", etatInterieur: "Je ne comprends pas encore" },
      { num: 2, age: "2 ans", title: "La poupée", type: "severe", souvenirs: "Poupée presque aussi grande · escalier · porte fermée · poignée immobile · attente seule", fonction: "Isolement. L'enfant seule avec son poids. Personne ne vient.", etatInterieur: "Je suis seule" },
      { num: 3, age: "3–4 ans", title: "Ce que la nuit contenait", type: "severe", souvenirs: "Main sur le pied · dentifrice · visage blanc · lucarne · hameçon · plancher froid · urine chaude sur les jambes", fonction: "La peur prend un visage. La nuit est organisée contre l'enfant.", etatInterieur: "La peur a une forme maintenant" },
      { num: 4, age: "~4 ans", title: "Le bois et le métal", type: "severe", souvenirs: "Clé dans serrure · corridor · table · vélo trop grand · chute dans l'escalier · douceur qui ne promet rien", fonction: "Les objets portent le danger. Le corps apprend les règles sans qu'on les explique.", etatInterieur: "Je comprends les règles sans qu'on me les dise" },
    ],
  },
  {
    num: 2,
    title: "Construction du système",
    age: "4 à 6 ans",
    chapitres: [
      { num: 5, age: "< 5 ans", title: "L’ombre du témoin", type: "severe", souvenirs: "Chien suspendu · garage · chaîne · coups · oncle présent et immobile · il voyait, il ne bougeait pas", fonction: "La violence n'est pas juste le père. C'est tous ceux qui regardent et ne bougent pas.", etatInterieur: "Personne ne réagit — c'est donc normal" },
      { num: 6, age: "~5 ans", title: "L’angle mort", type: "severe", souvenirs: "Poules · hache · tronc · corps décapité qui court · violence à table · sang · chambre · noir · yeux ouverts", fonction: "Dissociation. Observer sans pouvoir. Se retirer dans le noir intérieur.", etatInterieur: "Je disparais de l'intérieur" },
      { num: 7, age: "4–5 ans", title: "La table et le silence", type: "severe", souvenirs: "Repas en famille · cuillère suspendue · vapeur qui disparaît · verre posé trop fort · voix qui descend · chaise qui recule", fonction: "La tension quotidienne. Le danger dans les gestes ordinaires.", etatInterieur: "Je lis l'air avant que ça change" },
      { num: 8, age: "3–4 ans", title: "Les animaux et les règles", type: "severe", souvenirs: "Chiots portés à la rivière · chatons noyés · punitions à genoux sur carrelage · mains dans le dos · mère avec gestes mesurés", fonction: "La violence sur le vivant est normale. Personne ne pleure. Le silence est la règle.", etatInterieur: "Les vivants disparaissent sans bruit" },
      { num: 9, age: "5 ans", title: "Devenir invisible", type: "severe", souvenirs: "Gestes appris pour ne pas attirer · rire retenu · corps qui rétrécit · coins de pièce · escalier évité · respiration coupée en deux", fonction: "L'enfant construit ses propres stratégies de survie. Seule. Sans que personne lui enseigne.", etatInterieur: "Disparaître est ma protection" },
      { num: 10, age: "2–3 ans", title: "Ce que les bruits annonçaient", type: "severe", souvenirs: "Sons de la maison la nuit · pas dans le corridor · clé dans la serrure · silence qui change · bois qui craque · corps qui écoute dans le noir", fonction: "Le corps apprend à lire le danger avant que les yeux voient quoi que ce soit.", etatInterieur: "J'entends avant de comprendre" },
      { num: 11, age: "5–6 ans", title: "Ma sœur et moi", type: "doux", souvenirs: "Langage secret · rires à voix basse · jeux inventés · complicité dans le noir · se comprendre sans parler", fonction: "Premier lien de survie. Deux personnes qui tiennent ensemble sans le dire.", etatInterieur: "Ensemble on tient" },
    ],
  },
  {
    num: 3,
    title: "Respirations",
    age: "6 à 8 ans",
    chapitres: [
      { num: 12, age: "6 ans", title: "L'eau", type: "respiration", souvenirs: "Ruisseau ou lac · pieds dans l'eau froide · cailloux sous les orteils · écrevisses · courant · soleil sur la surface · bruit de l'eau", fonction: "Première vraie respiration du livre. Le corps dans quelque chose de doux. Aucune explication.", etatInterieur: "Le corps existe autrement ici" },
      { num: 13, age: "6–7 ans", title: "Dehors", type: "respiration", souvenirs: "Framboises · mains qui tachent · odeur de terre chaude · herbe haute · insectes · chaleur sur les bras · seule dehors sans surveillance", fonction: "L'enfant existe pour elle-même. Pas pour surveiller, pas pour disparaître. Juste être là.", etatInterieur: "Je suis là sans être vue" },
      { num: 14, age: "6–7 ans", title: "L'école", type: "mixte", souvenirs: "Classe · pupitre · crayon · odeur de papier · récréation · un adulte qui parle normalement · règles différentes", fonction: "Il existe un monde avec d'autres règles. Ça déstabilise autant que ça soulage.", etatInterieur: "Les règles ne sont pas les mêmes partout" },
      { num: 15, age: "7 ans", title: "La figure douce", type: "respiration", souvenirs: "Une personne bienveillante · geste simple sans danger · voix qui ne descend pas · présence qui ne surveille pas", fonction: "Il existait une autre façon d'être. Le corps ne savait pas comment recevoir ça.", etatInterieur: "Je ne sais pas quoi faire de la douceur" },
      { num: 16, age: "7–8 ans", title: "Ce que je voulais", type: "doux", souvenirs: "Un objet désiré · un endroit imaginé · un rêve d'enfant · ce qu'on s'inventait pour tenir", fonction: "L'enfant désire. Elle imagine. Elle existe au-delà de la survie.", etatInterieur: "Je veux quelque chose pour moi" },
      { num: 17, age: "8 ans", title: "Mon frère", type: "doux", souvenirs: "Un moment précis avec lui · comment il te regardait · quelque chose qu'il faisait ou disait · ce qu'il savait sans que tu lui dises", fonction: "Ancrer la dédicace dans le récit. \"Tu savais exactement comment me voir.\"", etatInterieur: "Quelqu'un me voit vraiment" },
    ],
  },
  {
    num: 4,
    title: "Le retour et la montée",
    age: "8 à 9 ans",
    chapitres: [
      { num: 18, age: "8–9 ans", title: "Quand l'air a changé", type: "severe", souvenirs: "Tension qui remonte · violence qui reprend · corps qui se remet en alerte · signal que la respiration est finie", fonction: "Le contraste du bloc 3 rend ce retour encore plus lourd. Le lecteur le ressent dans son propre corps.", etatInterieur: "Le corps se souvient avant moi" },
      { num: 19, age: "9 ans", title: "Les boîtes", type: "mixte", souvenirs: "Boîtes qui apparaissent · objets emballés · ce qu'on laisse · rumeurs de déménagement · inquiétude sans nom", fonction: "L'instabilité s'annonce. L'enfant anticipe sans comprendre ce qui vient.", etatInterieur: "Quelque chose va changer mais je ne sais pas quoi" },
      { num: 20, age: "9 ans", title: "La route", type: "charniere", souvenirs: "Voiture · paysage qui change · Cowansville qui disparaît · silence dans l'habitacle · odeur de la voiture · premier regard sur Dunham", fonction: "Rupture géographique. Point de non-retour. Dunham commence ici.", etatInterieur: "Le sol disparaît sous mes pieds" },
      { num: 21, age: "9–10 ans", title: "La nouvelle maison", type: "severe", souvenirs: "Dunham · nouveaux planchers · odeurs inconnues · fenêtres différentes · repérer les zones de danger", fonction: "Le système voyage avec la famille. Un nouveau lieu ne change rien au danger.", etatInterieur: "C'est pareil mais je ne connais pas encore les coins" },
      { num: 22, age: "9–10 ans", title: "L'isolement", type: "severe", souvenirs: "Dunham plus loin de tout · moins de voisins · moins de témoins · nouvelle école · sentiment que personne ne verra", fonction: "L'isolement géographique amplifie tout. Plus personne ne voit. Le danger n'a plus de limites.", etatInterieur: "Personne ne peut me voir d'ici" },
    ],
  },
  {
    num: 5,
    title: "La fracture",
    age: "9 à 11 ans",
    chapitres: [
      { num: 23, age: "10 ans", title: "Le climat reprend", type: "severe", souvenirs: "Reprise de la violence à Dunham · atmosphère encore plus lourde · scène précise · peut-être pire qu'avant", fonction: "Dunham n'est pas une échappatoire. Le système se réinstalle intact.", etatInterieur: "C'est pire qu'avant" },
      { num: 24, age: "10 ans", title: "Ce que le corps faisait seul", type: "severe", souvenirs: "Réactions automatiques · sursauts · sommeil fragmenté · rapport à la nourriture · corps qui agit avant que l'esprit décide", fonction: "La dissociation est installée. Le corps a ses propres mémoires.", etatInterieur: "Mon corps fait des choses que je ne lui demande pas" },
      { num: 25, age: "10 ans", title: "La nuit différente", type: "severe", souvenirs: "Une nuit qui ne ressemble pas aux autres · quelque chose a changé · le corps sait avant les mots · premiers signes — montrer sans jamais nommer", fonction: "Fracture. Premier signe de l'inceste. Ne rien nommer. Juste ce que le corps enregistre.", etatInterieur: "Quelque chose s'est cassé cette nuit" },
      { num: 26, age: "10–11 ans", title: "Le lendemain ordinaire", type: "severe", souvenirs: "Matin qui continue normalement · petit-déjeuner · gestes ordinaires · comme si rien · vie de surface intacte · silence absolu dans le corps", fonction: "Dissociation totale. La vie continue par-dessus. C'est ce silence-là qui est le plus dévastateur.", etatInterieur: "Tout continue comme si rien" },
      { num: 27, age: "11 ans", title: "Ma sœur ne sait pas", type: "severe", souvenirs: "Distance nouvelle · quelque chose qui ne peut plus se dire · lien qui tient mais qui a changé · moment où tu as réalisé que tu ne pouvais pas lui dire", fonction: "Le secret isole même à l'intérieur du lien le plus proche.", etatInterieur: "Je suis seule avec ça" },
      { num: 28, age: "11 ans", title: "Ce que j'avais appris à faire", type: "severe", souvenirs: "Gestes automatiques · comment sourire · comment tenir le corps droit · comment traverser une pièce · ce que ça coûte", fonction: "L'inventaire sans inventaire. Le coût réel de la survie.", etatInterieur: "Je sais survivre mais je ne sais pas autre chose" },
      { num: 29, age: "11 ans", title: "L'hiver de mes onze ans", type: "mixte", souvenirs: "Dunham en hiver · neige · froid · fenêtre givrée · silence de la neige · monde extérieur blanc et indifférent · attendre sans savoir quoi", fonction: "Avant-dernière image. Lourde et belle. Le monde dehors ne sait pas.", etatInterieur: "Le monde dehors continue sans moi" },
      { num: 30, age: "11 ans", title: "Le gel et la lumière", type: "fin", souvenirs: "Une image finale · lumière sur la neige ou sur l'eau · le corps encore debout · rien ne se résout · tout continue · mais quelque chose résiste", fonction: "Le titre du tome. Ce qui fige et ce qui résiste en même temps. Fin ouverte.", etatInterieur: "Je suis encore là" },
    ],
  },
];

const CHAPITRES_ECRITS_PAR_DEFAUT = [1, 2, 4, 6, 8, 10];

const TYPE_CONFIG: Record<ChapterType, { label: string; bg: string; text: string; border: string }> = {
  severe: { label: "Sévère", bg: "#FEF2F2", text: "#991B1B", border: "#FCA5A5" },
  doux: { label: "Doux", bg: "#F0FDF4", text: "#166534", border: "#86EFAC" },
  respiration: { label: "Respiration", bg: "#EFF6FF", text: "#1E40AF", border: "#93C5FD" },
  charniere: { label: "Charnière", bg: "#F5F3FF", text: "#4C1D95", border: "#C4B5FD" },
  fin: { label: "Fin du tome", bg: "#FFFBEB", text: "#92400E", border: "#FCD34D" },
  mixte: { label: "Mixte", bg: "#FFF7ED", text: "#9A3412", border: "#FDBA74" },
};

const STATUS_CONFIG: Record<ChapterStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  "a-ecrire": { label: "À écrire", bg: "#F9FAFB", text: "#6B7280", border: "#E5E7EB", dot: "#D1D5DB" },
  ecrit: { label: "Écrit", bg: "#F0FDF4", text: "#166534", border: "#86EFAC", dot: "#22C55E" },
  scelle: { label: "Scellé", bg: "#FFFBEB", text: "#92400E", border: "#FCD34D", dot: "#F59E0B" },
};

const BLOC_COLORS = [
  { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E3A8A", num: "#3B82F6" },
  { bg: "#FFF7ED", border: "#FED7AA", text: "#7C2D12", num: "#F97316" },
  { bg: "#F0FDF4", border: "#BBF7D0", text: "#14532D", num: "#22C55E" },
  { bg: "#F5F3FF", border: "#DDD6FE", text: "#2E1065", num: "#8B5CF6" },
  { bg: "#FFF1F2", border: "#FECDD3", text: "#881337", num: "#F43F5E" },
];

export default function StructureTome1() {
  const [statuts, setStatuts] = useState<Record<number, ChapterStatus>>({});
  const [selected, setSelected] = useState<Chapter | null>(null);
  const [filter, setFilter] = useState<ChapterStatus | "all">("all");
  const [chapitresStockes, setChapitresStockes] = useState<StoredChapter[]>([]);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [cloudStatus, setCloudStatus] = useState("");

  useEffect(() => {
    let actif = true;

    async function chargerDonnees() {
      const chapitresLocaux = chargerChapitresTome1();
      const chapitresCloud = await chargerChapitresTome1DepuisSupabase();
      const chapitresCharges = chapitresCloud.length > 0
        ? reconcilerChapitresTome1(chapitresCloud)
        : chapitresLocaux;

      if (!actif) return;

    const statutsDepuisChapitres = chapitresCharges.reduce<Record<number, ChapterStatus>>(
      (acc, chapitre) => {
        const numero = Number(chapitre.id.replace("chapitre-", ""));
        if (Number.isFinite(numero)) {
          acc[numero] = getStoredChapterEffectiveStatus(chapitre);
        }
        return acc;
      },
      {},
    );

    setChapitresStockes(chapitresCharges);

    const saved = localStorage.getItem("tome1-statuts");
    if (saved) {
      const statutsSynchronises = {
        ...JSON.parse(saved),
        ...statutsDepuisChapitres,
      };
      setStatuts(statutsSynchronises);
      localStorage.setItem("tome1-statuts", JSON.stringify(statutsSynchronises));
    } else {
      const defaults: Record<number, ChapterStatus> = {};
      CHAPITRES_ECRITS_PAR_DEFAUT.forEach((n) => { defaults[n] = "ecrit"; });
      const statutsSynchronises = { ...defaults, ...statutsDepuisChapitres };
      setStatuts(statutsSynchronises);
      localStorage.setItem("tome1-statuts", JSON.stringify(statutsSynchronises));
    }
    }

    chargerDonnees();

    return () => {
      actif = false;
    };
  }, []);

  const saveStatut = (num: number, status: ChapterStatus) => {
    const updated = { ...statuts, [num]: status };
    setStatuts(updated);
    localStorage.setItem("tome1-statuts", JSON.stringify(updated));

    const chapter = BLOCS.flatMap((bloc) => bloc.chapitres).find((item) => item.num === num);
    if (!chapter) return;

    const storedStatus: StoredChapterStatus =
      status === "scelle" ? "scellé" : status === "ecrit" ? "écrit" : "à écrire";

    updateStoredChapter(chapter, (storedChapter) => ({
      ...storedChapter,
      statut: storedStatus,
    }));
  };

  const syncStatut = (num: number, status: ChapterStatus) => {
    const updated = { ...statuts, [num]: status };
    setStatuts(updated);
    localStorage.setItem("tome1-statuts", JSON.stringify(updated));
  };

  const getStoredChapter = (num: number) =>
    chapitresStockes.find((chapitre) => chapitre.id === `chapitre-${num}`);

  const createStoredChapter = (chapter: Chapter): StoredChapter => ({
    id: `chapitre-${chapter.num}`,
    titre: chapter.title,
    bloc: BLOCS.find((bloc) => bloc.chapitres.some((chapitre) => chapitre.num === chapter.num))?.num || 1,
    type: TYPE_CONFIG[chapter.type].label.toLowerCase(),
    statut: "à écrire",
    contenu: "",
  });

  const updateStoredChapter = (
    chapter: Chapter,
    updater: (storedChapter: StoredChapter) => StoredChapter,
  ) => {
    const chapterId = `chapitre-${chapter.num}`;
    const existingChapter = getStoredChapter(chapter.num);
    const updatedChapter = updater(existingChapter || createStoredChapter(chapter));
    const nextChapitres = chapitresStockes.some((storedChapter) => storedChapter.id === chapterId)
      ? chapitresStockes.map((storedChapter) =>
      storedChapter.id === chapterId ? updatedChapter : storedChapter,
      )
      : [...chapitresStockes, updatedChapter];

    setChapitresStockes(nextChapitres);
    localStorage.setItem(CHAPITRES_TOME_1_KEY, JSON.stringify(nextChapitres));
    return updatedChapter;
  };

  const sauvegarderChapitresDansCloud = async () => {
    if (!supabase) {
      setCloudStatus("Supabase non configuré. Ajoute la clé publishable dans .env.local.");
      return;
    }

    const payload = chapitresStockes.map((chapitre) => ({
      id: chapitre.id,
      titre: chapitre.titre,
      bloc: chapitre.bloc,
      type: chapitre.type,
      statut: chapitre.statut,
      contenu: chapitre.contenu,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("chapitres_tome1")
      .upsert(payload, { onConflict: "id" });

    setCloudStatus(error ? `Erreur cloud : ${error.message}` : "Sauvegarde cloud effectuée");
  };

  const startEditingChapter = (chapter: Chapter) => {
    const storedChapter = getStoredChapter(chapter.num) || createStoredChapter(chapter);

    if (storedChapter.statut === "scellé") {
      setEditingChapterId(null);
      setDraftContent(storedChapter.contenu || "");
      return;
    }

    setEditingChapterId(storedChapter.id);
    setDraftContent(storedChapter?.contenu || "");
  };

  const saveChapterContent = (chapter: Chapter) => {
    updateStoredChapter(chapter, (storedChapter) => ({
      ...storedChapter,
      contenu: draftContent,
      statut: draftContent.trim() ? "écrit" : storedChapter.statut,
    }));
    if (draftContent.trim()) {
      syncStatut(chapter.num, "ecrit");
    }
    setEditingChapterId(null);
  };

  const sealChapter = (chapter: Chapter) => {
    updateStoredChapter(chapter, (storedChapter) => ({
      ...storedChapter,
      contenu: draftContent,
      statut: "scellé",
    }));
    syncStatut(chapter.num, "scelle");
    setEditingChapterId(null);
  };

  const unlockChapter = (chapter: Chapter) => {
    const updatedChapter = updateStoredChapter(chapter, (storedChapter) => ({
      ...storedChapter,
      statut: storedChapter.contenu.trim() ? "écrit" : "à écrire",
    }));
    syncStatut(chapter.num, updatedChapter.contenu.trim() ? "ecrit" : "a-ecrire");

    setDraftContent(updatedChapter.contenu || "");
    setEditingChapterId(updatedChapter.id);
  };

  const allChapters = BLOCS.flatMap((b) => b.chapitres);
  const getStatut = (num: number): ChapterStatus => {
    const storedChapter = getStoredChapter(num);
    return storedChapter ? getStoredChapterEffectiveStatus(storedChapter) : (statuts[num] || "a-ecrire");
  };

  const statutsFusionnes = allChapters.reduce<Record<number, ChapterStatus>>((acc, chapter) => {
    acc[chapter.num] = getStatut(chapter.num);
    return acc;
  }, {});
  const totalEcrit = Object.values(statutsFusionnes).filter((s) => s === "ecrit" || s === "scelle").length;
  const totalScelle = Object.values(statutsFusionnes).filter((s) => s === "scelle").length;
  const totalAEcrire = allChapters.length - totalEcrit;
  const filteredNums = filter === "all" ? null : new Set(allChapters.filter((c) => statutsFusionnes[c.num] === filter).map((c) => c.num));
  const derniersChapitresTravailles = allChapters
    .filter((chapter) => ["ecrit", "scelle"].includes(statutsFusionnes[chapter.num]))
    .sort((a, b) => a.num - b.num)
    .slice(-3);
  const warningTension =
    derniersChapitresTravailles.length === 3 &&
    derniersChapitresTravailles.every((chapter) => chapter.type === "severe");

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'Georgia', 'Times New Roman', serif" }}>

      {/* Header */}
      <div style={{ background: "#1C1917", color: "#F5F0E8", padding: "2.5rem 2rem 2rem" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#A8A29E", marginBottom: 8, fontFamily: "system-ui, sans-serif" }}>L'Héritage des silences</p>
          <h1 style={{ fontSize: 28, fontWeight: 400, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Tome I — Le gel et la lumière</h1>
          <p style={{ fontSize: 14, color: "#A8A29E", margin: "0 0 2rem", fontFamily: "system-ui, sans-serif" }}>Plan directeur · Guide du manuscrit</p>

          {/* Stats */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { val: 30, label: "chapitres" },
              { val: totalEcrit, label: "écrits" },
              { val: totalScelle, label: "scellés" },
              { val: totalAEcrire, label: "à écrire" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 300, color: "#F5F0E8", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: "#78716C", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "system-ui, sans-serif", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end" }}>
              <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                <button
                  onClick={sauvegarderChapitresDansCloud}
                  style={{
                    border: "1px solid rgba(245, 240, 232, 0.28)",
                    borderRadius: 999,
                    background: "rgba(245, 240, 232, 0.08)",
                    color: "#F5F0E8",
                    cursor: "pointer",
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 12,
                    padding: "7px 12px",
                  }}
                  type="button"
                >
                  Sauvegarder dans le cloud
                </button>
                {cloudStatus && (
                  <p style={{ color: "#D6D3D1", fontFamily: "system-ui, sans-serif", fontSize: 11, margin: 0 }}>
                    {cloudStatus}
                  </p>
                )}
                <div style={{ width: 120, height: 4, background: "#44403C", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round((totalEcrit / 30) * 100)}%`, height: "100%", background: "#22C55E", borderRadius: 2, transition: "width 0.5s" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "#F5F0E8", borderBottom: "1px solid #E7E2D8", padding: "0.75rem 2rem" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", gap: 8, flexWrap: "wrap", fontFamily: "system-ui, sans-serif" }}>
          {(["all", "a-ecrire", "ecrit", "scelle"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "4px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: "1px solid",
                background: filter === f ? "#1C1917" : "transparent",
                color: filter === f ? "#F5F0E8" : "#78716C",
                borderColor: filter === f ? "#1C1917" : "#D6D0C4",
                transition: "all 0.15s",
              }}
            >
              {f === "all" ? "Tous" : STATUS_CONFIG[f].label}
            </button>
          ))}
        </div>
      </div>

      {warningTension && (
        <div style={{ background: "#FFF7ED", borderBottom: "1px solid #FDBA74", padding: "0.85rem 2rem" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", color: "#9A3412", fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: 600 }}>
            ⚠️ Trop de tension. Ajouter respiration.
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        {BLOCS.map((bloc, bi) => {
          const bc = BLOC_COLORS[bi];
          const visible = bloc.chapitres.filter((c) => !filteredNums || filteredNums.has(c.num));
          if (visible.length === 0) return null;
          return (
            <div key={bloc.num} style={{ marginBottom: "2.5rem" }}>
              {/* Bloc header */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14, padding: "10px 16px", borderRadius: 8, background: bc.bg, border: `1px solid ${bc.border}` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: bc.num, fontFamily: "system-ui, sans-serif" }}>BLOC {bloc.num}</span>
                <span style={{ fontSize: 15, fontWeight: 500, color: bc.text, fontFamily: "'Georgia', serif" }}>{bloc.title}</span>
                <span style={{ fontSize: 12, color: bc.text, opacity: 0.7, fontFamily: "system-ui, sans-serif" }}>{bloc.age}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: bc.text, opacity: 0.6, fontFamily: "system-ui, sans-serif" }}>Ch. {visible[0].num}–{visible[visible.length - 1].num}</span>
              </div>

              {/* Chapters */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {visible.map((ch) => {
                  const st = getStatut(ch.num);
                  const sc = STATUS_CONFIG[st];
                  const tc = TYPE_CONFIG[ch.type];
                  const isSelected = selected?.num === ch.num;
                  const storedChapter = getStoredChapter(ch.num);
                  const isEditingText = editingChapterId === `chapitre-${ch.num}`;
                  const chapterStorageState = getChapterStorageState(storedChapter);
                  const isSealed = chapterStorageState === "scellé";
                  const stateLabel =
                    chapterStorageState === "vide"
                      ? "Vide"
                      : chapterStorageState === "rempli"
                        ? "Rempli"
                        : "Scellé";
                  const storageStateStyle = {
                    vide: {
                      background: isSelected ? "#1C1917" : sc.bg,
                      border: isSelected ? "#1C1917" : sc.border,
                      boxShadow: "none",
                      opacity: 1,
                    },
                    rempli: {
                      background: isSelected ? "#1C1917" : "#FFFBEB",
                      border: isSelected ? "#1C1917" : "#D6B25E",
                      boxShadow: isSelected ? "none" : "0 0 22px rgba(214,178,94,0.16)",
                      opacity: 1,
                    },
                    scellé: {
                      background: isSelected ? "#1C1917" : "#15120E",
                      border: "#D6B25E",
                      boxShadow: isSelected ? "none" : "0 0 0 1px rgba(214,178,94,0.36)",
                      opacity: 0.82,
                    },
                  }[chapterStorageState];
                  return (
                    <div key={ch.num}>
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          setSelected(ch);
                          startEditingChapter(ch);
                        }}
                        style={{
                          display: "grid", gridTemplateColumns: "36px 56px 1fr auto",
                          gap: 12, alignItems: "center",
                          padding: "12px 16px", borderRadius: 8,
                          border: `1px solid ${storageStateStyle.border}`,
                          background: storageStateStyle.background,
                          boxShadow: storageStateStyle.boxShadow,
                          opacity: storageStateStyle.opacity,
                          cursor: "pointer", transition: "all 0.2s ease",
                        }}
                      >
                        {/* Num */}
                        <span style={{ fontSize: 11, fontWeight: 600, color: isSelected ? "#A8A29E" : "#9CA3AF", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
                          {String(ch.num).padStart(2, "0")}
                        </span>
                        {/* Age */}
                        <span style={{ fontSize: 11, color: isSelected ? "#A8A29E" : "#9CA3AF", fontFamily: "system-ui, sans-serif" }}>{ch.age}</span>
                        {/* Title */}
                        <span style={{ fontSize: 14, color: isSelected || isSealed ? "#F5F0E8" : "#1C1917", fontFamily: "'Georgia', serif", display: "flex", alignItems: "center", gap: 8 }}>
                          {ch.title}
                          {isSealed && <span aria-label="Chapitre scellé">🔒</span>}
                        </span>
                        {/* Badges */}
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: isSelected ? "rgba(255,255,255,0.1)" : tc.bg, color: isSelected ? "#D1D5DB" : tc.text, border: `1px solid ${isSelected ? "rgba(255,255,255,0.15)" : tc.border}`, fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap" }}>
                            {tc.label}
                          </span>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: isSelected ? "rgba(214,178,94,0.18)" : isSealed ? "rgba(214,178,94,0.18)" : chapterStorageState === "rempli" ? "rgba(214,178,94,0.14)" : "rgba(255,255,255,0.55)", color: isSelected || isSealed ? "#F5F0E8" : "#78716C", border: `1px solid ${chapterStorageState === "vide" ? "#D6D0C4" : "#D6B25E"}`, fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap" }}>
                            {stateLabel}
                          </span>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: sc.dot, flexShrink: 0 }} />
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isSelected && (
                        <div style={{ background: "#FAFAF8", border: "1px solid #E7E2D8", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "16px 20px", marginTop: -2 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                            <div>
                              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9CA3AF", marginBottom: 4, fontFamily: "system-ui, sans-serif" }}>Souvenirs à utiliser</p>
                              <p style={{ fontSize: 13, color: "#44403C", lineHeight: 1.7, fontFamily: "'Georgia', serif", margin: 0 }}>{ch.souvenirs}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9CA3AF", marginBottom: 4, fontFamily: "system-ui, sans-serif" }}>Fonction narrative</p>
                              <p style={{ fontSize: 13, color: "#44403C", lineHeight: 1.7, fontFamily: "'Georgia', serif", margin: 0 }}>{ch.fonction}</p>
                            </div>
                          </div>
                          <div style={{ background: "#F5F0E8", borderRadius: 6, padding: "8px 12px", marginBottom: 14 }}>
                            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9CA3AF", fontFamily: "system-ui, sans-serif" }}>État intérieur · </span>
                            <span style={{ fontSize: 13, color: "#1C1917", fontStyle: "italic", fontFamily: "'Georgia', serif" }}>"{ch.etatInterieur}"</span>
                          </div>
                          {/* Status selector */}
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "system-ui, sans-serif", marginRight: 4 }}>Statut :</span>
                            {(["a-ecrire", "ecrit", "scelle"] as ChapterStatus[]).map((s) => {
                              const scc = STATUS_CONFIG[s];
                              return (
                                <button
                                  key={s}
                                  onClick={(e) => { e.stopPropagation(); saveStatut(ch.num, s); }}
                                  style={{
                                    padding: "4px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                                    border: `1px solid ${st === s ? scc.border : "#E5E7EB"}`,
                                    background: st === s ? scc.bg : "transparent",
                                    color: st === s ? scc.text : "#9CA3AF",
                                    fontFamily: "system-ui, sans-serif", transition: "all 0.15s",
                                  }}
                                >
                                  {scc.label}
                                </button>
                              );
                            })}
                          </div>
                          <div style={{ borderTop: "1px solid #E7E2D8", marginTop: 16, paddingTop: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: isEditingText ? 10 : 0 }}>
                              <div>
                                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9CA3AF", margin: 0, fontFamily: "system-ui, sans-serif" }}>Texte réel du chapitre</p>
                                {!isEditingText && storedChapter?.contenu && (
                                  <p style={{ fontSize: 11, color: "#78716C", margin: "4px 0 0", fontFamily: "system-ui, sans-serif" }}>
                                    {storedChapter.contenu.trim().split(/\s+/).filter(Boolean).length} mots sauvegardés
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSealed) {
                                    unlockChapter(ch);
                                    return;
                                  }

                                  startEditingChapter(ch);
                                }}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: 20,
                                  fontSize: 11,
                                  cursor: "pointer",
                                  border: `1px solid ${isSealed ? "#D6B25E" : "#D6D0C4"}`,
                                  background: isSealed ? "#1C1917" : "#F5F0E8",
                                  color: isSealed ? "#F5F0E8" : "#44403C",
                                  fontFamily: "system-ui, sans-serif",
                                  transition: "all 0.15s",
                                }}
                                type="button"
                              >
                                {isSealed ? "Déverrouiller" : "Modifier le texte"}
                              </button>
                            </div>

                            {isSealed && !isEditingText && (
                              <p style={{ background: "#15120E", border: "1px solid rgba(214,178,94,0.5)", borderRadius: 8, color: "#F5F0E8", fontFamily: "system-ui, sans-serif", fontSize: 12, lineHeight: 1.6, margin: "12px 0 0", padding: "10px 12px" }}>
                                🔒 Chapitre scellé. Déverrouille-le pour modifier le texte.
                              </p>
                            )}

                            {isEditingText && (
                              <div>
                                <textarea
                                  value={draftContent}
                                  onChange={(e) => setDraftContent(e.target.value)}
                                  placeholder="Colle ici le texte complet du chapitre..."
                                  style={{
                                    width: "100%",
                                    minHeight: 180,
                                    border: "1px solid #D6D0C4",
                                    borderRadius: 8,
                                    background: "#FFFDF8",
                                    color: "#1C1917",
                                    fontFamily: "'Georgia', serif",
                                    fontSize: 14,
                                    lineHeight: 1.8,
                                    padding: "12px 14px",
                                    resize: "vertical",
                                    boxSizing: "border-box",
                                    outline: "none",
                                  }}
                                />
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingChapterId(null);
                                    }}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: 20,
                                      fontSize: 11,
                                      cursor: "pointer",
                                      border: "1px solid #D6D0C4",
                                      background: "transparent",
                                      color: "#78716C",
                                      fontFamily: "system-ui, sans-serif",
                                    }}
                                    type="button"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      sealChapter(ch);
                                    }}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: 20,
                                      fontSize: 11,
                                      cursor: "pointer",
                                      border: "1px solid #D6B25E",
                                      background: "#FFFBEB",
                                      color: "#92400E",
                                      fontFamily: "system-ui, sans-serif",
                                    }}
                                    type="button"
                                  >
                                    Sceller
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      saveChapterContent(ch);
                                    }}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: 20,
                                      fontSize: 11,
                                      cursor: "pointer",
                                      border: "1px solid #1C1917",
                                      background: "#1C1917",
                                      color: "#F5F0E8",
                                      fontFamily: "system-ui, sans-serif",
                                    }}
                                    type="button"
                                  >
                                    Enregistrer
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend footer */}
      <div style={{ borderTop: "1px solid #E7E2D8", background: "#F5F0E8", padding: "1.5rem 2rem" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", gap: 20, flexWrap: "wrap", fontFamily: "system-ui, sans-serif" }}>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: v.border, display: "inline-block" }} />
              <span style={{ fontSize: 11, color: "#78716C" }}>{v.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
