import { useParams, Link } from 'react-router-dom'
import { usePortfolio, useDeletePortfolio } from '../hooks/usePortfolios'
import { useGenerations } from '../hooks/useGenerations'
import { useUIStore } from '../stores/uiStore'
import { ImageGrid } from '../components/gallery'
import { Button, Spinner } from '../components/ui'
import { useNavigate } from 'react-router-dom'

export default function PortfolioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio(id!)
  const { data: generations, isLoading: generationsLoading } = useGenerations(id)
  const deletePortfolio = useDeletePortfolio()
  const openImageDetail = useUIStore((state) => state.openImageDetail)

  const handleDelete = async () => {
    if (confirm(`Delete "${portfolio?.name}"? This will also delete all images in this portfolio.`)) {
      await deletePortfolio.mutateAsync(id!)
      navigate('/')
    }
  }

  if (portfolioLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-violet-500" />
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-medium text-slate-300 mb-2">Portfolio not found</h2>
        <Link to="/" className="text-violet-400 hover:text-violet-300 underline">
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{portfolio.name}</h1>
          {portfolio.description && (
            <p className="text-slate-400 mt-1">{portfolio.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={handleDelete}
            loading={deletePortfolio.isPending}
          >
            Delete
          </Button>
          <Link to={`/generate?portfolio=${id}`}>
            <Button>Generate</Button>
          </Link>
        </div>
      </div>

      {generationsLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" className="text-violet-500" />
        </div>
      ) : generations?.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-slate-300 mb-2">No images yet</h2>
          <p className="text-slate-500 mb-4">Generate your first image in this portfolio</p>
          <Link to={`/generate?portfolio=${id}`}>
            <Button>Generate Image</Button>
          </Link>
        </div>
      ) : (
        <ImageGrid
          generations={generations}
          onImageClick={openImageDetail}
        />
      )}
    </div>
  )
}
