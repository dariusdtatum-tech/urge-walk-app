// Money kept: a private tally, off by default. It reuses the "$ each time" value from Time back
// (profile.timeBack.moneyPerTime); setting it turns money on, clearing it turns money off.
// urgewalk.v1.moneyGoal  { version: 1, name, target | null }   optional named goal it's going toward
// The total since day 1 uses the Time back estimate when the setup answers allow it; otherwise it
// counts urges that passed × $ each time. All of it is on-device math.
import { timeBack } from './homeIdeas.js'
import { readObject, writeObject } from './storage.js'

export const MONEY_GOAL_KEY = 'urgewalk.v1.moneyGoal'
export const MAX_GOAL_NAME = 40
export const MAX_TARGET = 10_000_000

export const moneyPerTime = (profile) => { const m = profile?.timeBack?.moneyPerTime; return typeof m === 'number' && m > 0 ? m : null }
export const moneyOn = (profile) => moneyPerTime(profile) != null

export function fmtMoney(n) {
  const v = Math.round(n * 100) / 100
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`
}

export function sanitizeGoal(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const name = typeof raw.name === 'string' ? raw.name.replace(/\s+/g, ' ').trim().slice(0, MAX_GOAL_NAME) : ''
  const t = Number(raw.target)
  const target = Number.isFinite(t) && t > 0 ? Math.min(MAX_TARGET, Math.round(t)) : null
  return name || target ? { version: 1, name, target } : null
}
export const loadGoal = (storage) => sanitizeGoal(readObject(MONEY_GOAL_KEY, storage))
export const saveGoal = (goal, storage) => writeObject(MONEY_GOAL_KEY, sanitizeGoal(goal), storage)

const passed = (walks) => (walks ?? []).filter((w) => w?.result === 'yes').length

// null when money is off. basis: 'estimate' (from setup answers) | 'urges' (urges that passed).
export function moneyKept(profile, habit, walks, today) {
  const per = moneyPerTime(profile)
  if (per == null) return null
  const est = timeBack(profile, habit, today)?.money ?? null
  const n = passed(walks)
  const total = est != null ? est : Math.round(n * per * 100) / 100
  return { total, perTime: per, passed: n, basis: est != null ? 'estimate' : 'urges' }
}

// "+$12 kept" on a passed save, or '' when money is off or it didn't pass.
export const keptLine = (profile, result) => (result === 'yes' && moneyOn(profile) ? `+${fmtMoney(moneyPerTime(profile))} kept` : '')
export const withKept = (text, profile, result) => { const k = keptLine(profile, result); return k ? `${text} ${k}.` : text }

// { pct 0-100, left } toward the target, or null when no target.
export function goalProgress(goal, total) {
  if (!goal?.target) return null
  const pct = Math.max(0, Math.min(100, Math.floor((total / goal.target) * 100)))
  return { pct, left: Math.max(0, goal.target - total) }
}
