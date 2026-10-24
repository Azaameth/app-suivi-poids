import type { FileExporter } from '../../core'

/** Téléchargement via un lien temporaire (le fichier ne quitte pas l'appareil). */
export class WebFileExporter implements FileExporter {
  async exportText(fileName: string, content: string, mimeType: string) {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
    const link = Object.assign(document.createElement('a'), { href: url, download: fileName })
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }
}
