export const TABS = {
  tableau: 'Tableau de bord',
  historique: 'Historique',
  reglages: 'Réglages',
} as const
export type Tab = keyof typeof TABS
