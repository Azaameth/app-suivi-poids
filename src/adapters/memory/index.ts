import type { Services } from '../../core'
import { MemoryAuthService } from './MemoryAuthService'
import { MemoryDataStore } from './MemoryDataStore'
import { MemoryKeyStore } from './MemoryKeyStore'

export function createMemoryServices(): Services {
  return {
    auth: new MemoryAuthService(),
    keys: new MemoryKeyStore(),
    data: new MemoryDataStore(),
  }
}
