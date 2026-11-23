import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { Pesee } from '../../core/pesees'
import { M, PLOT_W, W, type Navigation } from './cadre'
import {
  DUREE_APPUI_LONG_MS,
  SEUIL_GLISSEMENT_PX,
  decalageApresGlissement,
  peseeLaPlusProche,
} from './exploration'

type Geste =
  | { type: 'attente'; id: number; x0: number; decalage0: number }
  | { type: 'glissement'; id: number; x0: number; decalage0: number }
  | { type: 'lecture'; id: number }

/**
 * Exploration du graphique : glisser (déplacer la fenêtre), appui long ou survol à la souris
 * (lire une pesée), flèches / Début / Fin au clavier. Rend la date lue (`curseur`) et les
 * gestionnaires à poser sur le `<svg>`. `figer` / `liberer` encadrent un glissement, pendant
 * lequel l'échelle des poids reste fixe.
 */
export function useExploration({
  navigation,
  visibles,
  jourA,
  figer,
  liberer,
}: {
  navigation: Navigation | null
  visibles: Pesee[]
  /** Jour situé à la fraction `f` (0 à 1) de la largeur du tracé. */
  jourA: (f: number) => string
  figer: () => void
  liberer: () => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const geste = useRef<Geste | null>(null)
  const minuteur = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [curseur, setCurseur] = useState<string | null>(null)
  useEffect(() => () => clearTimeout(minuteur.current), [])

  /** Position horizontale du pointeur → jour, d'après la taille réelle du graphique. */
  function jourSous(clientX: number): string {
    const rect = svgRef.current!.getBoundingClientRect()
    const vx = ((clientX - rect.left) / (rect.width || 1)) * W
    return jourA(Math.min(1, Math.max(0, (vx - M.left) / PLOT_W)))
  }
  const lire = (clientX: number) =>
    setCurseur(peseeLaPlusProche(visibles, jourSous(clientX))?.date ?? null)

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
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

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
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
      figer()
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
    if (geste.current?.type === 'glissement') liberer()
    if (e.pointerType !== 'mouse') setCurseur(null)
    geste.current = null
  }

  function onKeyDown(e: KeyboardEvent<SVGSVGElement>) {
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

  return {
    curseur,
    gestionnaires: {
      ref: svgRef,
      onPointerDown,
      onPointerMove,
      onPointerUp: finGeste,
      onPointerCancel: finGeste,
      onPointerLeave: (e: PointerEvent<SVGSVGElement>) => {
        if (e.pointerType === 'mouse' && !geste.current) setCurseur(null)
      },
      onKeyDown,
    },
  }
}
