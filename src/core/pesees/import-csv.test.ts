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

describe('export « Excel (France) »', () => {
  test('point-virgule, virgule décimale, note protégée, réimportable tel quel', () => {
    const pesees = [pesee('2026-10-02', 80.4, 'repas; resto, "fête"'), pesee('2026-10-01', 81)]
    const csv = toCsv(pesees, 'excel-fr')
    expect(csv).toBe(
      '\uFEFFdate;poids_kg;note\r\n2026-10-01;81;\r\n2026-10-02;80,4;"repas; resto, ""fête"""\r\n',
    )
    expect(lireCsv(csv).pesees).toEqual([
      { date: '2026-10-01', poids: 81 },
      { date: '2026-10-02', poids: 80.4, note: 'repas; resto, "fête"' },
    ])
  })

  test('injection de formule neutralisée aussi', () => {
    const csv = toCsv([pesee('2026-10-01', 80, '=1+1')], 'excel-fr')
    expect(csv).toContain(";'=1+1")
    expect(lireCsv(csv).pesees[0].note).toBe('=1+1')
  })
})

describe('lireCsv : colonnes reconnues par leur nom ou leur contenu', () => {
  test('colonnes dans un autre ordre (en-tête)', () => {
    expect(lireCsv('date,note,poids\n2026-10-24,matin,72.5\n').pesees).toEqual([
      { date: '2026-10-24', poids: 72.5, note: 'matin' },
    ])
    expect(lireCsv('Poids;Date\n72,5;24/10/2026\n').pesees).toEqual([
      { date: '2026-10-24', poids: 72.5 },
    ])
  })

  test('poids avant la date, sans en-tête', () => {
    expect(lireCsv('72,5;24/10/2026\n').pesees).toEqual([{ date: '2026-10-24', poids: 72.5 }])
  })

  test('colonne Heure séparée : jamais prise pour le poids', () => {
    expect(lireCsv('Date;Heure;Poids\n24/10/2026;08:30;72,5\n').pesees).toEqual([
      { date: '2026-10-24', poids: 72.5 },
    ])
  })

  test('balance connectée : date avec heure, autres mesures écartées', () => {
    const csv =
      'Date,"Masse grasse (kg)","Poids (kg)","Tendance"\n"2026-10-24 08:30:12",15.2,72.5,72.4\n'
    expect(lireCsv(csv)).toEqual({
      pesees: [{ date: '2026-10-24', poids: 72.5 }],
      ignorees: [],
      doublons: [],
    })
  })

  test('commentaires # ignorés ; date avec fuseau → jour local de l’instant', () => {
    const csv = '#Version:6\ndate;weight;weight trend\n2026-10-24T09:30:00.000Z;72.5;72.4\n'
    const instant = new Date('2026-10-24T09:30:00.000Z')
    const jour = `${instant.getFullYear()}-${String(instant.getMonth() + 1).padStart(2, '0')}-${String(instant.getDate()).padStart(2, '0')}`
    expect(lireCsv(csv).pesees).toEqual([{ date: jour, poids: 72.5 }])
  })

  test('tableur qui a tout mis dans la colonne A (lignes entre guillemets)', () => {
    expect(lireCsv('"date,poids_kg,note"\r\n"2026-10-24,72.5,matin"\r\n').pesees).toEqual([
      { date: '2026-10-24', poids: 72.5, note: 'matin' },
    ])
  })

  test('poids converti en date par un tableur : raison explicite', () => {
    const { ignorees } = lireCsv('date;poids_kg\n24/10/2026;12/05/2026\n')
    expect(ignorees).toEqual([
      { ligne: 2, raison: expect.stringMatching(/converti en date/) as unknown as string },
    ])
  })

  test('première ligne sans date mais avec un poids : signalée, pas prise pour un en-tête', () => {
    const { pesees, ignorees } = lireCsv('hier;80\n2026-10-01;79\n')
    expect(pesees).toEqual([{ date: '2026-10-01', poids: 79 }])
    expect(ignorees).toEqual([{ ligne: 1, raison: 'date illisible « hier »' }])
  })

  test('date invalide avec heure refusée', () => {
    expect(lireCsv('date;poids\n2026-02-30 08:00;80\n').ignorees).toHaveLength(1)
  })
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
