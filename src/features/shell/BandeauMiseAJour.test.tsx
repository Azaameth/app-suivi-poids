import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { MiseAJourContext, type MiseAJour } from '../../context/MiseAJourContext'
import { BandeauMiseAJour } from './BandeauMiseAJour'

afterEach(cleanup)

function fausseMiseAJour() {
  let signaler = () => {}
  const appels: string[] = []
  const miseAJour: MiseAJour = {
    surveiller: (onDisponible) => {
      signaler = onDisponible
      return () => {}
    },
    appliquer: () => appels.push('appliquer'),
  }
  return { miseAJour, appels, disponible: () => act(() => signaler()) }
}

const afficher = (miseAJour: MiseAJour) =>
  render(
    <MiseAJourContext.Provider value={miseAJour}>
      <BandeauMiseAJour />
    </MiseAJourContext.Provider>,
  )

test('rien tant qu’aucune version n’attend, puis « Mettre à jour » applique', () => {
  const { miseAJour, appels, disponible } = fausseMiseAJour()
  afficher(miseAJour)
  expect(screen.queryByRole('status')).toBeNull()
  disponible()
  expect(screen.getByRole('status').textContent).toMatch(/Nouvelle version/)
  fireEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }))
  expect(appels).toEqual(['appliquer'])
})

test('« Plus tard » masque le bandeau sans rien appliquer', () => {
  const { miseAJour, appels, disponible } = fausseMiseAJour()
  afficher(miseAJour)
  disponible()
  fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }))
  expect(screen.queryByRole('status')).toBeNull()
  expect(appels).toEqual([])
})
