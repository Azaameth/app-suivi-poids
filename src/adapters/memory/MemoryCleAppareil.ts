import { CleAppareilInvalideeError, type CleAppareil } from '../../core'

/**
 * Appareil simulé (tests) : clés conservées par compte, empreinte acceptée sauf si `refus` est
 * défini (annulation, empreintes modifiées…). `disponible` : téléphone avec empreinte enregistrée.
 */
export class MemoryCleAppareil implements CleAppareil {
  readonly cles = new Map<string, Uint8Array>()
  estDisponible = true
  refus: Error | null = null
  conservations = 0
  restitutions = 0

  async disponible() {
    return this.estDisponible
  }

  async presente(uid: string) {
    return this.cles.has(uid)
  }

  async conserver(uid: string, brute: Uint8Array) {
    if (this.refus) throw this.refus
    this.conservations++
    this.cles.set(uid, new Uint8Array(brute)) // copie : le coffre efface ses octets ensuite
  }

  async restituer(uid: string) {
    this.restitutions++
    if (this.refus) throw this.refus
    const cle = this.cles.get(uid)
    if (!cle) throw new CleAppareilInvalideeError()
    return new Uint8Array(cle)
  }

  async oublier(uid: string) {
    this.cles.delete(uid)
  }
}
