import { expect, test } from 'vitest'
import { SyncTracker, type NetworkTarget } from './SyncTracker'

function fakeWindow(onLine: boolean) {
  const target = new EventTarget() as EventTarget & NetworkTarget
  target.navigator = { onLine }
  return target
}

test('online → pending pendant une écriture → online', async () => {
  const tracker = new SyncTracker(fakeWindow(true))
  const states: string[] = []
  tracker.watch((s) => states.push(s))
  let confirm!: () => void
  const write = tracker.track(new Promise<void>((resolve) => (confirm = resolve)))
  confirm()
  await write
  expect(states).toEqual(['online', 'pending', 'online'])
})

test('compte les écritures en attente', async () => {
  const tracker = new SyncTracker(fakeWindow(false))
  const vus: number[] = []
  tracker.watch((_, pending) => vus.push(pending))
  let confirm!: () => void
  const a = tracker.track(new Promise<void>((resolve) => (confirm = resolve)))
  void tracker.track(new Promise(() => {}))
  expect(tracker.pendingWrites).toBe(2)
  confirm()
  await a
  expect(vus).toEqual([0, 1, 2, 1])
})

test('hors ligne prime sur les écritures en attente', () => {
  const target = fakeWindow(true)
  const tracker = new SyncTracker(target)
  void tracker.track(new Promise(() => {}))
  expect(tracker.state).toBe('pending')
  target.dispatchEvent(new Event('offline'))
  expect(tracker.state).toBe('offline')
  target.dispatchEvent(new Event('online'))
  expect(tracker.state).toBe('pending')
})

test('une écriture refusée ne reste pas en attente', async () => {
  const tracker = new SyncTracker(fakeWindow(true))
  await expect(tracker.track(Promise.reject(new Error('refusé')))).rejects.toThrow()
  expect(tracker.state).toBe('online')
})

test('démarre hors ligne si le navigateur l’est', () => {
  expect(new SyncTracker(fakeWindow(false)).state).toBe('offline')
})
