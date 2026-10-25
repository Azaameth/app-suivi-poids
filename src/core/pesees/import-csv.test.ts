import { describe, expect, test } from 'vitest'
import { lireCsv, planifierImport } from './import-csv'
import { toCsv } from './csv'
import type { Pesee } from './model'

const pesee = (date: string, poids: number, note?: string): Pesee => ({
  date,
  poids,
  ...(note ? { note } : {}),
  createdAt: 1,
  updatedAt: 1,
})

describe('lireCsv', () => {
  test('relit l’export de l’appli tel quel (BOM, en-tête, note entre guillemets)', () => {
    const export_ = toCsv([
      pesee('2026-10-02', 80.4, 'après "fête", lourd'),
      pesee('2026-10-01', 81),
    ])
    expect(lireCsv(export_)).toEqual({
      pesees: [
        { date: '2026-10-01', poids: 81 },
        { date: '2026-10-02', poids: 80.4, note: 'après "fête", lourd' },
      ],
      ignorees: [],
      doublons: [],
    })
  })

  test('format français : point-virgule, date jj/mm/aaaa, virgule décimale, sans en-tête', () => {
    const { pesees, ignorees } = lireCsv('22/09/2026;137,7\n1/10/2026;136,5 kg;matin\n')
    expect(pesees).toEqual([
      { date: '2026-09-22', poids: 137.7 },
      { date: '2026-10-01', poids: 136.5, note: 'matin' },
    ])
    expect(ignorees).toEqual([])
  })

  test('tabulation (copier-coller d’un tableur)', () => {
    expect(lireCsv('date\tpoids\n2026-09-22\t135,25\n').pesees).toEqual([
      { date: '2026-09-22', poids: 135.25 },
    ])
  })

  test('virgule décimale non protégée avec la virgule pour séparateur', () => {
    expect(lireCsv('2026-09-22,137,7\n').pesees).toEqual([{ date: '2026-09-22', poids: 137.7 }])
  })

  test('injection de formule : neutralisée à l’export, note intacte au réimport', () => {
    const notes = ['=HYPERLINK("http://x","clic")', '+1 kg', '-0,5', '@SOMME(A1)', 'normal']
    const csv = toCsv(notes.map((note, i) => pesee(`2026-10-0${i + 1}`, 80, note)))
    for (const ligne of csv.split('\r\n').slice(1, -1)) {
      expect(ligne.split(',').slice(2).join(',')).not.toMatch(/^"?[=+\-@]/)
    }
    expect(lireCsv(csv).pesees.map((p) => p.note)).toEqual(notes)
  })

  test('export de l’appli : une note numérique reste une note', () => {
    expect(lireCsv(toCsv([pesee('2026-10-01', 81, '5')])).pesees).toEqual([
      { date: '2026-10-01', poids: 81, note: '5' },
    ])
  })

  test('lignes illisibles listées avec leur numéro, sans bloquer le reste', () => {
    const { pesees, ignorees } = lireCsv(
      'date;poids\n2026-02-30;80\nhier;80\n2026-10-01;lourd\n2026-10-02;0\n2026-10-03;79,9\n',
    )
    expect(pesees).toEqual([{ date: '2026-10-03', poids: 79.9 }])
    expect(ignorees.map((i) => i.ligne)).toEqual([2, 3, 4, 5])
    expect(ignorees[0].raison).toMatch(/date illisible/)
    expect(ignorees[2].raison).toMatch(/poids illisible/)
    expect(ignorees[3].raison).toMatch(/hors bornes/)
  })

  test('même date deux fois : la dernière gagne, doublon signalé', () => {
    const { pesees, doublons } = lireCsv('2026-10-01;80\n2026-10-01;79,5\n')
    expect(pesees).toEqual([{ date: '2026-10-01', poids: 79.5 }])
    expect(doublons).toEqual(['2026-10-01'])
  })
})

describe('planifierImport', () => {
  test('sépare nouvelles, différentes et identiques', () => {
    const plan = planifierImport(
      [
        { date: '2026-10-01', poids: 80 },
        { date: '2026-10-02', poids: 79.5 },
        { date: '2026-10-03', poids: 79 },
      ],
      [pesee('2026-10-01', 80), pesee('2026-10-02', 79.8)],
    )
    expect(plan.nouvelles).toEqual([{ date: '2026-10-03', poids: 79 }])
    expect(plan.differentes.map((d) => [d.import.poids, d.existante.poids])).toEqual([[79.5, 79.8]])
    expect(plan.identiques).toBe(1)
  })
})
