import { describe, expect, test, vi } from 'vitest'
import { createMemoryServices } from '../../adapters/memory'
import { MemoryCleAppareil } from '../../adapters/memory/MemoryCleAppareil'
import { seDeconnecter } from '../compte/supprimerCompte'
import { CleAppareilInvalideeError, EmpreinteAnnuleeError } from '../keys/KeyStore'
import { PeseeRepository, type Pesee } from '../pesees'
import { Vault } from '.'

const PHRASE = 'cheval agrafe batterie'

/** Appareil simulé, avec espions sur ses méthodes. */
class FauxAppareil extends MemoryCleAppareil {
  override disponible = vi.fn(() => super.disponible())
  override presente = vi.fn((uid: string) => super.presente(uid))
  override conserver = vi.fn((uid: string, brute: Uint8Array) => super.conserver(uid, brute))
  override restituer = vi.fn((uid: string) => super.restituer(uid))
  override oublier = vi.fn((uid: string) => super.oublier(uid))
}

function setup() {
  const services = createMemoryServices()
  const appareil = new FauxAppareil()
  services.keys.appareil = appareil
  return { ...services, appareil, vault: new Vault(services.data, services.keys, 'alice') }
}

function firstPesees(repo: PeseeRepository) {
  return new Promise<Pesee[]>((resolve) => repo.watch(resolve))
}

describe('Vault et clé conservée sur l’appareil (Android, D13)', () => {
  test('déverrouillage par la phrase : clé confiée une fois à l’appareil, 32 octets', async () => {
    const { vault, appareil } = setup()
    appareil.estDisponible = false // création sur un téléphone sans empreinte
    await vault.setup(PHRASE)
    await vault.lock()
    expect(await vault.cleSurAppareil()).toBe(false)

    appareil.estDisponible = true
    const key = await vault.unlock(PHRASE)
    expect(key.extractable).toBe(false)
    expect(appareil.conserver).toHaveBeenCalledOnce()
    expect(appareil.cles.get('alice')).toHaveLength(32)
    expect(await vault.cleSurAppareil()).toBe(true)

    // Déjà conservée : la phrase (repli) ne redemande pas l'empreinte pour la conserver.
    await vault.lock()
    await vault.unlock(PHRASE)
    expect(appareil.conserver).toHaveBeenCalledOnce()
  })

  test('création du coffre : clé confiée à l’appareil aussitôt (phrase saisie une seule fois)', async () => {
    const { vault, appareil } = setup()
    await vault.setup(PHRASE)
    expect(appareil.conserver).toHaveBeenCalledOnce()
    await vault.lock()
    await vault.deverrouillerAppareil()
    expect(await vault.status()).toBe('unlocked')
  })

  test('les octets passés à l’appareil sont effacés ensuite', async () => {
    const { vault, appareil } = setup()
    await vault.setup(PHRASE)
    const transmis = appareil.conserver.mock.calls[0]![1]
    expect(transmis.every((octet) => octet === 0)).toBe(true)
  })

  test('verrouillage (inactivité) : l’empreinte suffit, et la clé lit les pesées', async () => {
    const { data, vault } = setup()
    const { key } = await vault.setup(PHRASE)
    await new PeseeRepository(data, 'alice', key).save({ date: '2026-11-26', poids: 71.8 })
    await vault.lock()
    await vault.unlock(PHRASE)

    await vault.lock()
    expect(await vault.status()).toBe('locked')
    expect(await vault.cleSurAppareil()).toBe(true)
    const restituee = await vault.deverrouillerAppareil()
    expect(restituee.extractable).toBe(false)
    expect(await vault.status()).toBe('unlocked')
    const pesees = await firstPesees(new PeseeRepository(data, 'alice', restituee))
    expect(pesees).toMatchObject([{ date: '2026-11-26', poids: 71.8 }])
  })

  test('empreinte refusée à la conservation : déverrouillé quand même, rien de conservé', async () => {
    const { vault, appareil } = setup()
    appareil.refus = new EmpreinteAnnuleeError()
    await vault.setup(PHRASE)
    await vault.lock()
    await vault.unlock(PHRASE)
    expect(await vault.status()).toBe('unlocked')
    expect(await vault.cleSurAppareil()).toBe(false)
  })

  test('appareil sans empreinte enregistrée : rien de conservé, pas de demande', async () => {
    const { vault, appareil } = setup()
    appareil.estDisponible = false
    await vault.setup(PHRASE)
    await vault.lock()
    await vault.unlock(PHRASE)
    expect(appareil.conserver).not.toHaveBeenCalled()
  })

  test('empreinte annulée ou clé invalidée : erreurs transmises, coffre verrouillé', async () => {
    const { vault, appareil } = setup()
    await vault.setup(PHRASE)
    await vault.lock()
    await vault.unlock(PHRASE)
    await vault.lock()

    appareil.refus = new EmpreinteAnnuleeError()
    await expect(vault.deverrouillerAppareil()).rejects.toThrow(EmpreinteAnnuleeError)
    appareil.refus = new CleAppareilInvalideeError()
    await expect(vault.deverrouillerAppareil()).rejects.toThrow(CleAppareilInvalideeError)
    expect(await vault.status()).toBe('locked')
  })

  test('déconnexion : clé oubliée sur l’appareil, session fermée même si l’appareil échoue', async () => {
    const services = setup()
    await services.vault.setup(PHRASE)
    await services.vault.lock()
    await services.vault.unlock(PHRASE)
    const signOut = vi.spyOn(services.auth, 'signOut')

    await seDeconnecter(services, 'alice')
    expect(services.appareil.cles.has('alice')).toBe(false)
    expect(await services.keys.load()).toBeNull()
    expect(signOut).toHaveBeenCalledOnce()

    services.appareil.oublier.mockRejectedValueOnce(new Error('plugin absent'))
    await expect(seDeconnecter(services, 'alice')).rejects.toThrow('plugin absent')
    expect(signOut).toHaveBeenCalledTimes(2)
  })

  test('plugin en erreur : la phrase déverrouille quand même (repli indépendant de l’appareil)', async () => {
    const { vault, appareil } = setup()
    appareil.estDisponible = false
    await vault.setup(PHRASE)
    await vault.lock()
    appareil.presente.mockRejectedValueOnce(new Error('Keystore illisible'))
    await vault.unlock(PHRASE)
    expect(await vault.status()).toBe('unlocked')
    expect(appareil.conserver).not.toHaveBeenCalled()

    await vault.lock()
    appareil.estDisponible = true
    appareil.disponible.mockRejectedValueOnce(new Error('plugin absent'))
    await vault.unlock(PHRASE)
    expect(await vault.status()).toBe('unlocked')
  })

  test('web (pas d’appareil) : comportement inchangé', async () => {
    const services = createMemoryServices()
    const vault = new Vault(services.data, services.keys, 'alice')
    await vault.setup(PHRASE)
    await vault.lock()
    expect(await vault.cleSurAppareil()).toBe(false)
    await expect(vault.deverrouillerAppareil()).rejects.toThrow()
    expect((await vault.unlock(PHRASE)).extractable).toBe(false)
  })
})
