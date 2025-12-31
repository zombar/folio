import { Link } from 'react-router-dom'
import { useUIStore } from '../../stores/uiStore'
import { ThemeToggle } from '../ui'

export default function Header() {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 shrink-0">
      <button
        onClick={toggleSidebar}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg mr-4 text-gray-600 dark:text-gray-300"
        aria-label="Toggle sidebar"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <Link to="/" className="text-2xl font-pacifico text-gray-800 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        Folio
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Link
          to="/generate"
          className="bg-gray-800 hover:bg-gray-700 dark:bg-gray-100 dark:hover:bg-gray-200 text-white dark:text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Generate
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}
