import { useEffect, useState } from 'react'
import { CodeSecours } from './CodeSecours'
import { messageErreur } from './messages'
import { PassphraseForm } from './PassphraseForm'
import { useUnlockedVault } from './VaultContext'

export function VaultSettings() {
  const { changePassphrase, aCodeSecours, creerCodeSecours } = useUnlockedVault()
  const [changed, setChanged] = useState(false)
  const [codeExiste, setCodeExiste] = useState<boolean | null>(null)
  const [nouveauCode, setNouveauCode] = useState<string | null>(null)
  useEffect(() => {
    let actif = true
    void aCodeSecours().then((existe) => actif && setCodeExiste(existe))
    return () => {
      actif = false
    }
  }, [aCodeSecours, nouveauCode])

  return (
    <section>
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
      <details>
        <summary>Code de secours</summary>
        {nouveauCode ? (
          <CodeSecours code={nouveauCode} onContinuer={() => setNouveauCode(null)} />
        ) : (
          <>
            <p className="hint">
              {codeExiste === null
                ? 'Vérification…'
                : codeExiste
                  ? 'Un code de secours existe. En créer un nouveau rend l’ancien inutilisable.'
                  : '⚠️ Aucun code de secours : si tu oublies ta phrase, tes données seront perdues.'}
            </p>
            <PassphraseForm
              fields={[
                { name: 'phrase', label: 'Phrase actuelle', autoComplete: 'current-password' },
              ]}
              submitLabel={
                codeExiste ? 'Régénérer mon code de secours' : 'Créer mon code de secours'
              }
              busyLabel="Création…"
              onSubmit={async ({ phrase }) => {
                try {
                  setNouveauCode(await creerCodeSecours(phrase))
                } catch (error) {
                  return messageErreur(error, 'Phrase actuelle incorrecte.')
                }
              }}
            />
          </>
        )}
      </details>
    </section>
  )
}
