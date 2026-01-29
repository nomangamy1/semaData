import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SemaData_App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SemaData_App />
  </StrictMode>,
)
