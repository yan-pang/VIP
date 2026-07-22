import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/global.scss'
import './styles/Workbench.scss'
import './styles/Control.scss'
import './styles/OpsAdmin.scss'
import './styles/SearchPanel.scss'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
