import type { KeyStore } from '../../core'

export class MemoryKeyStore implements KeyStore {
  private key: CryptoKey | null = null

  async load() {
    return this.key
  }

  async save(key: CryptoKey) {
    this.key = key
  }

  async clear() {
    this.key = null
  }
}
