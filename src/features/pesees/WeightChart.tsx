import { PERIODS, dayToMs, filterByPeriod, movingAverage, type Pesee } from '../../core/pesees'
import { usePreferences } from '../prefs/usePreferences'
import { formatDay, formatShortDay, formatWeight } from './format'

const PERIOD_LABELS = { '30j': '30 j', '90j': '90 j', '1an': '1 an', tout: 'Tout' } as const

// Repère SVG ; le graphique s'adapte à la largeur de l'écran (viewBox).
const W = 360
const H = 220
const M = { top: 12, right: 12, bottom: 26, left: 44 }

/** Évolution du poids (courbe) ; période, moyenne et échelle réglables (préférences). */
export function WeightChart({ pesees }: { pesees: Pesee[] }) {
  const [preferences, update] = usePreferences()
  const options = preferences.chart
  const set = (change: Partial<typeof options>) => update({ chart: { ...options, ...change } })
  const points = filterByPeriod(pesees, options.period)

  return (
    <section className="card">
      <h2>Évolution</h2>
      <div className="row" role="group" aria-label="Période">
        {PERIODS.map((period) => (
          <button
            key={period}
            type="button"
            aria-pressed={options.period === period}
            onClick={() => set({ period })}
          >
            {PERIOD_LABELS[period]}
          </button>
        ))}
      </div>
      <div className="row">
        <label className="inline">
          <input
            type="checkbox"
            checked={options.average}
            onChange={(e) => set({ average: e.target.checked })}
          />
          Moyenne 7 j
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={options.fromZero}
            onChange={(e) => set({ fromZero: e.target.checked })}
          />
          Axe depuis 0
        </label>
      </div>
      {points.length < 2 ? (
        <p className="hint">Pas assez de pesées sur cette période (2 au minimum).</p>
      ) : (
        <Plot points={points} average={options.average} fromZero={options.fromZero} />
      )}
    </section>
  )
}

function Plot({
  points,
  average,
  fromZero,
}: {
  points: Pesee[]
  average: boolean
  fromZero: boolean
}) {
  const xs = points.map((p) => dayToMs(p.date))
  const weights = points.map((p) => p.poids)
  const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)]
  const {
    ticks,
    min: yMin,
    max: yMax,
  } = niceScale(fromZero ? 0 : Math.min(...weights), Math.max(...weights))

  const plotW = W - M.left - M.right
  const plotH = H - M.top - M.bottom
  const x = (ms: number) => M.left + ((ms - xMin) / (xMax - xMin || 1)) * plotW
  const y = (kg: number) => M.top + (1 - (kg - yMin) / (yMax - yMin)) * plotH
  const line = (list: { date: string; poids: number }[]) =>
    list.map((p) => `${x(dayToMs(p.date)).toFixed(1)},${y(p.poids).toFixed(1)}`).join(' ')
  // Moins de 6 px par pesée : on n'affiche plus les ronds (zones de survol invisibles).
  const dense = plotW / points.length < 6
  // Avec la moyenne, c'est elle qui porte la tendance : les pesées brutes passent en fond.
  const raw = average ? ' faded' : ''
  const dateTicks = [0, 1 / 3, 2 / 3, 1].map((f) => xMin + f * (xMax - xMin))
  const first = points[0]
  const last = points[points.length - 1]
  const tooltip = (p: Pesee) => <title>{`${formatDay(p.date)} : ${formatWeight(p.poids)}`}</title>

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Poids du ${formatDay(first.date)} au ${formatDay(last.date)} : de ${formatWeight(first.poids)} à ${formatWeight(last.poids)}`}
    >
      {ticks.map((tick) => (
        <g key={tick} className="grid">
          <line x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} />
          <text x={M.left - 6} y={y(tick)} textAnchor="end" dominantBaseline="middle">
            {Number.isInteger(tick) ? tick : tick.toFixed(1)}
          </text>
        </g>
      ))}
      {dateTicks.map((ms, i) => (
        <text
          key={ms}
          className="axis"
          x={x(ms)}
          y={H - 6}
          textAnchor={i === 0 ? 'start' : i === dateTicks.length - 1 ? 'end' : 'middle'}
        >
          {formatShortDay(new Date(ms).toISOString().slice(0, 10))}
        </text>
      ))}

      <polyline className={`series${dense ? ' thin' : ''}${raw}`} points={line(points)} />
      {points.map((p) => (
        <circle
          key={p.date}
          className={dense ? 'hit' : `dot${raw}`}
          cx={x(dayToMs(p.date))}
          cy={y(p.poids)}
          r={dense ? 4 : 2.5}
        >
          {tooltip(p)}
        </circle>
      ))}
      {average && <polyline className="average" points={line(movingAverage(points))} />}
    </svg>
  )
}

/** Graduations « rondes » (pas de 0,5 / 1 / 2 / 5 kg…) qui encadrent les valeurs. */
function niceScale(low: number, high: number, target = 4) {
  const span = Math.max(high - low, 1)
  const raw = span / target
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!
  const min = Math.max(0, Math.floor(low / step) * step)
  const max = Math.ceil(high / step) * step
  const ticks: number[] = []
  for (let t = min; t <= max + step / 2; t += step) ticks.push(Math.round(t * 100) / 100)
  return { ticks, min, max: max > min ? max : min + step }
}
