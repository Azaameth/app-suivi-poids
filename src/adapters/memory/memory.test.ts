import { describe, expect, test, vi } from 'vitest'
import { createMemoryServices } from '.'

describe('MemoryDataStore', () => {
  test('watch reçoit l’état initial puis chaque modification', async () => {
    const { data } = createMemoryServices()
    const onChange = vi.fn()
    const stop = data.watch('u1', 'entries', onChange)
    await data.set('u1', 'entries', 'a', { value: 'v1:x:y' })
    await data.remove('u1', 'entries', 'a')
    stop()
    await data.set('u1', 'entries', 'b', {})
    expect(onChange.mock.calls.map(([docs]) => docs.length)).toEqual([0, 1, 0])
  })

  test('isole les utilisateurs', async () => {
    const { data } = createMemoryServices()
    await data.set('u1', 'entries', 'a', { n: 1 })
    expect(await data.get('u2', 'entries', 'a')).toBeNull()
  })

  test('renvoie des copies', async () => {
    const { data } = createMemoryServices()
    await data.set('u1', 'entries', 'a', { n: 1 })
    const doc = (await data.get('u1', 'entries', 'a'))!
    doc.n = 2
    expect(await data.get('u1', 'entries', 'a')).toEqual({ n: 1 })
  })
})

describe('MemoryAuthService', () => {
  test('notifie connexion et déconnexion', async () => {
    const { auth } = createMemoryServices()
    const listener = vi.fn()
    auth.onAuthStateChanged(listener)
    await auth.signIn({ method: 'google' })
    await auth.signOut()
    expect(listener.mock.calls.map(([u]) => u?.email ?? null)).toEqual([
      null,
      'test@example.com',
      null,
    ])
  })
})
