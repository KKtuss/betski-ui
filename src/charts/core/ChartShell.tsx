import type { ReactNode } from 'react'

type ChartShellProps = {
  header?: ReactNode
  footer?: ReactNode
  className?: string
  children: ReactNode
}

export const ChartShell = ({ header, footer, className = '', children }: ChartShellProps) => (
  <div className={className}>
    {header}
    {children}
    {footer}
  </div>
)
