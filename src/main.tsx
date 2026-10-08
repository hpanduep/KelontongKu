import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AuthGate from './auth/AuthGate.tsx'
import CloudData from './lib/CloudData.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <CloudData>
        {(data, userId) => <App key={userId} initial={data} userId={userId} />}
      </CloudData>
    </AuthGate>
  </StrictMode>,
)
