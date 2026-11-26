import { registerPlugin } from '@capacitor/core'
import { CleAppareilInvalideeError, EmpreinteAnnuleeError, type CleAppareil } from '../../core'
import { fromBase64, toBase64 } from '../../core/crypto/encoding'
import { MemoryKeyStore } from '../memory/MemoryKeyStore'

/** Plugin de l'appli (`android/…/CoffreAppareilPlugin.java`) : Keystore lié à l'empreinte. */
export interface CoffreAppareilPlugin {
  disponible(): Promise<{ disponible: boolean }>
  presente(options: { uid: string }): Promise<{ presente: boolean }>
  conserver(options: { uid: string; cle: string }): Promise<void>
  restituer(options: { uid: string }): Promise<{ cle: string }>
  oublier(options: { uid: string }): Promise<void>
}

/** Codes d'erreur du plugin → erreurs du cœur ; le reste est transmis tel quel. */
function traduire(erreur: unknown): unknown {
  const code = (erreur as { code?: unknown } | null)?.code
  if (code === 'ANNULE') return new EmpreinteAnnuleeError()
  if (code === 'INVALIDEE') return new CleAppareilInvalideeError()
  return erreur
}

/** La clé de données conservée sur le téléphone, via le plugin (D13, #82). */
export function cleAppareilNative(
  plugin: CoffreAppareilPlugin = registerPlugin<CoffreAppareilPlugin>('CoffreAppareil'),
): CleAppareil {
  const appel = async <T>(action: () => Promise<T>) => {
    try {
      return await action()
    } catch (erreur) {
      throw traduire(erreur)
    }
  }
  return {
    disponible: () =>
      plugin.disponible().then(
        (r) => r.disponible,
        () => false,
      ),
    presente: (uid) => appel(() => plugin.presente({ uid })).then((r) => r.presente),
    conserver: (uid, brute) => appel(() => plugin.conserver({ uid, cle: toBase64(brute) })),
    restituer: (uid) => appel(() => plugin.restituer({ uid })).then((r) => fromBase64(r.cle)),
    oublier: (uid) => appel(() => plugin.oublier({ uid })),
  }
}

/**
 * Android : clé déverrouillée en mémoire, comme sur le web, et conservée sur le téléphone,
 * liée à l'empreinte (`appareil`). Le coffre (core/vault) décide quand s'en servir.
 */
export class NativeKeyStore extends MemoryKeyStore {
  readonly appareil: CleAppareil

  constructor(appareil: CleAppareil = cleAppareilNative()) {
    super()
    this.appareil = appareil
  }
}
