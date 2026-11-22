import { describe, expect, test } from 'vitest'
import { ajouterJours } from './dates'
import { estimerObjectif, tonVariation, zoneMaintien, type EtatObjectif } from './objectif'
import type { PointTendance, Rythme } from './types'

const J0 = '2026-11-22'
/** Tendance constante sur les `n` derniers jours (J0 compris). */
const plate = (valeur: number, n = 5): PointTendance[] =>
  Array.from({ length: n }, (_, i) => ({ date: ajouterJours(J0, i - n + 1), tendance: valeur }))
const rythme = (kgParSemaine: number, erreurKgParJour = 0, nbPesees = 28): Rythme => ({
  kgParSemaine,
  erreurKgParJour,
  stable: Math.abs(kgParSemaine) < 0.1,
  nbPesees,
})
const perdre = (cible: number) => ({ usage: 'perdre' as const, cible })
const types = new Set<EtatObjectif['type']>()
const estimer = (...args: Parameters<typeof estimerObjectif>) => {
  const etat = estimerObjectif(...args)
  types.add(etat.type)
  return etat
}

describe('estimerObjectif (spec § 4.5)', () => {
  test('sansProfil : pas de profil, usage nul ou cible absente', () => {
    expect(estimer(null, plate(80), rythme(-0.5), J0)).toEqual({ type: 'sansProfil' })
    expect(estimer({ usage: null }, plate(80), null, J0)).toEqual({ type: 'sansProfil' })
    expect(estimer({ usage: 'perdre' }, plate(80), null, J0)).toEqual({ type: 'sansProfil' })
  })

  test('perdre, tendance sous la cible → atteint (gagner : au-dessus)', () => {
    expect(estimer(perdre(80), plate(79.5), rythme(-0.5), J0)).toEqual({ type: 'atteint' })
    expect(estimer(perdre(80), plate(80), null, J0)).toEqual({ type: 'atteint' })
    expect(estimer({ usage: 'gagner', cible: 60 }, plate(60.2), null, J0)).toEqual({
      type: 'atteint',
    })
  })

  test('donneesInsuffisantes : rythme inconnu, ou aucune pesée', () => {
    expect(estimer(perdre(75), plate(80), null, J0)).toEqual({ type: 'donneesInsuffisantes' })
    expect(estimer(perdre(75), [], null, J0)).toEqual({ type: 'donneesInsuffisantes' })
  })

  test('stable : pas de date estimable', () => {
    expect(estimer(perdre(75), plate(80), rythme(-0.08), J0)).toEqual({ type: 'stable' })
  })

  test('mauvaisSens : on s’éloigne de la cible', () => {
    expect(estimer(perdre(75), plate(80), rythme(0.5), J0)).toEqual({
      type: 'mauvaisSens',
      ecartKg: 5,
    })
    expect(estimer({ usage: 'gagner', cible: 65 }, plate(60), rythme(-0.3), J0)).toMatchObject({
      type: 'mauvaisSens',
    })
  })

  test('date : sans erreur, fourchette réduite à la date probable', () => {
    // 2 kg à −0,7 kg/sem (−0,1 kg/j) → 20 jours.
    expect(estimer(perdre(78), plate(80), rythme(-0.7), J0)).toEqual({
      type: 'date',
      probable: ajouterJours(J0, 20),
      auPlusTot: ajouterJours(J0, 20),
      auPlusTard: ajouterJours(J0, 20),
    })
  })

  test('date : fourchette Student à 95 %, la plus prudente peut ne pas exister', () => {
    // pente −0,1 kg/j, erreur 0,02, 28 pesées → t(26 ddl) = 2,056 → marge 0,04112.
    const etat = estimer(perdre(78), plate(80), rythme(-0.7, 0.02), J0)
    expect(etat).toEqual({
      type: 'date',
      probable: ajouterJours(J0, 20),
      auPlusTot: ajouterJours(J0, Math.ceil(2 / 0.14112)),
      auPlusTard: ajouterJours(J0, Math.ceil(2 / 0.05888)),
    })
    // Erreur plus grande que la pente : la borne prudente ne descend plus → au plus tôt seulement.
    const incertain = estimer(perdre(78), plate(80), rythme(-0.7, 0.06), J0)
    expect(incertain).toMatchObject({ type: 'date', auPlusTard: null })
  })

  test('lointain : au-delà de l’horizon, fourchette en jours (Q1)', () => {
    // 20 kg à −0,7 kg/sem → 200 jours.
    expect(estimer(perdre(60), plate(80), rythme(-0.7, 0.02), J0)).toEqual({
      type: 'lointain',
      jours: 200,
      joursAuPlusTot: Math.ceil(20 / 0.14112),
      joursAuPlusTard: Math.ceil(20 / 0.05888),
    })
  })

  test('gagner : même calcul dans l’autre sens', () => {
    expect(estimer({ usage: 'gagner', cible: 62 }, plate(60), rythme(0.7), J0)).toMatchObject({
      type: 'date',
      probable: ajouterJours(J0, 20),
    })
  })

  describe('maintenir', () => {
    const maintenir = { usage: 'maintenir' as const, cible: 70, tolerance: 1 }

    test('zone = cible ± tolérance (1 kg par défaut)', () => {
      expect(zoneMaintien(70, 0.5)).toEqual({ bas: 69.5, haut: 70.5 })
      expect(zoneMaintien(70)).toEqual({ bas: 69, haut: 71 })
    })

    test('tendance sortie de la zone hier → horsZone', () => {
      const tendance = [...plate(70.5, 4), { date: ajouterJours(J0, -1), tendance: 71.4 }]
      expect(estimer(maintenir, tendance, null, J0)).toEqual({
        type: 'horsZone',
        sens: 'dessus',
        ecartKg: expect.closeTo(0.4, 6) as unknown as number,
      })
      expect(estimer(maintenir, plate(68.5), null, J0)).toMatchObject({
        type: 'horsZone',
        sens: 'dessous',
      })
    })

    test('rentrée depuis 3 jours → dansZone, depuisJours = 3', () => {
      const tendance: PointTendance[] = [
        { date: ajouterJours(J0, -5), tendance: 70 },
        { date: ajouterJours(J0, -4), tendance: 71.6 },
        { date: ajouterJours(J0, -3), tendance: 70.9 },
        { date: ajouterJours(J0, -2), tendance: 70.6 },
        { date: J0, tendance: 70.2 },
      ]
      expect(estimer(maintenir, tendance, null, J0)).toEqual({ type: 'dansZone', depuisJours: 3 })
    })

    test('toujours dans la zone : depuis la première pesée', () => {
      expect(estimer(maintenir, plate(70, 10), rythme(0), J0)).toEqual({
        type: 'dansZone',
        depuisJours: 9,
      })
    })
  })

  test('les 9 types de EtatObjectif sont couverts', () => {
    expect([...types].sort()).toEqual(
      [
        'atteint',
        'dansZone',
        'date',
        'donneesInsuffisantes',
        'horsZone',
        'lointain',
        'mauvaisSens',
        'sansProfil',
        'stable',
      ].sort(),
    )
  })
})

describe('tonVariation (spec § 5.3)', () => {
  test('neutre sans usage ou sans variation', () => {
    expect(tonVariation(null, 80, -1)).toBeNull()
    expect(tonVariation({ usage: null }, 80, -1)).toBeNull()
    expect(tonVariation(perdre(75), 80, 0)).toBeNull()
    expect(tonVariation(perdre(75), 80, null)).toBeNull()
  })

  test('variation trop faible pour être lue : neutre (seuil « stable » ramené à la durée)', () => {
    expect(tonVariation(perdre(75), 80, 0.09)).toBeNull()
    expect(tonVariation(perdre(75), 80, 0.1, 30)).toBeNull()
    expect(tonVariation(perdre(75), 80, 0.5, 30)).toBe('defavorable')
  })

  test('perdre / gagner : vers la cible = favorable', () => {
    expect(tonVariation(perdre(75), 80, -0.4)).toBe('favorable')
    expect(tonVariation(perdre(75), 80, 0.4)).toBe('defavorable')
    expect(tonVariation({ usage: 'gagner', cible: 65 }, 60, 0.4)).toBe('favorable')
  })

  test('maintenir : neutre dans la zone, sinon retour vers la zone = favorable', () => {
    const maintenir = { usage: 'maintenir' as const, cible: 70, tolerance: 1 }
    expect(tonVariation(maintenir, 70.5, 0.3)).toBeNull()
    expect(tonVariation(maintenir, 72, -0.3)).toBe('favorable')
    expect(tonVariation(maintenir, 68, -0.3)).toBe('defavorable')
  })
})
