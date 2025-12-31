import { Link, useLocation } from 'react-router-dom'
import { useUIStore } from '../../stores/uiStore'
import { usePortfolios } from '../../hooks/usePortfolios'

export default function Sidebar() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)
  const openCreateModal = useUIStore((state) => state.openCreatePortfolioModal)
  const { data: portfolios, isLoading } = usePortfolios()
  const location = useLocation()

  if (!sidebarOpen) return null

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto transition-colors">
      <nav className="p-4">
        <div className="space-y-1">
          <Link
            to="/"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              location.pathname === '/'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Home
          </Link>

          <Link
            to="/generate"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              location.pathname === '/generate'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Generate
          </Link>

          <Link
            to="/workflows"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              location.pathname === '/workflows'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
            Workflows
          </Link>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between px-3 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Portfolios
            </h3>
            <button
              onClick={openCreateModal}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              aria-label="Create portfolio"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>

          {isLoading ? (
            <div className="px-3 py-2 text-gray-500 dark:text-gray-500">Loading...</div>
          ) : portfolios?.length === 0 ? (
            <div className="px-3 py-2 text-gray-500 dark:text-gray-500 text-sm">No portfolios yet</div>
          ) : (
            <div className="space-y-1">
              {portfolios?.map((portfolio) => (
                <Link
                  key={portfolio.id}
                  to={`/portfolio/${portfolio.id}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === `/portfolio/${portfolio.id}`
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                  <span className="truncate">{portfolio.name}</span>
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-500">{portfolio.image_count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
    </aside>
  )
}
