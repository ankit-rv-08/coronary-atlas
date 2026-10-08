import type { Predictions, TargetName } from '../types'
import { formatPct, probToColor, probToSeverity } from '../lib/utils'

const DESCRIPTIONS: Record<TargetName, string> = { CAD: 'Overall coronary artery disease', LAD: 'Left anterior descending', LCX: 'Left circumflex', RCA: 'Right coronary artery' }
interface VesselCardsProps { predictions: Predictions | null; selected: TargetName | null; onSelect: (target: TargetName) => void }

export function VesselCards({ predictions, selected, onSelect }: VesselCardsProps) {
  return <div className="vessel-summary"><div className="section-label">Prediction summary</div>{(['CAD', 'LAD', 'LCX', 'RCA'] as TargetName[]).map((target) => {
    const prediction = predictions?.[target]; const color = prediction ? probToColor(prediction.probability) : '#475569'
    return <button type="button" key={target} className={`summary-card ${selected === target ? 'selected' : ''}`} onClick={() => onSelect(target)}><span className="summary-accent" style={{ background: color }} /><span><strong>{target}</strong><small>{DESCRIPTIONS[target]}</small></span><b style={{ color }}>{prediction ? formatPct(prediction.probability) : '--'}{prediction && <i>{probToSeverity(prediction.probability)}</i>}</b>{prediction && <em style={{ width: `${prediction.probability * 100}%`, background: color }} />}</button>
  })}{!predictions && <p className="empty-summary">Enter clinical inputs and run prediction.</p>}</div>
}
