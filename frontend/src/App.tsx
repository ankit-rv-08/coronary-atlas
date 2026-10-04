import { useMemo, useState } from 'react'
import { HeartViewer, VESSEL_NAMES } from './components/HeartViewer'
import type { FormEvent } from 'react'
import type { Prediction, Predictions, VesselName } from './components/HeartViewer'
import './App.css'

const API_URL = 'http://localhost:8000'
const demoPatient: Record<string, string | number> = { Age: 68, Sex: 'Male', BP: 162, DM: 1, HTN: 1, 'Current Smoker': 1, FH: 1, FBS: 142, LDL: 180, HDL: 32, TG: 220, 'St Elevation': 0, Tinversion: 1, LVH: 1, 'EF-TTE': 42, 'Region RWMA': 1 }

function percent(prediction?: Prediction) { return prediction ? `${Math.round(prediction.probability * 100)}%` : '--' }
function getColor(probability: number) { return probability < 0.3 ? '#43d17b' : probability < 0.6 ? '#e5c45a' : probability < 0.8 ? '#f28b4b' : '#ef5364' }

function App() {
  const [features, setFeatures] = useState<Record<string, string | number>>(demoPatient)
  const [predictions, setPredictions] = useState<Predictions>()
  const [selectedVessel, setSelectedVessel] = useState<VesselName | null>('LAD')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const selectedPrediction = selectedVessel ? predictions?.[selectedVessel] : undefined
  const topContributions = useMemo(() => selectedPrediction?.contributions.slice(0, 6) ?? [], [selectedPrediction])

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('')
    try { const response = await fetch(`${API_URL}/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ features }) }); if (!response.ok) throw new Error(`Prediction request failed (${response.status})`); setPredictions(await response.json()) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not reach the prediction service') }
    finally { setLoading(false) }
  }
  function updateFeature(name: string, value: string) { setFeatures((current) => ({ ...current, [name]: Number.isNaN(Number(value)) || value === '' ? value : Number(value) })) }

  return <main className="atlas-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">CA</span><span><strong>Coronary Atlas</strong><small>Clinical visualization suite</small></span></div><nav><button className="nav-active">Overview</button><button>Patient explorer</button><button>Interactive demo</button></nav><button className="export-button" onClick={() => window.print()}>Export snapshot <span>↗</span></button></header>
    <section className="workspace">
      <aside className="control-panel"><div className="eyebrow">PATIENT PROFILE <span className="live-dot" /> LIVE</div><h1>Assess coronary risk</h1><p className="muted">Enter a small set of clinical signals to update the arterial map.</p><button className="preset" type="button" onClick={() => setFeatures(demoPatient)}><span>◈</span> Load elevated-risk scenario <b>→</b></button>
        <form onSubmit={submit}><label>Age<input type="number" value={features.Age} onChange={(event) => updateFeature('Age', event.target.value)} /></label><label>Sex<select value={features.Sex} onChange={(event) => updateFeature('Sex', event.target.value)}><option>Male</option><option>Female</option></select></label><div className="form-row"><label>Blood pressure<input type="number" value={features.BP} onChange={(event) => updateFeature('BP', event.target.value)} /></label><label>EF-TTE<input type="number" value={features['EF-TTE']} onChange={(event) => updateFeature('EF-TTE', event.target.value)} /></label></div><div className="form-row"><label>LDL<input type="number" value={features.LDL} onChange={(event) => updateFeature('LDL', event.target.value)} /></label><label>Triglycerides<input type="number" value={features.TG} onChange={(event) => updateFeature('TG', event.target.value)} /></label></div><div className="toggle-row"><span>Hypertension</span><button type="button" className={features.HTN ? 'toggle on' : 'toggle'} onClick={() => setFeatures((current) => ({ ...current, HTN: current.HTN ? 0 : 1 }))}><i /></button></div><div className="toggle-row"><span>Current smoker</span><button type="button" className={features['Current Smoker'] ? 'toggle on' : 'toggle'} onClick={() => setFeatures((current) => ({ ...current, 'Current Smoker': current['Current Smoker'] ? 0 : 1 }))}><i /></button></div><button className="predict-button" disabled={loading}>{loading ? 'Analyzing...' : 'Run prediction'} <span>↗</span></button></form>
        {error && <p className="error-message">{error}. Start the backend at port 8000.</p>}<p className="disclaimer">Decision support only. This visualization is not a diagnosis.</p>
      </aside>
      <section className="visual-panel"><div className="visual-heading"><div><span className="eyebrow">CORONARY ARTERIAL MAP</span><h2>Anterior circulation</h2></div><span className="orientation">ANTERIOR <b>◉</b></span></div><div className="viewer-wrap"><HeartViewer predictions={predictions} selectedVessel={selectedVessel} onSelectVessel={setSelectedVessel} /><div className="viewer-hint">Drag to rotate <span>•</span> Scroll to zoom</div></div><div className="vessel-grid">{VESSEL_NAMES.map((name) => <button key={name} className={selectedVessel === name ? 'vessel-card selected' : 'vessel-card'} onClick={() => setSelectedVessel(name)}><span className="vessel-line" style={{ background: predictions?.[name] ? getColor(predictions[name]!.probability) : '#7896a5' }} /><span><strong>{name}</strong><small>{name === 'LAD' ? 'Left anterior descending' : name === 'LCX' ? 'Left circumflex' : 'Right coronary artery'}</small></span><b>{percent(predictions?.[name])}</b></button>)}</div></section>
      <aside className="insight-panel"><div className="eyebrow">MODEL EXPLANATION</div><h2>{selectedVessel ?? 'Vessel'} signal profile</h2><p className="muted">Top features influencing this vessel's probability.</p>{selectedPrediction ? <div className="shap-list">{topContributions.map((item) => <div className="shap-row" key={item.feature}><span>{item.feature}</span><div className="shap-track"><i style={{ width: `${Math.min(Math.abs(item.shap) * 55, 100)}%`, background: item.shap >= 0 ? '#ef5364' : '#4bc2b5' }} /></div><b>{item.shap >= 0 ? '+' : ''}{item.shap.toFixed(2)}</b></div>)}</div> : <div className="empty-state"><span>◎</span><p>Run a prediction to reveal the model's reasoning.</p></div>}<div className="model-note"><span>●</span><p><strong>Explainable output</strong><br />SHAP contributions are ranked by impact.</p></div></aside>
    </section>
  </main>
}

export default App