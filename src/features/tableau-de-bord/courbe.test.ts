import { expect, test } from 'vitest'
import { courbeMonotone } from './courbe'

/** Points de contrôle et d'arrivée de chaque segment cubique. */
function segments(d: string) {
  return [...d.matchAll(/C([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+)/g)].map((m) =>
    m.slice(1).map(Number),
  )
}

test('passe exactement par chaque point', () => {
  const pts: [number, number][] = [
    [0, 10],
    [10, 20],
    [20, 15],
    [30, 30],
  ]
  const d = courbeMonotone(pts)
  expect(d.startsWith('M0.0,10.0')).toBe(true)
  expect(segments(d).map(([, , , , x, y]) => [x, y])).toEqual(pts.slice(1))
})

test('aucun dépassement : chaque segment reste entre ses extrémités', () => {
  const pts: [number, number][] = [
    [0, 80],
    [10, 79.9],
    [20, 79.2],
    [30, 79.25],
    [40, 78],
  ]
  let prec = pts[0]
  for (const [, c1y, , c2y, x, y] of segments(courbeMonotone(pts))) {
    const [bas, haut] = [Math.min(prec[1], y), Math.max(prec[1], y)]
    expect(c1y).toBeGreaterThanOrEqual(bas - 1e-9)
    expect(c1y).toBeLessThanOrEqual(haut + 1e-9)
    expect(c2y).toBeGreaterThanOrEqual(bas - 1e-9)
    expect(c2y).toBeLessThanOrEqual(haut + 1e-9)
    prec = [x, y]
  }
})

test('cas limites : aucun point, un seul point', () => {
  expect(courbeMonotone([])).toBe('')
  expect(courbeMonotone([[5, 5]])).toBe('M5.0,5.0')
})
