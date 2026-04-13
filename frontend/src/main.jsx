import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'mana-font/css/mana.css'
import App from './App'
import { ThemeProvider } from './lib/useTheme'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
