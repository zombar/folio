import { Link } from 'react-router-dom'
import { useUIStore } from '../../stores/uiStore'
import { ThemeToggle } from '../ui'

export default function Header() {
 const toggleSidebar = useUIStore((state) => state.toggleSidebar)

 return (
  <header className="h-14 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex items-center px-4 shrink-0">
   <button
    onClick={toggleSidebar}
    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 mr-4 text-neutral-600 dark:text-neutral-300"
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

   <Link to="/" className="text-2xl font-pacifico text-neutral-800 dark:text-neutral-100 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
    Folio
   </Link>

   <div className="flex-1" />

   <ThemeToggle />
  </header>
 )
}
