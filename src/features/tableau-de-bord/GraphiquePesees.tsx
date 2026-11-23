import { useId, useState } from 'react'
import { ajouterJours, palierImc } from '../../core/analyse'
import {
  PERIODS,
  PERIOD_DAYS,
  decalageMax,
  filterByPeriod,
  type Pesee,
  type Period,
} from '../../core/pesees'
import { usePreferences } from '../prefs/usePreferences'
import { formatDay, formatFixed, formatShortDay, formatWeight } from '../commun/format'
import { MachimotoDit } from '../commun/Mascotte'
import {
  H,
  M,
  PLOT_H,
  PLOT_W,
  W,
  cadreGraphique,
  type EntreeCadre,
  type Echelle,
  type Navigation,
} from './cadre'
import { courbeMonotone } from './courbe'
import { Legende } from './Legende'
import { reperesTemporels } from './reperes'
import { useExploration } from './useExploration'
import type { Analyse } from './useAnalyse'

const formatImc = (imc: number) => imc.toLocaleString('fr-FR')

const PERIOD_LABELS = {
  '7j': '7 j',
  '30j': '30 j',
  '90j': '90 j',
  '1an': '1 an',
  tout: 'Tout',
} as const

/**
 * Graphique en ligne (spec § 5.1) : pesées en petits points discrets, tendance en trait
 * principal, projection en pointillés avec son cône. Période et axe depuis 0 réglables, au-dessus
 * du cadre. Explorable : glisser pour remonter le temps, appui long pour lire une pesée.
 */
export function GraphiquePesees({ pesees, analyse }: { pesees: Pesee[]; analyse: Analyse }) {
  const [preferences, update] = usePreferences()
  const options = preferences.chart
  const set = (change: Partial<typeof options>) => update({ chart: { ...options, ...change } })
  // Décalage de la fenêtre, en jours avant aujourd'hui : propre à l'écran, jamais enregistré.
  const [decalage, setDecalage] = useState(0)
  const max = decalageMax(pesees, options.period, analyse.aujourdhui)
  const decalageBorne = Math.min(decalage, max)
  const fin = ajouterJours(analyse.aujourdhui, -decalageBorne)
  const visibles = filterByPeriod(pesees, options.period, fin)
  const navigation: Navigation | null =
    options.period === 'tout'
      ? null
      : {
          decalage: decalageBorne,
          max,
          jours: PERIOD_DAYS[options.period],
          deplacer: (d) => setDecalage(Math.min(max, Math.max(0, d))),
        }

  // « Axe depuis 0 » devient « jusqu'au prochain palier IMC » quand un objectif et une taille
  // le permettent ; sans palier de ce côté, retour à 0.
  const { profil, actuelle } = analyse
  const paliers =
    profil?.usage && profil.cible !== undefined && profil.taille && actuelle
      ? palierImc(profil.usage, actuelle.tendance, profil.taille)
      : []
  const libelleAxe =
    paliers.length === 0
      ? 'Axe depuis 0'
      : paliers.length === 1
        ? `Axe jusqu’à IMC ${formatImc(paliers[0].imc)}`
        : `Axe IMC ${formatImc(paliers[0].imc)} – ${formatImc(paliers[1].imc)}`

  function choisirPeriode(period: Period) {
    set({ period })
    setDecalage(0)
  }

  return (
    <>
      <div className="graphique-reglages">
        <div className="segments" role="group" aria-label="Période">
          {PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={options.period === period}
              onClick={() => choisirPeriode(period)}
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
          {libelleAxe}
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
        {navigation && navigation.decalage > 0 && (
          <p className="fenetre-passee">
            <span>
              Du {formatShortDay(ajouterJours(fin, -(navigation.jours - 1)))} au{' '}
              {formatShortDay(fin)} {fin.slice(0, 4)}
            </span>
            <button type="button" className="lien" onClick={() => setDecalage(0)}>
              ↻ Aujourd’hui
            </button>
          </p>
        )}
        {visibles.length < 2 ? (
          <MachimotoDit expression="pensif" taille={48}>
            <p>Pas assez de pesées sur cette période (2 au minimum).</p>
            {navigation && navigation.decalage > 0 && (
              <button type="button" className="lien" onClick={() => setDecalage(0)}>
                Revenir à aujourd’hui
              </button>
            )}
          </MachimotoDit>
        ) : (
          <Trace
            visibles={visibles}
            analyse={analyse}
            fromZero={options.fromZero}
            paliers={paliers}
            imc={options.imc}
            finFenetre={fin}
            navigation={navigation}
          />
        )}
      </section>
    </>
  )
}

function Trace(props: EntreeCadre) {
  const { visibles, analyse, navigation } = props
  const clipId = useId()
  // Échelle des poids figée pendant un glissement : la courbe défile sans « sauter ».
  const [echelleFigee, setEchelleFigee] = useState<Echelle | null>(null)
  const cadre = cadreGraphique(props, echelleFigee)
  const { debut, fin, tendance, projection, derniere, cible, zone, cibleProche, echelle } = cadre
  const { bandes, dateTicks, x, y, pt, borne } = cadre
  const { ticks, min: yMin } = echelle
  const { curseur, gestionnaires } = useExploration({
    navigation,
    visibles,
    jourA: cadre.jourA,
    figer: () => setEchelleFigee(echelle),
    liberer: () => setEchelleFigee(null),
  })

  const lu = curseur ? visibles.find((p) => p.date === curseur) : undefined
  const tendanceLue = lu && analyse.tendance.find((p) => p.date === lu.date)

  return (
    <>
      <svg
        {...gestionnaires}
        className={navigation ? 'chart explorable' : 'chart'}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        tabIndex={navigation ? 0 : undefined}
        aria-label={`Tendance du ${formatDay(debut)} au ${formatDay(derniere.date)} : ${formatWeight(Math.round(derniere.tendance * 10) / 10)}${navigation ? '. Flèches gauche et droite pour remonter le temps.' : ''}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={M.left} y={M.top} width={PLOT_W} height={PLOT_H} />
          </clipPath>
        </defs>
        {/* Couche 1 — repères de fond : corpulence, zone à maintenir, grille. */}
        {bandes.map((b) => (
          <g key={b.categorie} className={`imc imc-${b.rang}`}>
            <rect x={M.left} width={PLOT_W} y={y(b.haut)} height={y(b.bas) - y(b.haut)} />
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
            width={PLOT_W}
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

        <g clipPath={`url(#${clipId})`}>
          {/* Couche 2 — projection : cônes et pointillés. */}
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
          {/* Couche 3 — mesures : pesées et tendance. */}
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
        </g>
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
        {lu && <Curseur pesee={lu} tendance={tendanceLue?.tendance} x={x} y={y} />}
      </svg>
      <Legende
        projection={projection.length > 0}
        notes={visibles.some((p) => p.note)}
        objectif={cible !== null && !zone}
        zone={zone !== null}
        imc={bandes.length > 0}
        glissable={navigation !== null && navigation.max > 0}
      />
      {lu && (
        <p className="sr-only" role="status">
          {`${formatDay(lu.date)} : ${formatWeight(lu.poids)}`}
        </p>
      )}
    </>
  )
}

/** Curseur de lecture : trait vertical et étiquette (date, pesée, tendance, note). */
function Curseur({
  pesee,
  tendance,
  x,
  y,
}: {
  pesee: Pesee
  tendance?: number
  x: (day: string) => number
  y: (kg: number) => number
}) {
  const cx = x(pesee.date)
  const lignes = [
    `${formatShortDay(pesee.date)} · ${formatWeight(pesee.poids)}`,
    ...(tendance === undefined ? [] : [`tendance ${formatFixed(tendance)} kg`]),
    ...(pesee.note ? [pesee.note.length > 28 ? `${pesee.note.slice(0, 27)}…` : pesee.note] : []),
  ]
  // Largeur estimée (≈ 5,4 px par caractère à 10 px) ; l'étiquette passe à gauche du trait
  // dans la moitié droite du graphique pour ne jamais sortir du cadre.
  const largeur = Math.max(...lignes.map((l) => l.length)) * 5.4 + 10
  const aGauche = cx > M.left + PLOT_W / 2
  const bx = aGauche ? cx - largeur - 6 : cx + 6
  return (
    <g className="curseur" pointerEvents="none">
      <line x1={cx} x2={cx} y1={M.top} y2={H - M.bottom} />
      <circle cx={cx} cy={y(pesee.poids)} r={4} />
      <rect x={bx} y={M.top} width={largeur} height={lignes.length * 12 + 6} rx={4} />
      {lignes.map((l, i) => (
        <text key={i} x={bx + 5} y={M.top + 13 + i * 12} className={i === 0 ? 'fort' : undefined}>
          {l}
        </text>
      ))}
    </g>
  )
}
