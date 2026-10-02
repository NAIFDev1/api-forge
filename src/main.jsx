import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { WorkspaceProvider } from './context/WorkspaceContext'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WorkspaceProvider>
      <App />
    </WorkspaceProvider>
  </StrictMode>
)