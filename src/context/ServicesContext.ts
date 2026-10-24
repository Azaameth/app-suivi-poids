import { createContext, useContext } from 'react'
import type { Services } from '../core'

export const ServicesContext = createContext<Services | null>(null)

export function useServices(): Services {
  const services = useContext(ServicesContext)
  if (!services) throw new Error('useServices doit être utilisé sous <ServicesProvider>')
  return services
}
