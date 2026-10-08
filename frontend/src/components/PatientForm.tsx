import { useState } from 'react'
import type { FormEvent } from 'react'
import type { PatientFeatures } from '../types'

const INITIAL: PatientFeatures = { Age: 52, Sex: 1, BP: 132, PR: 76, FBS: 96, LDL: 196, TG: 220, HDL: 42, HTN: 0, 'Current Smoker': 0 }
const PRESETS: Record<string, PatientFeatures> = {
  baseline: INITIAL,
  elevated: { Age: 68, Sex: 1, BP: 162, PR: 88, FBS: 148, LDL: 220, TG: 310, HDL: 34, HTN: 1, 'Current Smoker': 1 },
}
const SECTIONS = [
  { title: 'Demographics', fields: [{ kind: 'number', key: 'Age', label: 'Age', unit: 'yrs' }, { kind: 'select', key: 'Sex', label: 'Sex' }] },
  { title: 'Vitals', fields: [{ kind: 'number', key: 'BP', label: 'Blood pressure', unit: 'mmHg' }, { kind: 'number', key: 'PR', label: 'Resting pulse', unit: 'bpm' }] },
  { title: 'Laboratory', fields: [{ kind: 'number', key: 'FBS', label: 'Fasting blood sugar', unit: 'mg/dL' }, { kind: 'number', key: 'LDL', label: 'LDL', unit: 'mg/dL' }, { kind: 'number', key: 'TG', label: 'Triglycerides', unit: 'mg/dL' }, { kind: 'number', key: 'HDL', label: 'HDL', unit: 'mg/dL' }] },
  { title: 'Risk factors', fields: [{ kind: 'toggle', key: 'HTN', label: 'Hypertension' }, { kind: 'toggle', key: 'Current Smoker', label: 'Current smoker' }] },
] as const

interface PatientFormProps { onSubmit: (features: PatientFeatures) => void; loading: boolean }

export function PatientForm({ onSubmit, loading }: PatientFormProps) {
  const [features, setFeatures] = useState<PatientFeatures>(INITIAL)
  const [open, setOpen] = useState<Record<string, boolean>>({ Demographics: true, Vitals: true, Laboratory: true, 'Risk factors': true })
  const set = (key: string, value: number) => setFeatures((current) => ({ ...current, [key]: value }))
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(features) }

  return <form className="patient-form" onSubmit={submit}>
    <div className="form-section preset-section"><div className="section-label">Scenario preset</div><div className="preset-grid">{(['baseline', 'elevated'] as const).map((name) => <button key={name} type="button" onClick={() => setFeatures(PRESETS[name])}>{name === 'baseline' ? 'Baseline' : 'Elevated'}</button>)}</div></div>
    {SECTIONS.map((section) => <div className="form-section" key={section.title}>
      <button type="button" className="section-toggle" onClick={() => setOpen((current) => ({ ...current, [section.title]: !current[section.title] }))}><span>{section.title}</span><b>{open[section.title] ? '−' : '+'}</b></button>
      {open[section.title] && <div className="field-grid">{section.fields.map((field) => {
        if (field.kind === 'toggle') { const on = Boolean(features[field.key]); return <label className="toggle-row" key={field.key}><span>{field.label}</span><button type="button" className={on ? 'toggle on' : 'toggle'} onClick={() => set(field.key, on ? 0 : 1)}><i /></button></label> }
        if (field.kind === 'select') return <label key={field.key}>{field.label}<select value={features.Sex} onChange={(event) => set('Sex', Number(event.target.value))}><option value={1}>Male</option><option value={0}>Female</option></select></label>
        return <label key={field.key}>{field.label}<span className="input-with-unit"><input type="number" value={features[field.key]} onChange={(event) => set(field.key, Number(event.target.value))} />{field.unit && <small>{field.unit}</small>}</span></label>
      })}</div>}
    </div>)}
    <div className="form-actions"><button className="predict-button" disabled={loading}>{loading ? 'Analyzing 55 features...' : 'Run prediction'} <span>↗</span></button><button className="reset-button" type="button" onClick={() => setFeatures(INITIAL)}>Reset</button><p className="disclaimer">Decision support only. This visualization is not a diagnosis.</p></div>
  </form>
}
