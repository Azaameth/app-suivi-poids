import { describe, expect, test } from 'vitest'
import { createMemoryServices } from '../../adapters/memory'
import { WrongPassphraseError } from '../crypto'
import { PeseeRepository, type Pesee } from '../pesees'
import { KEYS_DOC, META, Vault, VaultAlreadyExistsError, WeakPassphraseError } from '.'

const PHRASE = 'cheval agrafe batterie'
const NOUVELLE = 'correct horse staple'

function setup() {
  const services = createMemoryServices()
  return { ...services, vault: new Vault(services.data, services.keys, 'alice') }
}

function firstPesees(repo: PeseeRepository) {
  return new Promise<Pesee[]>((resolve) => repo.watch(resolve))
}

describe('Vault', () => {
  test('premier lancement → déverrouillé ; verrouillage → la phrase est redemandée', async () => {
    const { vault } = setup()
    expect(await vault.status()).toBe('setup')
    await vault.setup(PHRASE)
    expect(await vault.status()).toBe('unlocked')
    await vault.lock()
    expect(await vault.status()).toBe('locked')
    expect(await vault.key()).toBeNull()
  })

  test('meta/keys ne contient ni la phrase ni la clé en clair', async () => {
    const { data, vault } = setup()
    await vault.setup(PHRASE)
    const meta = await data.get('alice', META, KEYS_DOC)
    expect(Object.keys(meta!).sort()).toEqual([
      'iterations',
      'salt',
      'secours',
      'version',
      'wrappedKey',
    ])
    expect(JSON.stringify(meta)).not.toContain(PHRASE)
  })

  test('déverrouillage : mauvaise phrase refusée, bonne phrase acceptée', async () => {
    const { vault } = setup()
    await vault.setup(PHRASE)
    await vault.lock()
    await expect(vault.unlock('pas la bonne phrase')).rejects.toThrow(WrongPassphraseError)
    expect(await vault.status()).toBe('locked')
    await vault.unlock(PHRASE)
    expect(await vault.status()).toBe('unlocked')
  })

  test('changement de phrase : les pesées existantes restent lisibles', async () => {
    const { data, vault } = setup()
    const { key } = await vault.setup(PHRASE)
    await new PeseeRepository(data, 'alice', key).save({ date: '2026-10-24', poids: 72.4 })

    await vault.changePassphrase(PHRASE, NOUVELLE)
    await vault.lock()
    await expect(vault.unlock(PHRASE)).rejects.toThrow(WrongPassphraseError)
    const newKey = await vault.unlock(NOUVELLE)

    const pesees = await firstPesees(new PeseeRepository(data, 'alice', newKey))
    expect(pesees).toMatchObject([{ date: '2026-10-24', poids: 72.4 }])
  })

  test('refuse d’écraser une phrase existante (données devenues illisibles)', async () => {
    const { data, keys } = setup()
    await new Vault(data, keys, 'alice').setup(PHRASE)
    // Deuxième appareil, coffre verrouillé : setup ne doit pas remplacer meta/keys.
    const autre = createMemoryServices().keys
    await expect(new Vault(data, autre, 'alice').setup(NOUVELLE)).rejects.toThrow(
      VaultAlreadyExistsError,
    )
  })

  test('phrase trop courte refusée à la création et au changement', async () => {
    const { vault } = setup()
    await expect(vault.setup('court')).rejects.toThrow(WeakPassphraseError)
    await vault.setup(PHRASE)
    await expect(vault.changePassphrase(PHRASE, 'court')).rejects.toThrow(WeakPassphraseError)
  })
})
