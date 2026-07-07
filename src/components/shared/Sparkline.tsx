import { EngineTradeSparkline } from '../../charts/components/EngineTradeSparkline'

interface SparklineProps {
  series: number[]
  buyIdx: number
  sellIdx: number
  width: number
  height: number
  padX: number
  padY: number
  isPositive: boolean
  gradientId: string
}

export const Sparkline = ({
  series,
  buyIdx,
  sellIdx,
  width,
  height,
  padX,
  padY,
  isPositive
}: SparklineProps) => (
  <EngineTradeSparkline
    series={series}
    buyIdx={buyIdx}
    sellIdx={sellIdx}
    width={width}
    height={height}
    padX={padX}
    padY={padY}
    isPositive={isPositive}
  />
)
