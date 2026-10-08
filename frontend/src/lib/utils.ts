import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const SEVERITY_COLORS = {
  lower: '#22c55e',
  moderate: '#eab308',
  elevated: '#f97316',
  critical: '#ef4444',
} as const

export type Severity = keyof typeof SEVERITY_COLORS

export function probToSeverity(probability: number): Severity {
  if (probability < 0.3) return 'lower'
  if (probability < 0.6) return 'moderate'
  if (probability < 0.8) return 'elevated'
  return 'critical'
}

export function probToColor(probability: number): string {
  return SEVERITY_COLORS[probToSeverity(probability)]
}

export function formatPct(probability: number): string {
  return `${Math.round(probability * 100)}%`
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
