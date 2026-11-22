import { bandesImc, jourEnMs, zoneMaintien } from '../../core/analyse'
import { PERIODS, filterByPeriod, type Pesee } from '../../core/pesees'
import { usePreferences } from '../prefs/usePreferences'
import { formatDay, formatFixed, formatShortDay, formatWeight } from '../commun/format'
import { MachimotoDit } from '../commun/Mascotte'
import { courbeMonotone } from './courbe'
import { reperesTemporels } from './reperes'
import type { Analyse } from './useAnalyse'

const PERIOD_LABELS = {
  '7j': '7 j',
  '30j': '30 j',
  '90j': '90 j',
  '1an': '1 an',
  tout: 'Tout',
} as const

// Repère SVG ; le graphique s'adapte à la largeur de l'écran (viewBox).
const W = 360
const H = 220
const M = { top: 12, right: 12, bottom: 26, left: 40 }

/**
 * Graphique en ligne (spec § 5.1) : pesées en petits points discrets, tendance en trait
 * principal, projection en pointillés avec son cône. Période et axe depuis 0 réglables, au-dessus
 * du cadre (retour d'Azaameth : le graphique garde toute la place).
 */
export function GraphiquePesees({ pesees, analyse }: { pesees: Pesee[]; analyse: Analyse }) {
  const [preferences, update] = usePreferences()
  const options = preferences.chart
  const set = (change: Partial<typeof options>) => update({ chart: { ...options, ...change } })
  const visibles = filterByPeriod(pesees, options.period, analyse.aujourdhui)

  return (
    <>
      <div className="graphique-reglages">
        <div className="segments" role="group" aria-label="Période">
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
        <label className="inline">
          <input
            type="checkbox"
            checked={options.fromZero}
            onChange={(e) => set({ fromZero: e.target.checked })}
          />
          Axe depuis 0
        </label>
        {analyse.profil?.taille && (
          <label className="inline">
            <input
              type="checkbox"
              checked={options.imc}
              onChange={(e) => set({ imc: e.target.checked })}
            />
            Repères IMC
          </label>
        )}
      </div>
      <section className="card graphique" aria-label="Graphique des pesées">
        {visibles.length < 2 ? (
          <MachimotoDit expression="pensif" taille={48}>
            <p>Pas assez de pesées sur cette période (2 au minimum).</p>
          </MachimotoDit>
        ) : (
          <Trace
            visibles={visibles}
            analyse={analyse}
            fromZero={options.fromZero}
            imc={options.imc}
          />
        )}
      </section>
    </>
  )
}

function Trace({
  visibles,
  analyse,
  fromZero,
  imc,
}: {
  visibles: Pesee[]
  analyse: Analyse
  fromZero: boolean
  imc: boolean
}) {
  const debut = visibles[0].date
  const tendance = analyse.tendance.filter((p) => p.date >= debut)
  const projection = analyse.projection ?? []
  const derniere = analyse.tendance.at(-1)!

  const fin = projection.at(-1)?.date ?? visibles.at(-1)!.date
  const [xMin, xMax] = [jourEnMs(debut), jourEnMs(fin)]
  const valeurs = [
    ...visibles.map((p) => p.poids),
    ...tendance.map((p) => p.tendance),
    ...projection.flatMap((p) => [p.bas99, p.haut99]),
  ]
  // Objectif (v1.1) : ligne de cible, ou zone pour « maintenir ». Inclus dans l'échelle s'il
  // est proche des données ; trop loin, un repère au bord du graphique l'indique.
  const { profil } = analyse
  const cible = profil?.usage && profil.cible !== undefined ? profil.cible : null
  const zone =
    cible !== null && profil?.usage === 'maintenir' ? zoneMaintien(cible, profil.tolerance) : null
  const [dataMin, dataMax] = [Math.min(...valeurs), Math.max(...valeurs)]
  const portee = Math.max(5, dataMax - dataMin)
  const cibleProche = cible !== null && cible >= dataMin - portee && cible <= dataMax + portee
  const bornesObjectif = !cibleProche ? [] : zone ? [zone.bas, zone.haut] : [cible!]
  const {
    ticks,
    min: yMin,
    max: yMax,
  } = niceScale(
    fromZero ? 0 : Math.min(dataMin, ...bornesObjectif),
    Math.max(dataMax, ...bornesObjectif),
  )

  const plotW = W - M.left - M.right
  const plotH = H - M.top - M.bottom
  const x = (day: string) => M.left + ((jourEnMs(day) - xMin) / (xMax - xMin || 1)) * plotW
  const y = (kg: number) => M.top + (1 - (kg - yMin) / (yMax - yMin)) * plotH
  const pt = (day: string, kg: number) => `${x(day).toFixed(1)},${y(kg).toFixed(1)}`
  const borne = (kg: number) => Math.min(yMax, Math.max(yMin, kg))
  // Bandes de corpulence (carnet de santé) : seulement la partie visible.
  const bandes =
    imc && profil?.taille
      ? bandesImc(profil.taille)
          .map((b) => ({ ...b, haut: borne(b.maxKg ?? yMax), bas: borne(b.minKg ?? yMin) }))
          .filter((b) => b.haut > b.bas)
      : []
  const dateTicks = [0, 1 / 3, 2 / 3, 1].map((f) =>
    new Date(xMin + f * (xMax - xMin)).toISOString().slice(0, 10),
  )

  return (
    <>
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Tendance du ${formatDay(debut)} au ${formatDay(derniere.date)} : ${formatWeight(Math.round(derniere.tendance * 10) / 10)}`}
      >
        {bandes.map((b) => (
          <g key={b.categorie} className={`imc imc-${b.rang}`}>
            <rect x={M.left} width={plotW} y={y(b.haut)} height={y(b.bas) - y(b.haut)} />
            {y(b.bas) - y(b.haut) >= 9 && (
              <text x={W - M.right - 3} y={y(b.haut) + 8} textAnchor="end">
                {b.categorie}
              </text>
            )}
          </g>
        ))}
        {zone && cibleProche && (
          <rect
            className="zone-maintien"
            x={M.left}
            width={plotW}
            y={y(borne(zone.haut))}
            height={y(borne(zone.bas)) - y(borne(zone.haut))}
          />
        )}
        {ticks.map((tick) => (
          <g key={tick} className="grid">
            <line x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} />
            <text x={M.left - 6} y={y(tick)} textAnchor="end" dominantBaseline="middle">
              {Number.isInteger(tick) ? tick : tick.toFixed(1)}
            </text>
          </g>
        ))}
        {dateTicks.map((day, i) => (
          <text
            key={`${day}-${i}`}
            className="axis"
            x={x(day)}
            y={H - 6}
            textAnchor={i === 0 ? 'start' : i === dateTicks.length - 1 ? 'end' : 'middle'}
          >
            {formatShortDay(day)}
          </text>
        ))}

        {reperesTemporels(debut, fin).map(({ date, type }) => (
          <g key={date} className={`repere ${type}`}>
            <line x1={x(date)} x2={x(date)} y1={M.top} y2={H - M.bottom} />
            {type === 'annee' && (
              <text x={x(date) + 3} y={M.top + 8}>
                {date.slice(0, 4)}
              </text>
            )}
          </g>
        ))}
        {projection.length > 0 && (
          <>
            <polygon
              className="cone cone99"
              points={[
                pt(derniere.date, derniere.tendance),
                ...projection.map((p) => pt(p.date, p.haut99)),
                ...[...projection].reverse().map((p) => pt(p.date, p.bas99)),
              ].join(' ')}
            />
            <polygon
              className="cone"
              points={[
                pt(derniere.date, derniere.tendance),
                ...projection.map((p) => pt(p.date, p.haut)),
                ...[...projection].reverse().map((p) => pt(p.date, p.bas)),
              ].join(' ')}
            />
            <polyline
              className="projection"
              points={[
                pt(derniere.date, derniere.tendance),
                ...projection.map((p) => pt(p.date, p.centre)),
              ].join(' ')}
            />
          </>
        )}
        {visibles.map((p) => (
          <circle
            key={p.date}
            className={p.note ? 'pesee note' : 'pesee'}
            cx={x(p.date)}
            cy={y(p.poids)}
            r={p.note ? 3.2 : 1.8}
          >
            <title>
              {`${formatDay(p.date)} : ${formatWeight(p.poids)}${p.note ? ` — ${p.note}` : ''}`}
            </title>
          </circle>
        ))}
        <path
          className="tendance"
          d={courbeMonotone(tendance.map((p) => [x(p.date), y(p.tendance)]))}
        />
        {cible !== null && cibleProche && !zone && (
          <g className="cible">
            <line x1={M.left} x2={W - M.right} y1={y(cible)} y2={y(cible)} />
            <text x={M.left + 3} y={y(cible) - 3}>
              objectif {formatFixed(cible)} kg
            </text>
          </g>
        )}
        {cible !== null && !cibleProche && (
          <text
            className="cible-lointaine"
            x={W - M.right - 3}
            y={cible < yMin ? H - M.bottom - 4 : M.top + 8}
            textAnchor="end"
          >
            objectif {formatFixed(cible)} kg {cible < yMin ? '↓' : '↑'}
          </text>
        )}
      </svg>
      <p className="legende hint">
        <span className="trait" /> tendance
        {projection.length > 0 && (
          <>
            {' '}
            <span className="pointilles" /> tendance attendue (4 sem.) <span className="zone" /> 95
            % <span className="zone zone99" /> 99 %
          </>
        )}{' '}
        <span className="point" /> pesées
        {cible !== null && !zone && (
          <>
            {' '}
            <span className="trait-cible" /> objectif
          </>
        )}
        {zone && (
          <>
            {' '}
            <span className="zone-maintien" /> zone à maintenir
          </>
        )}
        {bandes.length > 0 && <> · fond : corpulence (IMC, repères OMS adultes)</>}
        {visibles.some((p) => p.note) && (
          <>
            {' '}
            <span className="point note" /> pesée avec note
          </>
        )}
      </p>
    </>
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
