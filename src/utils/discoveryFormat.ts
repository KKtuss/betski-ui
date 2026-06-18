export const formatHoldDuration = (minutes: number) => {
  const clamped = Math.max(1, Math.round(minutes))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  if (h <= 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export const capitalizeFirst = (value: string) => {
  if (!value) return value
  return value[0].toUpperCase() + value.slice(1)
}
