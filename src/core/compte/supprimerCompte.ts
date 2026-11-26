import type { Services } from '../index'
import { PESEES } from '../pesees/model'
import { PROFIL_DOC } from '../profil/model'
import { SUGGESTIONS } from '../suggestions/Suggestions'
import { KEYS_DOC, META } from '../vault/Vault'
import type { DataStore } from '../data/DataStore'

/** Identifiants des documents d'une collection (premier état reçu, réseau nécessaire). */
function lireIds(data: DataStore, uid: string, collection: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const stop = data.watch(
      uid,
      collection,
      (docs) => {
        // Différé : l'écouteur peut être appelé avant que `watch` ne rende `stop` (mémoire).
        queueMicrotask(() => stop())
        resolve(docs.map((d) => d.id))
      },
      reject,
    )
  })
}

/**
 * Supprime le compte et toutes ses données (D47) : pesées, suggestions, `meta/profil`,
 * `meta/keys`, puis le
 * compte d'authentification. Chaque effacement attend la confirmation du serveur.
 * À appeler en ligne uniquement ; l'interface demande une confirmation forte.
 * Compte e-mail : le mot de passe est vérifié **avant** tout effacement, pour ne jamais
 * laisser un compte vidé de ses données mais impossible à supprimer.
 */
export async function supprimerCompte(
  services: Pick<Services, 'auth' | 'data' | 'keys'>,
  uid: string,
  motDePasse?: string,
) {
  const { auth, data, keys } = services
  if (motDePasse !== undefined) await auth.confirmerMotDePasse(motDePasse)
  for (const collection of [PESEES, SUGGESTIONS]) {
    const ids = await lireIds(data, uid, collection)
    await Promise.all(ids.map((id) => data.remove(uid, collection, id)))
  }
  await data.remove(uid, META, PROFIL_DOC)
  await data.remove(uid, META, KEYS_DOC)
  await keys.clear()
  await keys.appareil?.oublier(uid)
  await auth.deleteAccount()
}

/**
 * Déconnexion : verrouille et oublie la clé conservée sur l'appareil (Android, D13), puis ferme
 * la session. La session est fermée même si l'appareil ne répond pas.
 */
export async function seDeconnecter(services: Pick<Services, 'auth' | 'keys'>, uid: string) {
  const { auth, keys } = services
  try {
    await keys.clear()
    await keys.appareil?.oublier(uid)
  } finally {
    await auth.signOut()
  }
}
