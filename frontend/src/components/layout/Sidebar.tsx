import { Link, useLocation } from 'react-router-dom'
import { useUIStore } from '../../stores/uiStore'
import { usePortfolios } from '../../hooks/usePortfolios'
import { useGenerations } from '../../hooks/useGenerations'
import { ConversationList } from '../chat'

export default function Sidebar() {
 const sidebarOpen = useUIStore((state) => state.sidebarOpen)
 const openCreateModal = useUIStore((state) => state.openCreatePortfolioModal)
 const closeImageDetail = useUIStore((state) => state.closeImageDetail)
 const { data: portfolios, isLoading } = usePortfolios()
 const { data: generations } = useGenerations()
 const location = useLocation()

 if (!sidebarOpen) return null

 return (
  <aside className="fixed left-0 top-14 bottom-0 w-64 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 overflow-y-auto transition-colors">
   <nav className="p-4">
    <div className="space-y-1">
     <Link
      to="/"
      onClick={closeImageDetail}
      className={`flex items-center gap-3 px-3 py-2 transition-colors ${
       location.pathname === '/'
        ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white'
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

     {portfolios && portfolios.length > 0 && (
      <Link
       to="/generate"
       onClick={closeImageDetail}
       className={`flex items-center gap-3 px-3 py-2 transition-colors ${
        location.pathname === '/generate'
         ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
         : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white'
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
     )}

     <Link
      to="/workflows"
      onClick={closeImageDetail}
      className={`flex items-center gap-3 px-3 py-2 transition-colors ${
       location.pathname === '/workflows'
        ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white'
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

     {generations && generations.length > 0 && (
      <Link
       to="/history"
       onClick={closeImageDetail}
       className={`flex items-center gap-3 px-3 py-2 transition-colors ${
        location.pathname === '/history'
         ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
         : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white'
       }`}
      >
       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
         strokeLinecap="round"
         strokeLinejoin="round"
         strokeWidth={2}
         d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
       </svg>
       History
      </Link>
     )}

     <Link
      to="/chat"
      onClick={closeImageDetail}
      className={`flex items-center gap-3 px-3 py-2 transition-colors ${
       location.pathname.startsWith('/chat')
        ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white'
      }`}
     >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
       />
      </svg>
      Chat
     </Link>
    </div>

    <div className="mt-8">
     <div className="flex items-center justify-between px-3 mb-2">
      <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
       Portfolios
      </h3>
      <button
       onClick={openCreateModal}
       className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
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
      <div className="px-3 py-2 text-neutral-500 dark:text-neutral-500">Loading...</div>
     ) : portfolios?.length === 0 ? (
      <div className="px-3 py-2 text-neutral-500 dark:text-neutral-500 text-sm">No portfolios yet</div>
     ) : (
      <div className="space-y-1">
       {portfolios?.map((portfolio) => (
        <Link
         key={portfolio.id}
         to={`/portfolio/${portfolio.id}`}
         onClick={closeImageDetail}
         className={`flex items-center gap-3 px-3 py-2 transition-colors ${
          location.pathname === `/portfolio/${portfolio.id}`
           ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
           : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white'
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
         <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-500">{portfolio.image_count}</span>
        </Link>
       ))}
      </div>
     )}
    </div>

    {location.pathname.startsWith('/chat') && (
     <div className="mt-8">
      <div className="flex items-center justify-between px-3 mb-2">
       <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
        Conversations
       </h3>
      </div>
      <ConversationList />
     </div>
    )}
   </nav>
  </aside>
 )
}
