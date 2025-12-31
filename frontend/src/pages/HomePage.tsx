import { usePortfolios } from '../hooks/usePortfolios'
import { useUIStore } from '../stores/uiStore'
import { PortfolioGrid } from '../components/portfolio'
import { Button, Spinner } from '../components/ui'

export default function HomePage() {
  const { data: portfolios, isLoading, error } = usePortfolios()
  const openCreateModal = useUIStore((state) => state.openCreatePortfolioModal)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-gray-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-gray-700 dark:text-gray-300 p-4 bg-gray-200 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
        Error loading portfolios: {error.message}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolios</h1>
        <Button onClick={openCreateModal}>New Portfolio</Button>
      </div>

      {portfolios?.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No portfolios yet</h2>
          <p className="text-gray-500 mb-4">Create your first portfolio to start generating images</p>
          <Button onClick={openCreateModal}>Create Portfolio</Button>
        </div>
      ) : (
        <PortfolioGrid portfolios={portfolios} />
      )}
    </div>
  )
}
