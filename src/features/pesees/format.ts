import { dayToMs } from '../../core/pesees'

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const shortDateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const weightFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

/** `2026-10-24` → « sam. 24 oct. 2026 ». */
export const formatDay = (day: string) => dateFormat.format(dayToMs(day))
/** `2026-10-24` → « 24 oct. ». */
export const formatShortDay = (day: string) => shortDateFormat.format(dayToMs(day))
/** 72.4 → « 72,4 kg ». */
export const formatWeight = (kg: number) => `${weightFormat.format(kg)} kg`
