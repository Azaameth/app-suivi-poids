import { useState } from 'react'
import { localDate, toCsv, type Pesee } from '../../core/pesees'
import { useServices } from '../../context/ServicesContext'

export function ExportPanel({ pesees }: { pesees: Pesee[] }) {
  const { files } = useServices()
  const [message, setMessage] = useState<string | null>(null)

  async function exportCsv() {
    try {
      await files.exportText(
        `machimoto-pesees-${localDate()}.csv`,
        toCsv(pesees),
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
      <button type="button" onClick={exportCsv} disabled={pesees.length === 0}>
        Exporter en CSV
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  )
}
