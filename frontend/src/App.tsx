import { useEffect, useState } from 'react'
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
    <main>
      <h1>Truck Route Weather</h1>
      <p>Backend: {status}</p>
    </main>
  )
}

export default App
