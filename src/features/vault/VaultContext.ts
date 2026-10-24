import { createContext, useContext } from 'react'

export interface UnlockedVault {
  /** Clé de données déverrouillée (en mémoire uniquement). */
  key: CryptoKey
  lock(): void
  changePassphrase(oldPassphrase: string, newPassphrase: string): Promise<void>
}

export const VaultContext = createContext<UnlockedVault | null>(null)

/** Disponible uniquement sous <VaultGate>, une fois le coffre déverrouillé. */
export function useUnlockedVault(): UnlockedVault {
  const vault = useContext(VaultContext)
  if (!vault) throw new Error('useUnlockedVault doit être utilisé sous <VaultGate>')
  return vault
}
