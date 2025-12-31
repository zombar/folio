import { useParams, Link } from 'react-router-dom'
import { usePortfolio } from '../hooks/usePortfolios'
import { useGenerations } from '../hooks/useGenerations'
import { getThumbnailUrl } from '../api/client'

export default function PortfolioPage() {
  const { id } = useParams<{ id: string }>()
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio(id!)
  const { data: generations, isLoading: generationsLoading } = useGenerations(id)

  if (portfolioLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 mb-4">Portfolio not found</div>
        <Link to="/" className="text-violet-400 hover:text-violet-300 underline">
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{portfolio.name}</h1>
          {portfolio.description && (
            <p className="text-slate-400 mt-1">{portfolio.description}</p>
          )}
        </div>
        <Link
          to={`/generate?portfolio=${id}`}
          className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Generate
        </Link>
      </div>

      {generationsLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
        </div>
      ) : generations?.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">No images yet</div>
          <Link
            to={`/generate?portfolio=${id}`}
            className="text-violet-400 hover:text-violet-300 underline"
          >
            Generate your first image
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {generations?.map((gen) => (
            <div
              key={gen.id}
              className="relative aspect-square bg-slate-800 rounded-lg overflow-hidden group cursor-pointer"
            >
              {gen.status === 'completed' && gen.thumbnail_path ? (
                <img
                  src={getThumbnailUrl(gen.thumbnail_path) || ''}
                  alt={gen.prompt}
                  className="w-full h-full object-cover"
                />
              ) : gen.status === 'processing' ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mb-2" />
                  <span className="text-sm text-slate-400">{gen.progress}%</span>
                </div>
              ) : gen.status === 'failed' ? (
                <div className="w-full h-full flex items-center justify-center text-red-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-pulse bg-slate-700 w-full h-full" />
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <p className="text-sm text-white line-clamp-2">{gen.prompt}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
