import { useEffect, useState } from 'react'
import { MapView } from './components/MapView'
import './App.css'

type BackendStatus = 'checking' | 'ok' | 'unreachable'

function App() {
  const [status, setStatus] = useState<BackendStatus>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then((data: { status: string }) => setStatus(data.status === 'ok' ? 'ok' : 'unreachable'))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <main className="app">
      <MapView />
      <div className="status-badge">
        <strong>Truck Route Weather</strong>
        <span>Backend: {status}</span>
      </div>
    </main>
  )
}

export default App
