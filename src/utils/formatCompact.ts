export const formatCompactUsd = (value: number) => {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2).replace(/\.00$/, '')}M`
  if (abs >= 10_000) return `$${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(2).replace(/\.00$/, '')}K`
  return `$${Math.round(value)}`
}

export const formatCompactNumber = (value: number) => {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2).replace(/\.00$/, '')}B`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace(/\.00$/, '')}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return `${Math.round(value)}`
}
