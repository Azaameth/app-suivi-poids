import type { Services } from '../../core'
import { MemoryAuthService } from './MemoryAuthService'
import { MemoryDataStore } from './MemoryDataStore'
import { MemoryFileExporter } from './MemoryFileExporter'
import { MemoryKeyStore } from './MemoryKeyStore'
import { MemoryPreferencesStore } from './MemoryPreferencesStore'

export function createMemoryServices(): Services {
  return {
    auth: new MemoryAuthService(),
    keys: new MemoryKeyStore(),
    data: new MemoryDataStore(),
    prefs: new MemoryPreferencesStore(),
    files: new MemoryFileExporter(),
  }
}
