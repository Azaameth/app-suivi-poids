import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MIN_PASSPHRASE_LENGTH, Vault, VaultAlreadyExistsError } from '../../core/vault'
import { useServices } from '../../context/ServicesContext'
import { usePreferences } from '../prefs/usePreferences'
import { HORS_LIGNE, messageErreur } from './messages'
import { PassphraseForm } from './PassphraseForm'
import { useAutoLock } from './useAutoLock'
import { VaultContext, type UnlockedVault } from './VaultContext'

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'setup' }
  | { kind: 'locked' }
  | { kind: 'unlocked'; key: CryptoKey }

async function readState(vault: Vault): Promise<State> {
  try {
    const status = await vault.status()
    const key = status === 'unlocked' ? await vault.key() : null
    return key ? { kind: 'unlocked', key } : { kind: status === 'setup' ? 'setup' : 'locked' }
  } catch {
    return { kind: 'error', message: HORS_LIGNE }
  }
}

/** Affiche `children` seulement une fois la clé de données déverrouillée. */
export function VaultGate({
  uid,
  autoLockMs,
  header,
  children,
}: {
  uid: string
  autoLockMs?: number
  /** Bandeau affiché dans tous les états ; reçoit le coffre s'il est déverrouillé. */
  header?: (vault: UnlockedVault | null) => ReactNode
  children: ReactNode
}) {
  const { data, keys } = useServices()
  const [preferences] = usePreferences()
  const idleMs = autoLockMs ?? preferences.autoLockMinutes * 60_000
  const vault = useMemo(() => new Vault(data, keys, uid), [data, keys, uid])
  const [state, setState] = useState<State>({ kind: 'loading' })

  const refresh = useCallback(() => {
    setState({ kind: 'loading' })
    void readState(vault).then(setState)
  }, [vault])

  useEffect(() => {
    let active = true
    void readState(vault).then((next) => active && setState(next))
    return () => {
      active = false
      // Déconnexion ou changement de compte : la clé ne survit pas au composant.
      void vault.lock()
    }
  }, [vault])

  const lock = useCallback(() => {
    void vault.lock()
    setState({ kind: 'locked' })
  }, [vault])

  const unlocked = useMemo<UnlockedVault | null>(
    () =>
      state.kind === 'unlocked'
        ? {
            uid,
            key: state.key,
            lock,
            changePassphrase: (oldP, newP) => vault.changePassphrase(oldP, newP),
          }
        : null,
    [state, lock, vault, uid],
  )

  /** Contenu selon l'état du coffre. */
  const contenu = () => {
    switch (state.kind) {
      case 'loading':
        return <p>Chargement du coffre…</p>
      case 'error':
        return (
          <section>
            <p role="alert">{state.message}</p>
            <button type="button" onClick={refresh}>
              Réessayer
            </button>
          </section>
        )
      case 'setup':
        return (
          <PassphraseForm
            fields={[
              { name: 'phrase', label: 'Phrase secrète', autoComplete: 'new-password' },
              { name: 'confirmation', label: 'Confirmation', autoComplete: 'new-password' },
            ]}
            submitLabel="Créer mon coffre"
            busyLabel="Création…"
            onSubmit={async ({ phrase, confirmation }) => {
              if (phrase !== confirmation) return 'Les deux phrases ne correspondent pas.'
              try {
                setState({ kind: 'unlocked', key: await vault.setup(phrase) })
              } catch (error) {
                if (error instanceof VaultAlreadyExistsError) return void refresh()
                return messageErreur(error)
              }
            }}
          >
            <h2>Choisis ta phrase secrète</h2>
            <p>
              Elle chiffre tes pesées : personne d’autre, ni Google ni Firebase, ne peut les lire.
              Au moins {MIN_PASSPHRASE_LENGTH} caractères ; une suite de mots est idéale.
            </p>
            <p>
              <strong>
                ⚠️ Si tu la perds, tes données sont perdues : aucune récupération possible.
              </strong>{' '}
              Range-la dans un gestionnaire de mots de passe.
            </p>
            <p className="hint">
              Conseil : exporte tes pesées de temps en temps (Réglages → Export CSV), c’est ta
              sauvegarde.
            </p>
          </PassphraseForm>
        )
      case 'locked':
        return (
          <PassphraseForm
            fields={[{ name: 'phrase', label: 'Phrase secrète', autoComplete: 'current-password' }]}
            submitLabel="Déverrouiller"
            busyLabel="Déverrouillage…"
            onSubmit={async ({ phrase }) => {
              try {
                setState({ kind: 'unlocked', key: await vault.unlock(phrase) })
              } catch (error) {
                return messageErreur(error)
              }
            }}
          >
            <h2>Coffre verrouillé</h2>
          </PassphraseForm>
        )
      case 'unlocked':
        return (
          <VaultContext.Provider value={unlocked}>
            <AutoLock onIdle={lock} timeoutMs={idleMs} />
            {children}
          </VaultContext.Provider>
        )
    }
  }

  return (
    <>
      {header?.(unlocked)}
      <main>{contenu()}</main>
    </>
  )
}

function AutoLock({ onIdle, timeoutMs }: { onIdle: () => void; timeoutMs: number }) {
  useAutoLock(onIdle, timeoutMs)
  return null
}
