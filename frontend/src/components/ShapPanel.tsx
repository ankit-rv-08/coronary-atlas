import { useMemo } from 'react'
import type { Predictions, TargetName } from '../types'
interface ShapPanelProps { predictions: Predictions | null; selected: TargetName }

export function ShapPanel({ predictions, selected }: ShapPanelProps) {
  const contributions = useMemo(() => [...(predictions?.[selected]?.contributions ?? [])].sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap)).slice(0, 10), [predictions, selected])
  const maxAbs = Math.max(0.001, ...contributions.map((item) => Math.abs(item.shap)))
  return <div className="shap-panel"><div className="shap-heading"><span className="section-label">Model explanation</span><b>{selected} signal profile</b></div>{contributions.length === 0 ? <p className="empty-state">Run a prediction to see feature contributions.</p> : <div className="shap-list">{contributions.map((item) => { const positive = item.shap >= 0; const color = positive ? '#ef5364' : '#43d17b'; return <div className="shap-row" key={item.feature}><div className="shap-meta"><span>{item.feature}</span><b>{item.value || '--'} <i style={{ color }}>{positive ? '+' : ''}{item.shap.toFixed(3)}</i></b></div><div className="shap-track"><i style={{ width: `${Math.abs(item.shap) / maxAbs * 100}%`, background: color }} /></div></div> })}</div>}<div className="shap-legend"><span><i style={{ background: '#ef5364' }} /> increases risk</span><span><i style={{ background: '#43d17b' }} /> decreases risk</span></div></div>
}
