import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { MiseAJourContext } from './context/MiseAJourContext'
import { ServicesProvider } from './context/ServicesProvider'
import './index.css'
import { createMiseAJour, createServices } from './platform'

const services = createServices()
const miseAJour = createMiseAJour()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServicesProvider services={services}>
      <MiseAJourContext.Provider value={miseAJour}>
        <App />
      </MiseAJourContext.Provider>
    </ServicesProvider>
  </StrictMode>,
)
