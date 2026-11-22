import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import {
  ajouterJours,
  bandesImc,
  jourEnMs,
  palierImc,
  zoneMaintien,
  type SeuilImc,
} from '../../core/analyse'
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
import { courbeMonotone } from './courbe'
import {
  DUREE_APPUI_LONG_MS,
  SEUIL_GLISSEMENT_PX,
  decalageApresGlissement,
  peseeLaPlusProche,
} from './exploration'
import { reperesTemporels } from './reperes'
import type { Analyse } from './useAnalyse'

const formatImc = (imc: number) => imc.toLocaleString('fr-FR')

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
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom

/** Fenêtre affichée et moyens de la déplacer (absent pour « Tout »). */
interface Navigation {
  decalage: number
  max: number
  jours: number
  deplacer: (decalage: number) => void
}

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
            fin={fin}
            navigation={navigation}
          />
        )}
      </section>
    </>
  )
}

type Geste =
  | { type: 'attente'; id: number; x0: number; decalage0: number }
  | { type: 'glissement'; id: number; x0: number; decalage0: number }
  | { type: 'lecture'; id: number }

function Trace({
  visibles,
  analyse,
  fromZero,
  paliers,
  imc,
  fin: finFenetre,
  navigation,
}: {
  visibles: Pesee[]
  analyse: Analyse
  fromZero: boolean
  paliers: SeuilImc[]
  imc: boolean
  fin: string
  navigation: Navigation | null
}) {
  const clipId = useId()
  const svgRef = useRef<SVGSVGElement>(null)
  const geste = useRef<Geste | null>(null)
  const minuteur = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [curseur, setCurseur] = useState<string | null>(null)
  // Échelle des poids figée pendant un glissement : la courbe défile sans « sauter ».
  const [echelleFigee, setEchelleFigee] = useState<ReturnType<typeof niceScale> | null>(null)
  useEffect(() => () => clearTimeout(minuteur.current), [])

  const enDirect = !navigation || navigation.decalage === 0
  // Fenêtre fixe (période décalable), mais jamais avant la toute première pesée : un historique
  // plus court que la période occupe toute la largeur au lieu d'être tassé à droite.
  // « Tout » : de la première à la dernière pesée.
  const premiere = analyse.mesures[0]?.date ?? visibles[0].date
  const debutPeriode = navigation ? ajouterJours(finFenetre, -(navigation.jours - 1)) : premiere
  const debut = navigation && debutPeriode < premiere ? premiere : debutPeriode
  const tendance = analyse.tendance.filter((p) => p.date >= debut && p.date <= finFenetre)
  // La projection part d'aujourd'hui : seulement quand la fenêtre l'inclut.
  const projection = enDirect ? (analyse.projection ?? []) : []
  const derniere = tendance.at(-1) ?? analyse.tendance.at(-1)!

  const fin = projection.at(-1)?.date ?? (navigation ? finFenetre : visibles.at(-1)!.date)
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
  const seuilsAxe = fromZero ? paliers.map((p) => p.kg) : []
  const echelle =
    echelleFigee ??
    niceScale(
      fromZero && paliers.length === 0 ? 0 : Math.min(dataMin, ...bornesObjectif, ...seuilsAxe),
      Math.max(dataMax, ...bornesObjectif, ...seuilsAxe),
    )
  const { ticks, min: yMin, max: yMax } = echelle

  const x = (day: string) => M.left + ((jourEnMs(day) - xMin) / (xMax - xMin || 1)) * PLOT_W
  const y = (kg: number) => M.top + (1 - (kg - yMin) / (yMax - yMin)) * PLOT_H
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

  // ---- Exploration : glisser (déplacer), appui long ou survol à la souris (lire) ----
  /** Position horizontale du pointeur → jour, d'après la taille réelle du graphique. */
  function jourSous(clientX: number): string {
    const rect = svgRef.current!.getBoundingClientRect()
    const vx = ((clientX - rect.left) / (rect.width || 1)) * W
    const f = Math.min(1, Math.max(0, (vx - M.left) / PLOT_W))
    return new Date(xMin + f * (xMax - xMin)).toISOString().slice(0, 10)
  }
  const lire = (clientX: number) =>
    setCurseur(peseeLaPlusProche(visibles, jourSous(clientX))?.date ?? null)

  function debutGeste(e: PointerEvent<SVGSVGElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const id = e.pointerId
    geste.current = { type: 'attente', id, x0: e.clientX, decalage0: navigation?.decalage ?? 0 }
    clearTimeout(minuteur.current)
    const clientX = e.clientX
    minuteur.current = setTimeout(() => {
      if (geste.current?.type !== 'attente') return
      geste.current = { type: 'lecture', id }
      navigator.vibrate?.(10)
      lire(clientX)
    }, DUREE_APPUI_LONG_MS)
  }

  function mouvement(e: PointerEvent<SVGSVGElement>) {
    const g = geste.current
    if (!g || g.id !== e.pointerId) {
      if (e.pointerType === 'mouse') lire(e.clientX) // survol : lecture directe
      return
    }
    if (g.type === 'lecture') return lire(e.clientX)
    const dx = e.clientX - g.x0
    if (g.type === 'attente') {
      if (Math.abs(dx) < SEUIL_GLISSEMENT_PX || !navigation) return
      clearTimeout(minuteur.current)
      geste.current = { ...g, type: 'glissement' }
      setEchelleFigee(echelle)
      setCurseur(null)
      svgRef.current?.setPointerCapture?.(e.pointerId)
    }
    if (!navigation) return
    const largeur = (svgRef.current!.getBoundingClientRect().width * PLOT_W) / W
    navigation.deplacer(
      decalageApresGlissement(g.decalage0, dx, largeur, navigation.jours, navigation.max),
    )
  }

  function finGeste(e: PointerEvent<SVGSVGElement>) {
    clearTimeout(minuteur.current)
    if (geste.current?.type === 'glissement') setEchelleFigee(null)
    if (e.pointerType !== 'mouse') setCurseur(null)
    geste.current = null
  }

  function clavier(e: KeyboardEvent<SVGSVGElement>) {
    if (!navigation) return
    const pas = Math.max(1, Math.round(navigation.jours / 4))
    const cible = {
      ArrowLeft: navigation.decalage + pas,
      ArrowRight: navigation.decalage - pas,
      Home: navigation.max,
      End: 0,
    }[e.key]
    if (cible === undefined) return
    e.preventDefault()
    navigation.deplacer(cible)
  }

  const lu = curseur ? visibles.find((p) => p.date === curseur) : undefined
  const tendanceLue = lu && analyse.tendance.find((p) => p.date === lu.date)

  return (
    <>
      <svg
        ref={svgRef}
        className={navigation ? 'chart explorable' : 'chart'}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        tabIndex={navigation ? 0 : undefined}
        aria-label={`Tendance du ${formatDay(debut)} au ${formatDay(derniere.date)} : ${formatWeight(Math.round(derniere.tendance * 10) / 10)}${navigation ? '. Flèches gauche et droite pour remonter le temps.' : ''}`}
        onPointerDown={debutGeste}
        onPointerMove={mouvement}
        onPointerUp={finGeste}
        onPointerCancel={finGeste}
        onPointerLeave={(e) => e.pointerType === 'mouse' && !geste.current && setCurseur(null)}
        onKeyDown={clavier}
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

/** Légende par couche, du premier plan vers le fond ; une ligne par couche affichée. */
function Legende(props: {
  projection: boolean
  notes: boolean
  objectif: boolean
  zone: boolean
  imc: boolean
  glissable: boolean
}) {
  return (
    <div className="legende hint">
      <p>
        <span className="groupe">Mesures</span>
        <span className="entree">
          <span className="pastille trait" /> tendance
        </span>
        <span className="entree">
          <span className="pastille point" /> pesées
        </span>
        {props.notes && (
          <span className="entree">
            <span className="pastille point note" /> avec note
          </span>
        )}
      </p>
      {props.projection && (
        <p>
          <span className="groupe">Projection</span>
          <span className="entree">
            <span className="pastille pointilles" /> 4 sem.
          </span>
          <span className="entree">
            <span className="pastille zone" /> 95 %
          </span>
          <span className="entree">
            <span className="pastille zone zone99" /> 99 %
          </span>
        </p>
      )}
      {(props.objectif || props.zone || props.imc) && (
        <p>
          <span className="groupe">Repères</span>
          {props.objectif && (
            <span className="entree">
              <span className="pastille trait-cible" /> objectif
            </span>
          )}
          {props.zone && (
            <span className="entree">
              <span className="pastille zone-maintien" /> zone à maintenir
            </span>
          )}
          {props.imc && (
            <span className="entree">
              <span className="pastille degrade-imc" /> corpulence (IMC, OMS)
            </span>
          )}
        </p>
      )}
      <p className="geste">
        {props.glissable ? 'Glisse pour remonter le temps · appui long' : 'Appui long'} pour lire
        une pesée
      </p>
    </div>
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
