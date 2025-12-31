import type { Portfolio } from '../../types'
import PortfolioCard from './PortfolioCard'

interface PortfolioGridProps {
 portfolios: Portfolio[]
}

export default function PortfolioGrid({ portfolios }: PortfolioGridProps) {
 return (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
   {portfolios.map((portfolio) => (
    <PortfolioCard key={portfolio.id} portfolio={portfolio} />
   ))}
  </div>
 )
}
