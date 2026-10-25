/**
 * Tracé SVG lissé par interpolation cubique monotone (Fritsch-Carlson, comme `curveMonotoneX`
 * de d3) : passe par chaque point sans jamais dépasser, donc sans inventer de creux ni de bosse.
 * Purement visuel : les valeurs affichées restent celles de la tendance.
 */
export function courbeMonotone(points: [number, number][]): string {
  const n = points.length
  if (n === 0) return ''
  const fmt = (v: number) => v.toFixed(1)
  if (n === 1) return `M${fmt(points[0][0])},${fmt(points[0][1])}`

  const h = points.slice(1).map(([x], i) => x - points[i][0])
  const pentes = points.slice(1).map(([, y], i) => (y - points[i][1]) / h[i])
  const tangentes = points.map((_, i) => {
    if (i === 0) return pentes[0]
    if (i === n - 1) return pentes[n - 2]
    const [s0, s1] = [pentes[i - 1], pentes[i]]
    if (s0 * s1 <= 0) return 0 // extremum local : tangente horizontale, pas de dépassement
    const p = (s0 * h[i] + s1 * h[i - 1]) / (h[i - 1] + h[i])
    return Math.sign(s0) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) * 2
  })

  let d = `M${fmt(points[0][0])},${fmt(points[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    const t = h[i] / 3
    d += `C${fmt(x0 + t)},${fmt(y0 + tangentes[i] * t)} ${fmt(x1 - t)},${fmt(y1 - tangentes[i + 1] * t)} ${fmt(x1)},${fmt(y1)}`
  }
  return d
}
