export type { AuthService, AuthUser, Credentials } from './auth/AuthService'
export type { DataStore, DocData, StoredDoc, SyncState } from './data/DataStore'
export type { KeyStore } from './keys/KeyStore'
export type { Unsubscribe } from './types'

import type { AuthService } from './auth/AuthService'
import type { DataStore } from './data/DataStore'
import type { KeyStore } from './keys/KeyStore'

export interface Services {
  auth: AuthService
  keys: KeyStore
  data: DataStore
}
