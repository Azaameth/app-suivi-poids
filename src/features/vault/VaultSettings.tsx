import { useState } from 'react'
import { messageErreur } from './messages'
import { PassphraseForm } from './PassphraseForm'
import { useUnlockedVault } from './VaultContext'

export function VaultSettings() {
  const { lock, changePassphrase } = useUnlockedVault()
  const [changed, setChanged] = useState(false)

  return (
    <section>
      <p>
        <button type="button" onClick={lock}>
          🔒 Verrouiller
        </button>
      </p>
      <details>
        <summary>Changer de phrase secrète</summary>
        <PassphraseForm
          fields={[
            { name: 'ancienne', label: 'Phrase actuelle', autoComplete: 'current-password' },
            { name: 'nouvelle', label: 'Nouvelle phrase', autoComplete: 'new-password' },
            { name: 'confirmation', label: 'Confirmation', autoComplete: 'new-password' },
          ]}
          submitLabel="Changer"
          busyLabel="Changement…"
          onSubmit={async ({ ancienne, nouvelle, confirmation }) => {
            setChanged(false)
            if (nouvelle !== confirmation) return 'Les deux nouvelles phrases ne correspondent pas.'
            try {
              await changePassphrase(ancienne, nouvelle)
              setChanged(true)
            } catch (error) {
              return messageErreur(error, 'Phrase actuelle incorrecte.')
            }
          }}
        />
        {changed && <p role="status">Phrase secrète changée. Tes données restent lisibles.</p>}
      </details>
    </section>
  )
}
