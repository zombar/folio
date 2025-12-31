import { Link } from 'react-router-dom'
import { useUIStore } from '../../stores/uiStore'

export default function Header() {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)

  return (
    <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center px-4 shrink-0">
      <button
        onClick={toggleSidebar}
        className="p-2 hover:bg-slate-700 rounded-lg mr-4"
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

      <Link to="/" className="text-xl font-bold text-violet-400 hover:text-violet-300">
        Folio
      </Link>

      <div className="flex-1" />

      <Link
        to="/generate"
        className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        Generate
      </Link>
    </header>
  )
}
