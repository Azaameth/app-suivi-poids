import { describe, expect, test } from 'vitest'
import { formatDateArrondie } from '../commun/format'
import { texteObjectif } from './objectifTexte'

const J0 = '2026-11-22'
const perdre = { usage: 'perdre' as const, cible: 72 }

describe('dates arrondies', () => {
  test('début / mi- / fin de mois, année si elle change', () => {
    expect(formatDateArrondie('2026-12-05', J0)).toBe('début décembre')
    expect(formatDateArrondie('2027-01-14', J0)).toBe('mi-janvier 2027')
    expect(formatDateArrondie('2026-12-28', J0, true)).toBe('fin déc.')
  })
})

describe('texteObjectif (spec § 5.2)', () => {
  test('sans profil : l’affichage v1 est gardé', () => {
    expect(texteObjectif({ type: 'sansProfil' }, { usage: null }, J0, 0)).toBeNull()
  })

  test('date avec fourchette, comme dans la spec', () => {
    expect(
      texteObjectif(
        {
          type: 'date',
          probable: '2027-01-15',
          auPlusTot: '2026-12-25',
          auPlusTard: '2027-01-28',
        },
        perdre,
        J0,
        0,
      ),
    ).toEqual({
      valeur: 'Objectif vers mi-janvier 2027',
      detail: '72,0 kg, à 95 % : fin déc. – fin janv. 2027',
    })
  })

  test('date sans borne prudente : « au plus tôt »', () => {
    expect(
      texteObjectif(
        { type: 'date', probable: '2027-01-15', auPlusTot: '2026-12-29', auPlusTard: null },
        perdre,
        J0,
        0,
      )?.valeur,
    ).toBe('Objectif au plus tôt fin décembre')
  })

  test('lointain : fourchette en mois (Q1)', () => {
    const etat = {
      type: 'lointain' as const,
      jours: 200,
      joursAuPlusTot: 140,
      joursAuPlusTard: 340,
    }
    expect(texteObjectif(etat, perdre, J0, 0)?.valeur).toBe('Dans 5 à 11 mois')
    expect(texteObjectif({ ...etat, joursAuPlusTard: null }, perdre, J0, 0)?.valeur).toBe(
      'Au plus tôt dans 5 mois',
    )
  })

  test('maintenir : zone affichée', () => {
    const maintenir = { usage: 'maintenir' as const, cible: 70, tolerance: 1 }
    expect(texteObjectif({ type: 'dansZone', depuisJours: 23 }, maintenir, J0, 0)).toEqual({
      valeur: 'Dans la zone depuis 23 jours',
      detail: '69,0 – 71,0 kg',
    })
    expect(
      texteObjectif({ type: 'horsZone', sens: 'dessus', ecartKg: 0.6 }, maintenir, J0, 0)?.valeur,
    ).toBe('0,6 kg au-dessus de la zone')
  })

  test('les autres états ont un texte', () => {
    for (const etat of [
      { type: 'atteint' as const },
      { type: 'donneesInsuffisantes' as const },
      { type: 'stable' as const },
      { type: 'mauvaisSens' as const, ecartKg: 3 },
    ]) {
      expect(texteObjectif(etat, perdre, J0, 4)?.valeur).toBeTruthy()
    }
  })
})
