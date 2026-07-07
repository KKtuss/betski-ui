import { useMemo } from 'react'
import type { ChartDataState, ChartProvider } from './types'

export const useChartData = <T,>(provider: ChartProvider<T>): ChartDataState<T> =>
  useMemo(() => provider(), [provider])

export const useChartDataFromState = <T,>(state: ChartDataState<T>): ChartDataState<T> => state
