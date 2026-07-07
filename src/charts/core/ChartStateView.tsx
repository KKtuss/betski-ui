import type { ReactNode } from 'react'
import type { ChartDataState } from '../data/types'
import '../theme/chartTheme.css'

type ChartStateViewProps<T> = {
  state: ChartDataState<T>
  loadingLabel?: string
  emptyLabel?: string
  className?: string
  children: (data: T) => ReactNode
}

export const ChartStateView = <T,>({
  state,
  loadingLabel = 'Loading chart data…',
  emptyLabel = 'No chart data',
  className = '',
  children
}: ChartStateViewProps<T>) => {
  if (state.status === 'loading') {
    return (
      <div className={`chart-state-view chart-state-view--loading ${className}`.trim()}>
        {loadingLabel}
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className={`chart-state-view chart-state-view--error ${className}`.trim()}>
        {state.message}
      </div>
    )
  }
  if (state.status === 'empty') {
    return (
      <div className={`chart-state-view chart-state-view--empty ${className}`.trim()}>
        {state.reason ?? emptyLabel}
      </div>
    )
  }
  return <>{children(state.data)}</>
}
