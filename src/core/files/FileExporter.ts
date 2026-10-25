/**
 * Remet un fichier à l'utilisateur. Web : téléchargement. Android (jalon 3) : partage natif.
 */
export interface FileExporter {
  exportText(fileName: string, content: string, mimeType: string): Promise<void>
}
