export type { AuthService, AuthUser, Credentials } from './auth/AuthService'
export {
  EmailDejaUtiliseError,
  IdentifiantsInvalidesError,
  MIN_MOT_DE_PASSE,
  MotDePasseFaibleError,
} from './auth/AuthService'
export type { DataStore, DocData, StoredDoc, SyncState } from './data/DataStore'
export type { FileExporter } from './files/FileExporter'
export type { KeyStore } from './keys/KeyStore'
export type { Preferences, PreferencesStore } from './prefs/Preferences'
export type { Unsubscribe } from './types'

import type { AuthService } from './auth/AuthService'
import type { DataStore } from './data/DataStore'
import type { FileExporter } from './files/FileExporter'
import type { KeyStore } from './keys/KeyStore'
import type { PreferencesStore } from './prefs/Preferences'

export interface Services {
  auth: AuthService
  keys: KeyStore
  data: DataStore
  prefs: PreferencesStore
  files: FileExporter
}
