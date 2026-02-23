import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SemaData_App from './App.jsx'
import './index.css'; // IMPORT YOUR LOCAL FILE

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SemaData_App />
  </StrictMode>,
)
