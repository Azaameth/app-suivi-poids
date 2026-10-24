import { afterEach, expect, test } from 'vitest'
import { WebPreferencesStore } from './WebPreferencesStore'

afterEach(() => localStorage.clear())

test('persiste entre deux instances (rechargement de la page)', () => {
  const store = new WebPreferencesStore()
  store.set({ ...store.get(), autoLockMinutes: 15 })
  expect(new WebPreferencesStore().get().autoLockMinutes).toBe(15)
})

test('contenu corrompu : valeurs par défaut', () => {
  localStorage.setItem('machimoto.preferences', '{pas du json')
  expect(new WebPreferencesStore().get().autoLockMinutes).toBe(5)
})
