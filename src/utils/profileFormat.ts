export const formatUsd = (value: number) => {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${value < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${value < 0 ? '-' : ''}$${(abs / 1_000).toFixed(1)}K`
  return `${value < 0 ? '-' : ''}$${abs.toFixed(0)}`
}

export const formatUsdSigned = (value: number) => {
  const abs = Math.abs(value)
  const base = abs >= 1_000_000
    ? `$${(abs / 1_000_000).toFixed(2)}M`
    : abs >= 1_000
      ? `$${(abs / 1_000).toFixed(1)}K`
      : `$${abs.toFixed(0)}`
  return `${value >= 0 ? '+' : '-'}${base}`
}
