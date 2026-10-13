import { useEffect, useState } from 'react'
import { getBackendStatus } from './api/healthApi'
import { MapView } from './components/MapView'
import { BackendStatus } from './types/backendStatus'
import './App.css'

function App() {
  const [status, setStatus] = useState<BackendStatus>(BackendStatus.CHECKING)

  // Check the backend once, when the page first loads.
  useEffect(() => {
    getBackendStatus().then(setStatus)
  }, [])

  return (
    <main className="app">
      <MapView />

      {/* Floating badge over the map's top-left corner. */}
      <div className="status-badge">
        <strong>Truck Route Weather</strong>
        <span>Backend: {status}</span>
      </div>
    </main>
  )
}

export default App
