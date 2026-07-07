import { useEffect, useRef, useState, type ReactNode } from 'react'
import { computeViewport, DEFAULT_CHART_PADDING } from '../data/transformChartData'
import type { ChartViewport } from '../data/types'

type ChartContainerProps = {
  className?: string
  padding?: typeof DEFAULT_CHART_PADDING
  children: (viewport: ChartViewport) => ReactNode
}

export const ChartContainer = ({
  className = '',
  padding = DEFAULT_CHART_PADDING,
  children
}: ChartContainerProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<ChartViewport>(() => computeViewport(0, 0, padding))

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      setViewport(computeViewport(width, height, padding))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [padding.bottom, padding.left, padding.right, padding.top])

  return (
    <div ref={ref} className={`chart-container ${className}`.trim()}>
      {viewport.width > 0 && viewport.height > 0 ? children(viewport) : null}
    </div>
  )
}
