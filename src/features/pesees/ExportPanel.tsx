import { dateLocale } from '../../core/analyse'
import { useState } from 'react'
import { toCsv, type FormatCsv, type Pesee } from '../../core/pesees'
import { useServices } from '../../context/ServicesContext'

export function ExportPanel({ pesees }: { pesees: Pesee[] }) {
  const { files } = useServices()
  const [message, setMessage] = useState<string | null>(null)

  async function exportCsv(format: FormatCsv) {
    try {
      const suffixe = format === 'excel-fr' ? '-excel' : ''
      await files.exportText(
        `machimoto-pesees-${dateLocale()}${suffixe}.csv`,
        toCsv(pesees, format),
        'text/csv;charset=utf-8',
      )
      setMessage(`${pesees.length} pesée(s) exportée(s).`)
    } catch {
      setMessage('Export impossible.')
    }
  }

  return (
    <section className="card">
      <h2>Export CSV</h2>
      <p className="hint">
        Sert aussi de sauvegarde. ⚠️ Le fichier est <strong>en clair</strong> : range-le en lieu
        sûr.
      </p>
      <p className="hint">
        « Pour Excel » s’ouvre directement en colonnes dans un tableur réglé en français. Les deux
        fichiers se réimportent tels quels.
      </p>
      <div className="row">
        <button type="button" onClick={() => exportCsv('standard')} disabled={pesees.length === 0}>
          Exporter en CSV
        </button>
        <button type="button" onClick={() => exportCsv('excel-fr')} disabled={pesees.length === 0}>
          Exporter pour Excel
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  )
}
