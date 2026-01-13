import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import moment from 'moment'
import './index.css'
import App from './App.tsx'

// Set global moment locale to English (ISO standards)
// This ensures all date parsing and formatting uses English numerals and standard formats
moment.locale('en')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
