import type { Portfolio } from '../../types'
import PortfolioCard from './PortfolioCard'

interface PortfolioGridProps {
 portfolios: Portfolio[]
}

export default function PortfolioGrid({ portfolios }: PortfolioGridProps) {
 return (
  <div
   className="grid gap-4"
   style={{ gridTemplateColumns: 'repeat(auto-fill, 360px)' }}
  >
   {portfolios.map((portfolio) => (
    <PortfolioCard key={portfolio.id} portfolio={portfolio} />
   ))}
  </div>
 )
}
