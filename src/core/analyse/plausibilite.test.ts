import { describe, expect, test } from 'vitest'
import { ajouterJours, evaluerPlausibilite, signalerImprobables, type Mesure } from '.'

const j0 = '2026-10-01'
const serie = (points: [number, number][]): Mesure[] =>
  points.map(([j, poids]) => ({ date: ajouterJours(j0, j), poids }))

describe('plausibilité d’une saisie', () => {
  const historique = serie([
    [0, 78],
    [1, 78.2],
    [2, 77.9],
  ])

  test('écart normal à la tendance → plausible', () => {
    expect(evaluerPlausibilite(79.5, ajouterJours(j0, 3), historique)).toBeNull()
  })

  test('faute de frappe (87,4 au lieu de 78,4) → improbable, au-dessus de la tendance', () => {
    const avis = evaluerPlausibilite(87.4, ajouterJours(j0, 3), historique)
    expect(avis).toMatchObject({ type: 'ecart', sens: 'dessus' })
    expect(avis?.type === 'ecart' && avis.ecartKg).toBeCloseTo(87.4 - avis!.reference!, 10)
  })

  test('écart modéré → plausible ; plus de 3 kg en dessous → improbable', () => {
    expect(evaluerPlausibilite(80.5, ajouterJours(j0, 3), historique)).toBeNull()
    expect(evaluerPlausibilite(74, ajouterJours(j0, 3), historique)).toMatchObject({
      type: 'ecart',
      sens: 'dessous',
    })
  })

  test('dernière pesée il y a plus de 30 jours → pas de comparaison', () => {
    expect(evaluerPlausibilite(90, ajouterJours(j0, 40), historique)).toBeNull()
  })

  test('aucun historique → seules les valeurs habituelles comptent', () => {
    expect(evaluerPlausibilite(78, j0, [])).toBeNull()
    expect(evaluerPlausibilite(15, j0, [])).toMatchObject({ type: 'horsHabituel' })
    expect(evaluerPlausibilite(450, j0, [])).toMatchObject({ type: 'horsHabituel' })
  })

  test('saisie passée : comparée aux pesées antérieures seulement, la sienne ignorée', () => {
    // Correction du 2e jour : on compare à la tendance du 1er jour, pas à l'ancienne valeur.
    expect(evaluerPlausibilite(78.1, ajouterJours(j0, 1), historique)).toBeNull()
    expect(evaluerPlausibilite(68.2, ajouterJours(j0, 1), historique)).toMatchObject({
      type: 'ecart',
    })
  })
})

describe('signalement dans l’historique', () => {
  test('seules les pesées improbables sont signalées, chacune vs ses précédentes', () => {
    const pesees = serie([
      [0, 78],
      [1, 78.2],
      [2, 87.9], // faute de frappe
      [3, 78.1], // normale : la tendance n'a bougé que d'environ 1 kg
    ])
    const avis = signalerImprobables(pesees)
    expect([...avis.keys()]).toEqual([ajouterJours(j0, 2)])
  })
})
