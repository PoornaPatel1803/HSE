import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { FrappeProvider } from 'frappe-react-sdk'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/Toast.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename="/hse">
      <FrappeProvider>
        <ToastProvider>
          <App />
          
        </ToastProvider>
      </FrappeProvider>
    </BrowserRouter>
  </StrictMode>
)
