import { useState } from 'react'
import { useServices } from '../../context/ServicesContext'
import { MachimotoDit } from '../commun/Mascotte'

/**
 * Affiche le code de secours une seule fois (D48) : à recopier ou télécharger, puis confirmer
 * l'avoir rangé avant de continuer.
 */
export function CodeSecours({
  code,
  onContinuer,
  etape = false,
}: {
  code: string
  onContinuer: () => void
  /** Dernière étape de la création du coffre (accueil), plutôt qu'une régénération. */
  etape?: boolean
}) {
  const { files } = useServices()
  const [range, setRange] = useState(false)

  function telecharger() {
    void files.exportText(
      'machimoto-code-de-secours.txt',
      `Professeur Machimoto — code de secours\n\n${code}\n\nIl permet de choisir une nouvelle phrase secrète si tu oublies la tienne.\nGarde-le en lieu sûr (gestionnaire de mots de passe), jamais avec ton téléphone.\n`,
      'text/plain;charset=utf-8',
    )
  }

  return (
    <section className="card">
      {etape && <p className="etape">Étape 2 sur 2</p>}
      <h2>Ton code de secours</h2>
      <MachimotoDit expression="ravi">
        <p>{etape ? 'Coffre créé, bravo ! Dernière étape, promis.' : 'Nouveau code prêt !'}</p>
      </MachimotoDit>
      <p>
        Si tu oublies ta phrase secrète, ce code te permettra d’en choisir une nouvelle sans perdre
        tes pesées. <strong>Il ne sera plus jamais affiché.</strong>
      </p>
      <p className="code-secours" aria-label="Code de secours">
        {code}
      </p>
      <p className="hint">
        Range-le dans un gestionnaire de mots de passe, ou imprime-le. Quiconque le possède peut
        accéder à tes données : ne le partage pas.
      </p>
      <div className="row">
        <button type="button" onClick={telecharger}>
          Télécharger (.txt)
        </button>
      </div>
      <label className="inline">
        <input type="checkbox" checked={range} onChange={(e) => setRange(e.target.checked)} />
        J’ai rangé mon code en lieu sûr
      </label>
      <div className="row">
        <button type="button" className="principal" disabled={!range} onClick={onContinuer}>
          Continuer
        </button>
      </div>
    </section>
  )
}
