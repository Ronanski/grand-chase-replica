import type { Period, Settings } from './types'

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** Start (ms) of the current daily or weekly period, based on the configured reset time. */
export function periodStart(period: Period, settings: Settings, now = Date.now()): number {
  const d = new Date(now)
  let start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), settings.resetHourUtc)
  if (start > now) start -= DAY
  if (period === 'daily') return start
  const daysSince = (new Date(start).getUTCDay() - settings.weeklyResetDay + 7) % 7
  return start - daysSince * DAY
}

export function nextReset(period: Period, settings: Settings, now = Date.now()): number {
  return periodStart(period, settings, now) + (period === 'daily' ? DAY : 7 * DAY)
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'ended'
  const days = Math.floor(ms / DAY)
  const hours = Math.floor((ms % DAY) / HOUR)
  const mins = Math.floor((ms % HOUR) / 60_000)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}
