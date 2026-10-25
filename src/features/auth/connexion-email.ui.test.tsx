import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { createMemoryServices } from '../../adapters/memory'
import type { MemoryAuthService } from '../../adapters/memory/MemoryAuthService'
import { PESEES, PeseeRepository } from '../../core/pesees'
import { createVault, fill, renderApp } from '../../test/appHarness'

afterEach(cleanup)

const EMAIL = 'proche@example.com'
const MOT_DE_PASSE = 'motdepasse-long'
const bouton = (name: string | RegExp) => screen.getByRole('button', { name })

function formulaire(mode: 'creation' | 'connexion') {
  if (!screen.queryByRole('form')) fireEvent.click(bouton('Utiliser un e-mail'))
  if (mode === 'creation') fireEvent.click(bouton('Créer un compte'))
  fill('E-mail', EMAIL)
}

async function creerCompte() {
  formulaire('creation')
  fill('Mot de passe', MOT_DE_PASSE)
  fill('Confirmation', MOT_DE_PASSE)
  fireEvent.click(bouton('Créer mon compte'))
  await createVault()
}

async function seDeconnecter() {
  fireEvent.click(bouton(`Profil de ${EMAIL}`))
  fireEvent.click(bouton('🚪 Se déconnecter'))
  const fenetre = screen.getByRole('dialog', { name: 'Se déconnecter' })
  fireEvent.click(within(fenetre).getByRole('button', { name: '🚪 Se déconnecter' }))
  await screen.findByRole('button', { name: 'Se connecter avec Google' })
}

describe('connexion par e-mail (bloc 2.13)', () => {
  test('création, déconnexion, mauvais mot de passe refusé, puis reconnexion', async () => {
    renderApp()
    await creerCompte()
    await seDeconnecter()

    formulaire('connexion')
    fill('Mot de passe', 'pas-le-bon')
    fireEvent.click(bouton('Se connecter'))
    expect((await screen.findByRole('alert')).textContent).toBe('E-mail ou mot de passe incorrect.')

    fill('Mot de passe', MOT_DE_PASSE)
    fireEvent.click(bouton('Se connecter'))
    await screen.findByRole('heading', { name: 'Coffre verrouillé' })
  }, 20_000)

  test('création refusée : confirmation différente, mot de passe trop court, e-mail déjà pris', async () => {
    const services = createMemoryServices()
    await services.auth.signIn({
      method: 'email',
      email: EMAIL,
      motDePasse: MOT_DE_PASSE,
      creation: true,
    })
    await services.auth.signOut()
    renderApp(services)

    formulaire('creation')
    fill('Mot de passe', 'court')
    fill('Confirmation', 'autre')
    fireEvent.click(bouton('Créer mon compte'))
    expect((await screen.findByRole('alert')).textContent).toMatch(/ne correspondent pas/)

    fill('Confirmation', 'court')
    fireEvent.click(bouton('Créer mon compte'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/trop court/))

    fill('Mot de passe', MOT_DE_PASSE)
    fill('Confirmation', MOT_DE_PASSE)
    fireEvent.click(bouton('Créer mon compte'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/existe déjà/))
  })

  test('mot de passe oublié : message neutre, e-mail demandé', async () => {
    const services = createMemoryServices()
    renderApp(services)
    fireEvent.click(bouton('Utiliser un e-mail'))
    fireEvent.click(bouton('Mot de passe oublié ?'))
    fill('E-mail', EMAIL)
    fireEvent.click(bouton('Envoyer le lien'))
    expect((await screen.findByRole('status')).textContent).toMatch(/Si un compte existe/)
    expect((services.auth as MemoryAuthService).reinitialisations).toEqual([EMAIL])
  })

  test('suppression du compte : mot de passe vérifié avant tout effacement', async () => {
    const services = renderApp()
    await creerCompte()
    const uid = `uid-${EMAIL}`
    const key = await services.keys.load()
    await new PeseeRepository(services.data, uid, key!).save({ date: '2026-10-25', poids: 75 })

    fireEvent.click(bouton('Réglages'))
    fireEvent.click(
      await screen.findByRole('button', { name: /Supprimer mon compte et mes données/ }),
    )
    fill(/Pour confirmer, tape SUPPRIMER/, 'SUPPRIMER')
    const confirmer = bouton('Supprimer définitivement') as HTMLButtonElement
    expect(confirmer.disabled).toBe(true)

    fill('Mot de passe du compte', 'pas-le-bon')
    fireEvent.click(confirmer)
    expect((await screen.findByRole('alert')).textContent).toMatch(/rien n’a été effacé/)
    expect(await services.data.get(uid, PESEES, '2026-10-25')).not.toBeNull()

    fill('Mot de passe du compte', MOT_DE_PASSE)
    fireEvent.click(confirmer)
    await screen.findByRole('button', { name: 'Se connecter avec Google' })
    await waitFor(async () => expect(await services.data.get(uid, 'meta', 'keys')).toBeNull())
  }, 20_000)
})
