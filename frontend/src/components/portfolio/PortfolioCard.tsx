import { Link } from 'react-router-dom'
import type { Portfolio } from '../../types'

interface PortfolioCardProps {
  portfolio: Portfolio
}

export default function PortfolioCard({ portfolio }: PortfolioCardProps) {
  return (
    <Link
      to={`/portfolio/${portfolio.id}`}
      className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-gray-400 dark:hover:ring-gray-500 transition-all group shadow-sm"
    >
      <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        {portfolio.cover_image_id ? (
          <img
            src={`/api/images/${portfolio.cover_image_id}/thumbnail`}
            alt={portfolio.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg
            className="w-12 h-12 text-gray-300 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors truncate">
          {portfolio.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {portfolio.image_count} {portfolio.image_count === 1 ? 'image' : 'images'}
        </p>
      </div>
    </Link>
  )
}
