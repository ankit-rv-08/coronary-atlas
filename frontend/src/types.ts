export type VesselName = 'LAD' | 'LCX' | 'RCA'
export type TargetName = 'CAD' | VesselName

export interface Contribution {
  feature: string
  value: number
  shap: number
}

export interface Prediction {
  probability: number
  status: 'Positive' | 'Negative'
  severity: 'lower' | 'moderate' | 'elevated' | 'critical'
  contributions: Contribution[]
}

export type Predictions = Partial<Record<TargetName, Prediction>>

export interface PatientFeatures {
  Age: number
  Sex: number
  BP: number
  PR: number
  FBS: number
  LDL: number
  TG: number
  HDL: number
  HTN: number
  'Current Smoker': number
  [key: string]: number
}
