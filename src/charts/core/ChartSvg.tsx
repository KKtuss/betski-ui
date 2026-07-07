import type { ReactNode, SVGProps } from 'react'

type ChartSvgProps = SVGProps<SVGSVGElement> & {
  viewportWidth: number
  viewportHeight: number
  preserveStretch?: boolean
  children: ReactNode
}

export const ChartSvg = ({
  viewportWidth,
  viewportHeight,
  preserveStretch = false,
  className = '',
  children,
  ...rest
}: ChartSvgProps) => (
  <svg
    width={viewportWidth}
    height={viewportHeight}
    viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
    preserveAspectRatio={preserveStretch ? 'none' : 'xMidYMid meet'}
    className={className}
    {...rest}
  >
    {children}
  </svg>
)
