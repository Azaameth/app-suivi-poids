import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { createMemoryServices } from '../../adapters/memory'
import { MemoryCleAppareil } from '../../adapters/memory/MemoryCleAppareil'
import { CleAppareilInvalideeError, EmpreinteAnnuleeError } from '../../core'
import {
  PHRASE,
  createVault,
  fill,
  menuProfil,
  renderApp,
  seDeconnecter,
  signIn,
} from '../../test/appHarness'

afterEach(cleanup)

/** Android simulé : coffre créé (clé confiée à l'appareil), puis verrouillé. */
async function verrouilleSurAndroid() {
  const services = createMemoryServices()
  const appareil = new MemoryCleAppareil()
  services.keys.appareil = appareil
  renderApp(services)
  await signIn()
  await createVault()
  expect(appareil.cles.has('uid-test')).toBe(true)
  return { services, appareil }
}

describe('déverrouillage par empreinte (D13, #82)', () => {
  test('verrouillage : empreinte demandée d’office, coffre rouvert sans la phrase', async () => {
    const { appareil } = await verrouilleSurAndroid()
    menuProfil('🔒 Verrouiller')
    await waitFor(() => expect(appareil.restitutions).toBe(1))
    await screen.findByRole('heading', { name: 'Tableau de bord' }, { timeout: 5000 })
    expect(screen.queryByRole('heading', { name: 'Coffre verrouillé' })).toBeNull()
    expect(appareil.conservations).toBe(1) // pas de nouvelle demande pour conserver
  }, 15_000)

  test('empreinte annulée : bouton pour réessayer, et la phrase reste possible', async () => {
    const { appareil } = await verrouilleSurAndroid()
    appareil.refus = new EmpreinteAnnuleeError()
    menuProfil('🔒 Verrouiller')
    const bouton = await screen.findByRole('button', { name: '👆 Déverrouiller avec l’empreinte' })
    expect(screen.queryByRole('alert')).toBeNull()

    appareil.refus = null
    fireEvent.click(bouton)
    await screen.findByRole('heading', { name: 'Tableau de bord' }, { timeout: 5000 })

    appareil.refus = new EmpreinteAnnuleeError()
    menuProfil('🔒 Verrouiller')
    await screen.findByRole('button', { name: '👆 Déverrouiller avec l’empreinte' })
    fill('Phrase secrète', PHRASE)
    fireEvent.click(screen.getByRole('button', { name: 'Déverrouiller' }))
    await screen.findByRole('heading', { name: 'Tableau de bord' }, { timeout: 5000 })
  }, 20_000)

  test('empreintes modifiées : message, plus de bouton, phrase demandée', async () => {
    const { appareil } = await verrouilleSurAndroid()
    appareil.refus = new CleAppareilInvalideeError()
    menuProfil('🔒 Verrouiller')
    expect((await screen.findByRole('alert')).textContent).toMatch(/empreintes du téléphone/)
    expect(screen.queryByRole('button', { name: '👆 Déverrouiller avec l’empreinte' })).toBeNull()
  }, 15_000)

  test('déconnexion : la clé conservée est oubliée', async () => {
    const { appareil } = await verrouilleSurAndroid()
    seDeconnecter()
    await screen.findByRole('button', { name: 'Se connecter avec Google' })
    await waitFor(() => expect(appareil.cles.size).toBe(0))
  }, 15_000)
})
