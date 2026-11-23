import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import type { MemoryFileExporter } from '../../adapters/memory/MemoryFileExporter'
import { addPesee, start, tab } from '../../test/peseesHarness'

afterEach(cleanup)

describe('export et réglages', () => {
  test('export CSV en clair, via le FileExporter', async () => {
    const services = await start()
    await tab('Historique')
    await addPesee('2026-10-24', '72.4', 'footing')
    await tab('Réglages')
    fireEvent.click(screen.getByRole('button', { name: 'Exporter en CSV' }))
    await screen.findByText('1 pesée(s) exportée(s).')
    const [file] = (services.files as MemoryFileExporter).files
    expect(file.fileName).toMatch(/^machimoto-pesees-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(file.content).toContain('2026-10-24,72.4,footing')

    fireEvent.click(screen.getByRole('button', { name: 'Exporter pour Excel' }))
    await waitFor(() => expect((services.files as MemoryFileExporter).files).toHaveLength(2))
    const excel = (services.files as MemoryFileExporter).files[1]
    expect(excel.fileName).toMatch(/^machimoto-pesees-\d{4}-\d{2}-\d{2}-excel\.csv$/)
    expect(excel.content).toContain('2026-10-24;72,4;footing')
  }, 15_000)

  test('délai de verrouillage réglable', async () => {
    const services = await start()
    await tab('Réglages')
    fireEvent.change(screen.getByLabelText(/Verrouillage automatique après/), {
      target: { value: '15' },
    })
    expect(services.prefs.get().autoLockMinutes).toBe(15)
  }, 15_000)
})
