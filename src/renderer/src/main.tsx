import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initLanguage } from './i18n'

// Initialize i18n before rendering the app
const init = async () => {
  await initLanguage()

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

init()
