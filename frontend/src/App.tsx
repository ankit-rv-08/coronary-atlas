import { lazy, Suspense, useState } from 'react'
import { Disclaimer } from './components/Disclaimer'
import { Header } from './components/Header'
import { PatientForm } from './components/PatientForm'
import { ShapPanel } from './components/ShapPanel'
import { VesselCards } from './components/VesselCards'
import type { PatientFeatures, Predictions, TargetName, VesselName } from './types'
import './App.css'

const HeartViewer = lazy(() => import('./components/HeartViewer').then((module) => ({ default: module.HeartViewer })))
const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

function App() {
  const [predictions, setPredictions] = useState<Predictions | null>(null)
  const [selected, setSelected] = useState<TargetName>('CAD')
  const [activeTab, setActiveTab] = useState('Overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePredict(features: PatientFeatures) {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ features }) })
      if (!response.ok) throw new Error(`Prediction request failed (${response.status})`)
      setPredictions(await response.json() as Predictions)
      setSelected('CAD')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not reach the prediction service')
    } finally { setLoading(false) }
  }

  return <main className="atlas-shell">
    <Header activeTab={activeTab} onTabChange={setActiveTab} />
    <section className="workspace">
      <aside className="control-panel"><div className="eyebrow">PATIENT PROFILE <span className="live-dot" /> LIVE</div><h1>Assess coronary risk</h1><p className="muted">Enter clinical signals to update the arterial map.</p><PatientForm onSubmit={handlePredict} loading={loading} />{error && <p className="error-message">{error}. Start the backend at port 8000.</p>}
      </aside>
      <section className="visual-panel"><div className="visual-heading"><div><span className="eyebrow">CORONARY ARTERIAL MAP</span><h2>Anterior circulation</h2></div><span className="orientation">ANTERIOR <b>◉</b></span></div><div className="viewer-wrap"><span className="live-badge"><i /> Live visualization</span><div className="severity-legend">{[['#43d17b', 'Lower'], ['#e5c45a', 'Moderate'], ['#f28b4b', 'Elevated'], ['#ef5364', 'Critical']].map(([color, label]) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div><Suspense fallback={<div className="viewer-loading">Loading 3D viewer...</div>}><HeartViewer predictions={predictions} selectedVessel={selected === 'CAD' ? null : selected as VesselName} onSelectVessel={setSelected} /></Suspense><div className="viewer-hint">Drag to rotate <span>•</span> Scroll to zoom <span>•</span> Click a vessel to inspect</div></div></section>
      <aside className="insight-panel"><VesselCards predictions={predictions} selected={selected} onSelect={setSelected} /><ShapPanel predictions={predictions} selected={selected} /></aside>
    </section>
    <Disclaimer />
  </main>
}

export default App