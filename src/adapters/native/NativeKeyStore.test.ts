import { describe, expect, test, vi } from 'vitest'
import { CleAppareilInvalideeError, EmpreinteAnnuleeError } from '../../core'
import { createMemoryServices } from '../memory'
import { Vault } from '../../core/vault'
import { NativeKeyStore, cleAppareilNative, type CoffreAppareilPlugin } from './NativeKeyStore'

vi.mock('@capacitor/core', () => ({ registerPlugin: () => ({}) }))

/** Plugin simulé : même contrat que CoffreAppareilPlugin.java (base64, codes d'erreur). */
function faux() {
  const stock = new Map<string, string>()
  const p = {
    stock,
    erreur: null as unknown,
    disponible: vi.fn(async () => ({ disponible: true })),
    presente: vi.fn(async ({ uid }: { uid: string }) => ({ presente: stock.has(uid) })),
    conserver: vi.fn(async ({ uid, cle }: { uid: string; cle: string }) => {
      if (p.erreur) throw p.erreur
      stock.set(uid, cle)
    }),
    restituer: vi.fn(async ({ uid }: { uid: string }) => {
      if (p.erreur) throw p.erreur
      return { cle: stock.get(uid)! }
    }),
    oublier: vi.fn(async ({ uid }: { uid: string }) => void stock.delete(uid)),
  }
  return p satisfies CoffreAppareilPlugin
}

describe('NativeKeyStore (plugin CoffreAppareil simulé)', () => {
  test('octets transmis en base64 et restitués à l’identique', async () => {
    const plugin = faux()
    const appareil = cleAppareilNative(plugin)
    const brute = Uint8Array.from({ length: 32 }, (_, i) => i)
    await appareil.conserver('alice', brute)
    expect(plugin.stock.get('alice')).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(await appareil.presente('alice')).toBe(true)
    expect([...(await appareil.restituer('alice'))]).toEqual([...brute])
    await appareil.oublier('alice')
    expect(await appareil.presente('alice')).toBe(false)
  })

  test('codes ANNULE / INVALIDEE traduits en erreurs du cœur, les autres transmis', async () => {
    const plugin = faux()
    const appareil = cleAppareilNative(plugin)
    plugin.erreur = { code: 'ANNULE', message: 'Annulé' }
    await expect(appareil.restituer('alice')).rejects.toThrow(EmpreinteAnnuleeError)
    await expect(appareil.conserver('alice', new Uint8Array(32))).rejects.toThrow(
      EmpreinteAnnuleeError,
    )
    plugin.erreur = { code: 'INVALIDEE', message: 'Empreintes modifiées' }
    await expect(appareil.restituer('alice')).rejects.toThrow(CleAppareilInvalideeError)
    plugin.erreur = { code: 'ECHEC', message: 'Keystore' }
    await expect(appareil.restituer('alice')).rejects.toMatchObject({ code: 'ECHEC' })
  })

  test('plugin absent ou en erreur : « disponible » répond non, sans lever', async () => {
    const plugin = faux()
    plugin.disponible.mockRejectedValueOnce(new Error('not implemented'))
    expect(await cleAppareilNative(plugin).disponible()).toBe(false)
  })

  test('coffre de bout en bout : phrase une fois, puis empreinte', async () => {
    const plugin = faux()
    const { data } = createMemoryServices()
    const vault = new Vault(data, new NativeKeyStore(cleAppareilNative(plugin)), 'alice')
    await vault.setup('cheval agrafe batterie')
    expect(plugin.conserver).toHaveBeenCalledOnce()
    await vault.lock()
    await vault.deverrouillerAppareil()
    expect(await vault.status()).toBe('unlocked')
  })
})
