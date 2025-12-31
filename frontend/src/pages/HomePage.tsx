import { Link } from 'react-router-dom'
import { usePortfolios } from '../hooks/usePortfolios'
import { useUIStore } from '../stores/uiStore'

export default function HomePage() {
  const { data: portfolios, isLoading, error } = usePortfolios()
  const openCreateModal = useUIStore((state) => state.openCreatePortfolioModal)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-400 p-4 bg-red-900/20 rounded-lg">
        Error loading portfolios: {error.message}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Portfolios</h1>
        <button
          onClick={openCreateModal}
          className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          New Portfolio
        </button>
      </div>

      {portfolios?.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">No portfolios yet</div>
          <button
            onClick={openCreateModal}
            className="text-violet-400 hover:text-violet-300 underline"
          >
            Create your first portfolio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {portfolios?.map((portfolio) => (
            <Link
              key={portfolio.id}
              to={`/portfolio/${portfolio.id}`}
              className="bg-slate-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-violet-500 transition-all group"
            >
              <div className="aspect-video bg-slate-700 flex items-center justify-center">
                {portfolio.cover_image_id ? (
                  <img
                    src={`/api/images/${portfolio.cover_image_id}/thumbnail`}
                    alt={portfolio.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    className="w-12 h-12 text-slate-600"
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
                <h3 className="font-semibold text-white group-hover:text-violet-400 transition-colors">
                  {portfolio.name}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {portfolio.image_count} images
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
