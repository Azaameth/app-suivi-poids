import { PERIODS, dayToMs, filterByPeriod, movingAverage, type Pesee } from '../../core/pesees'
import { CHART_STYLES, type ChartStyle } from '../../core/prefs/Preferences'
import { usePreferences } from '../prefs/usePreferences'
import { formatDay, formatShortDay, formatWeight } from './format'

const PERIOD_LABELS = { '30j': '30 j', '90j': '90 j', '1an': '1 an', tout: 'Tout' } as const
const STYLE_LABELS: Record<ChartStyle, string> = {
  courbe: 'Courbe',
  points: 'Points',
  barres: 'Barres',
}

// Repère SVG ; le graphique s'adapte à la largeur de l'écran (viewBox).
const W = 360
const H = 220
const M = { top: 12, right: 12, bottom: 26, left: 44 }

/** Évolution du poids ; période, style, moyenne et échelle réglables (préférences). */
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
      <div className="row" role="group" aria-label="Style">
        {CHART_STYLES.map((style) => (
          <button
            key={style}
            type="button"
            aria-pressed={options.style === style}
            onClick={() => set({ style })}
          >
            {STYLE_LABELS[style]}
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
        <Plot
          points={points}
          style={options.style}
          average={options.average}
          fromZero={options.fromZero}
        />
      )}
    </section>
  )
}

function Plot({
  points,
  style,
  average,
  fromZero,
}: {
  points: Pesee[]
  style: ChartStyle
  average: boolean
  fromZero: boolean
}) {
  const xs = points.map((p) => dayToMs(p.date))
  const weights = points.map((p) => p.poids)
  const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)]
  const [wMin, wMax] = [Math.min(...weights), Math.max(...weights)]
  const pad = Math.max(0.5, (wMax - wMin) * 0.1)
  const yMin = fromZero ? 0 : Math.max(0, wMin - pad)
  const yMax = wMax + pad

  const plotW = W - M.left - M.right
  const plotH = H - M.top - M.bottom
  const x = (ms: number) => M.left + ((ms - xMin) / (xMax - xMin || 1)) * plotW
  const y = (kg: number) => M.top + (1 - (kg - yMin) / (yMax - yMin)) * plotH
  const ticks = [yMin, (yMin + yMax) / 2, yMax]
  const line = (list: { date: string; poids: number }[]) =>
    list.map((p) => `${x(dayToMs(p.date)).toFixed(1)},${y(p.poids).toFixed(1)}`).join(' ')
  const barWidth = Math.max(2, Math.min(16, (plotW / points.length) * 0.6))
  const first = points[0]
  const last = points[points.length - 1]

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
            {tick.toFixed(1)}
          </text>
        </g>
      ))}
      <text className="axis" x={M.left} y={H - 6}>
        {formatShortDay(first.date)}
      </text>
      <text className="axis" x={W - M.right} y={H - 6} textAnchor="end">
        {formatShortDay(last.date)}
      </text>

      {style === 'courbe' && <polyline className="series" points={line(points)} />}
      {style === 'barres'
        ? points.map((p) => (
            <rect
              key={p.date}
              className="bar"
              x={x(dayToMs(p.date)) - barWidth / 2}
              y={y(p.poids)}
              width={barWidth}
              height={Math.max(0, y(yMin) - y(p.poids))}
            >
              <title>{`${formatDay(p.date)} : ${formatWeight(p.poids)}`}</title>
            </rect>
          ))
        : points.map((p) => (
            <circle
              key={p.date}
              className="dot"
              cx={x(dayToMs(p.date))}
              cy={y(p.poids)}
              r={style === 'points' ? 3.5 : 2.5}
            >
              <title>{`${formatDay(p.date)} : ${formatWeight(p.poids)}`}</title>
            </circle>
          ))}
      {average && <polyline className="average" points={line(movingAverage(points))} />}
    </svg>
  )
}
