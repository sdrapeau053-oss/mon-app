export type StatutProspect =
  | 'à_contacter'
  | 'contacté'
  | 'en_discussion'
  | 'devis_envoyé'
  | 'gagné'
  | 'perdu'

export type Prospect = {
  id: string
  nom: string
  canal: string
  offre: string
  statut: StatutProspect
  montant: number
  dateContact: string
  notes: string
  encaisse: boolean
}

export type SprintActif = {
  objectif: number
  dateDebut: string
  revenusEncaisses: number
  revenusAttente: number
  prospectsContactes: number
  clientsObtenus: number
}

export const FL_KEYS = {
  sprint: 'strate_fl_sprint',
  prospects: 'strate_fl_prospects',
  offres: 'strate_fl_offres',
  calculs: 'strate_fl_calculs',
  plan: 'strate_fl_plan',
  scripts: 'strate_fl_scripts',
  actifs: 'strate_fl_actifs',
  niches: 'strate_fl_niches',
  canaux: 'strate_fl_canaux',
} as const

export const defaultSprint: SprintActif = {
  objectif: 500,
  dateDebut: new Date().toISOString().split('T')[0],
  revenusEncaisses: 0,
  revenusAttente: 0,
  prospectsContactes: 0,
  clientsObtenus: 0,
}

export function lireStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (Array.isArray(fallback)) return parsed as T
    return { ...(fallback as object), ...parsed } as T
  } catch {
    return fallback
  }
}

export function ecrireStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export function calculerKPIs(sprint: SprintActif) {
  const tauxConversion =
    sprint.prospectsContactes > 0
      ? Math.round((sprint.clientsObtenus / sprint.prospectsContactes) * 100)
      : 0
  const totalActif = sprint.revenusEncaisses + sprint.revenusAttente
  const probObjectif =
    sprint.objectif > 0
      ? Math.min(100, Math.round((totalActif / sprint.objectif) * 100))
      : 0
  const manqueAGagner = Math.max(0, sprint.objectif - totalActif)
  const joursEcoules = Math.floor(
    (Date.now() - new Date(sprint.dateDebut).getTime()) / (1000 * 60 * 60 * 24)
  )
  const joursRestants = Math.max(0, 5 - joursEcoules)
  return { tauxConversion, probObjectif, manqueAGagner, joursRestants, totalActif }
}

export function genererIdProspect(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export const STATUTS_PROSPECT: {
  value: StatutProspect
  label: string
  color: string
}[] = [
  { value: 'à_contacter', label: 'À contacter', color: '#888780' },
  { value: 'contacté', label: 'Contacté', color: '#3B8BD4' },
  { value: 'en_discussion', label: 'En discussion', color: '#BA7517' },
  { value: 'devis_envoyé', label: 'Devis envoyé', color: '#7F77DD' },
  { value: 'gagné', label: 'Gagné ✓', color: '#1D9E75' },
  { value: 'perdu', label: 'Perdu', color: '#D85A30' },
]
