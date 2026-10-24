import { useEffect, useState } from 'react'
import type { AuthUser } from '../../core'
import { useServices } from '../../context/ServicesContext'

/** `undefined` tant que l'état initial n'est pas connu (session en cours de restauration). */
export function useAuthUser(): AuthUser | null | undefined {
  const { auth } = useServices()
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined)
  useEffect(() => auth.onAuthStateChanged(setUser), [auth])
  return user
}
