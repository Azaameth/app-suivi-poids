import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { createMemoryServices } from '../../adapters/memory'
import type { MemoryFileExporter } from '../../adapters/memory/MemoryFileExporter'
import { createVault, fill, menuProfil, renderApp, signIn } from '../../test/appHarness'

afterEach(cleanup)

const NOUVELLE = 'une nouvelle phrase longue'

describe('code de secours (bloc 2.9)', () => {
  test('création : code affiché une fois, téléchargeable, « Continuer » après confirmation', async () => {
    const services = createMemoryServices()
    renderApp(services)
    await signIn()
    await screen.findByRole('heading', { name: 'Choisis ta phrase secrète' })
    fill('Phrase secrète', 'cheval agrafe batterie')
    fill('Confirmation', 'cheval agrafe batterie')
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon coffre' }))
    await screen.findByRole('heading', { name: 'Ton code de secours' }, { timeout: 5000 })

    const code = screen.getByLabelText('Code de secours').textContent!
    expect(code).toMatch(/^([0-9A-Z]{4}-){7}[0-9A-Z]{4}$/)
    const continuer = screen.getByRole('button', { name: 'Continuer' }) as HTMLButtonElement
    expect(continuer.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger (.txt)' }))
    await waitFor(() => expect((services.files as MemoryFileExporter).files).toHaveLength(1))
    expect((services.files as MemoryFileExporter).files[0].content).toContain(code)
    fireEvent.click(screen.getByLabelText('J’ai rangé mon code en lieu sûr'))
    fireEvent.click(continuer)
    await screen.findByRole('heading', { name: 'Tableau de bord' })
  }, 15_000)

  test('phrase oubliée : code + nouvelle phrase → coffre ouvert ; mauvais code refusé', async () => {
    renderApp()
    await signIn()
    const code = await createVault()
    menuProfil('🔒 Verrouiller')
    await screen.findByRole('heading', { name: 'Coffre verrouillé' })
    fireEvent.click(screen.getByRole('button', { name: 'J’ai oublié ma phrase' }))
    await screen.findByRole('heading', { name: 'Phrase oubliée' })

    fill('Code de secours', '0000-1111-2222-3333-4444-5555-6666-7777')
    fill('Nouvelle phrase secrète', NOUVELLE)
    fill('Confirmation', NOUVELLE)
    fireEvent.click(screen.getByRole('button', { name: 'Choisir cette phrase' }))
    expect((await screen.findByRole('alert', {}, { timeout: 5000 })).textContent).toMatch(
      /Code de secours incorrect/,
    )

    fill('Code de secours', code.toLowerCase().replaceAll('-', ' '))
    fireEvent.click(screen.getByRole('button', { name: 'Choisir cette phrase' }))
    await screen.findByRole('heading', { name: 'Tableau de bord' }, { timeout: 5000 })
  }, 20_000)

  test('Réglages : régénérer le code (phrase actuelle exigée)', async () => {
    renderApp()
    await signIn()
    await createVault()
    fireEvent.click(screen.getByRole('button', { name: 'Réglages' }))
    const resume = await screen.findByText('Code de secours')
    fireEvent.click(resume)
    const section = resume.closest('details')!
    await within(section).findByText(/Un code de secours existe/)
    fireEvent.change(within(section).getByLabelText('Phrase actuelle'), {
      target: { value: 'cheval agrafe batterie' },
    })
    fireEvent.click(within(section).getByRole('button', { name: 'Régénérer mon code de secours' }))
    await within(section).findByRole('heading', { name: 'Ton code de secours' }, { timeout: 5000 })
  }, 20_000)
})
