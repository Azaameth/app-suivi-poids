/** Légende par couche, du premier plan vers le fond ; une ligne par couche affichée. */
export function Legende(props: {
  projection: boolean
  notes: boolean
  objectif: boolean
  zone: boolean
  imc: boolean
  glissable: boolean
}) {
  return (
    <div className="legende hint">
      <p>
        <span className="groupe">Mesures</span>
        <span className="entree">
          <span className="pastille trait" /> tendance
        </span>
        <span className="entree">
          <span className="pastille point" /> pesées
        </span>
        {props.notes && (
          <span className="entree">
            <span className="pastille point note" /> avec note
          </span>
        )}
      </p>
      {props.projection && (
        <p>
          <span className="groupe">Projection</span>
          <span className="entree">
            <span className="pastille pointilles" /> 4 sem.
          </span>
          <span className="entree">
            <span className="pastille zone" /> 95 %
          </span>
          <span className="entree">
            <span className="pastille zone zone99" /> 99 %
          </span>
        </p>
      )}
      {(props.objectif || props.zone || props.imc) && (
        <p>
          <span className="groupe">Repères</span>
          {props.objectif && (
            <span className="entree">
              <span className="pastille trait-cible" /> objectif
            </span>
          )}
          {props.zone && (
            <span className="entree">
              <span className="pastille zone-maintien" /> zone à maintenir
            </span>
          )}
          {props.imc && (
            <span className="entree">
              <span className="pastille degrade-imc" /> corpulence (IMC, OMS)
            </span>
          )}
        </p>
      )}
      <p className="geste">
        {props.glissable ? 'Glisse pour remonter le temps · appui long' : 'Appui long'} pour lire
        une pesée
      </p>
    </div>
  )
}
