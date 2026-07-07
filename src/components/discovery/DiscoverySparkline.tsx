import type { DataPoint } from '../../types/chart'
import { EngineSparkline } from '../../charts/components/EngineSparkline'
import './DiscoverySparkline.css'

export const DiscoverySparkline = ({ data }: { data: DataPoint[] }) => (
  <EngineSparkline data={data} />
)
