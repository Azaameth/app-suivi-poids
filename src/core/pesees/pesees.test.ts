import { describe, expect, test } from 'vitest'
import { DecryptionError } from '../crypto'
import { generateDataKey } from '../crypto/keys'
import { InvalidPeseeError, PESEE_ENCRYPTED_FIELDS, decodePesee, encodePesee, type Pesee } from '.'

const pesee: Pesee = {
  date: '2026-10-24',
  poids: 72.4,
  note: 'après le footing',
  createdAt: 1_793_000_000_000,
  updatedAt: 1_793_000_000_000,
}

describe('encodage des pesées', () => {
  test('aller-retour avec et sans note', async () => {
    const key = await generateDataKey()
    expect(await decodePesee(key, pesee.date, await encodePesee(key, pesee))).toEqual(pesee)
    const sansNote = { ...pesee, note: undefined }
    delete sansNote.note
    const stored = await encodePesee(key, sansNote)
    expect('note' in stored).toBe(false)
    expect(await decodePesee(key, pesee.date, stored)).toEqual(sansNote)
  })

  test('poids et note chiffrés, date et horodatages en clair', async () => {
    const stored = await encodePesee(await generateDataKey(), pesee)
    for (const field of PESEE_ENCRYPTED_FIELDS) expect(stored[field]).toMatch(/^v1:/)
    expect(JSON.stringify(stored)).not.toMatch(/72\.4|footing/)
    expect(stored).toMatchObject({ date: pesee.date, createdAt: pesee.createdAt })
  })

  test.each([
    ['date impossible', { date: '2026-02-30' }],
    ['format de date', { date: '24/10/2026' }],
    ['poids négatif', { poids: -1 }],
    ['poids absurde', { poids: 900 }],
    ['note vide', { note: '   ' }],
    ['note trop longue', { note: 'x'.repeat(501) }],
    ['updatedAt < createdAt', { updatedAt: 0 }],
    ['champ inconnu', { taille: 180 }],
  ])('refuse : %s', async (_, override) => {
    const key = await generateDataKey()
    await expect(encodePesee(key, { ...pesee, ...override } as Pesee)).rejects.toThrow(
      InvalidPeseeError,
    )
  })

  test('refuse un document stocké en clair ou mal rangé', async () => {
    const key = await generateDataKey()
    const stored = await encodePesee(key, pesee)
    await expect(decodePesee(key, pesee.date, { ...stored, poids: 72.4 })).rejects.toThrow(
      InvalidPeseeError,
    )
    await expect(decodePesee(key, '2026-10-25', stored)).rejects.toThrow(InvalidPeseeError)
  })

  test('mauvaise clé → DecryptionError', async () => {
    const stored = await encodePesee(await generateDataKey(), pesee)
    await expect(decodePesee(await generateDataKey(), pesee.date, stored)).rejects.toThrow(
      DecryptionError,
    )
  })
})
