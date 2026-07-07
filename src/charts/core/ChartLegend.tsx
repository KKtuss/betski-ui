type ChartLegendItem = {
  id: string
  label: string
  color: string
  dashed?: boolean
}

type ChartLegendProps = {
  items: ChartLegendItem[]
  className?: string
}

export const ChartLegend = ({ items, className = '' }: ChartLegendProps) => (
  <div className={`chart-legend ${className}`.trim()}>
    {items.map((item) => (
      <div key={item.id} className="chart-legend-item">
        <span
          className="chart-legend-swatch"
          style={{
            background: item.color,
            border: item.dashed ? `1px dashed ${item.color}` : undefined
          }}
        />
        <span>{item.label}</span>
      </div>
    ))}
  </div>
)
