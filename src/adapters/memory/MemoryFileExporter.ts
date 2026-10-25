import type { FileExporter } from '../../core'

/** Pour les tests : garde les fichiers exportés. */
export class MemoryFileExporter implements FileExporter {
  readonly files: { fileName: string; content: string; mimeType: string }[] = []

  async exportText(fileName: string, content: string, mimeType: string) {
    this.files.push({ fileName, content, mimeType })
  }
}
