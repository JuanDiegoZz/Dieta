import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installLegacyMode } from './platform/legacy'
import './styles/index.css'

const root = document.getElementById('root')

installLegacyMode()

if (!root) throw new Error('No se encontró el contenedor de la aplicación')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
