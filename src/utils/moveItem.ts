export const moveItem = <T,>(items: T[], index: number, direction: -1 | 1): T[] => {
  const next = [...items]
  const target = index + direction
  if (target < 0 || target >= next.length) return items
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
