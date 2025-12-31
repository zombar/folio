import { Link } from 'react-router-dom'
import { useGenerations } from '../hooks/useGenerations'
import { Spinner } from '../components/ui'
import type { Generation, GenerationType } from '../types'

function StatusBadge({ status }: { status: Generation['status'] }) {
 const styles = {
  pending: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400',
  processing: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-600 dark:text-neutral-200',
  completed: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400',
  failed: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400',
 }

 return (
  <span className={`px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
   {status}
  </span>
 )
}

function TypeBadge({ type }: { type: GenerationType | undefined }) {
 if (!type || type === 'txt2img') return null

 const styles: Record<string, string> = {
  inpaint: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-600 dark:text-neutral-200',
  upscale: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-600 dark:text-neutral-200',
  outpaint: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-600 dark:text-neutral-200',
 }
 const labels: Record<string, string> = {
  inpaint: 'Touch-up',
  upscale: 'Upscale',
  outpaint: 'Extend',
 }

 return (
  <span className={`px-2 py-0.5 text-xs font-medium ${styles[type]}`}>
   {labels[type]}
  </span>
 )
}

export default function HistoryPage() {
 const { data: generations, isLoading: generationsLoading, error: generationsError } = useGenerations()

 if (generationsLoading) {
  return (
   <div className="flex items-center justify-center h-64">
    <Spinner size="lg" className="text-neutral-500" />
   </div>
  )
 }

 if (generationsError) {
  return (
   <div className="text-neutral-700 dark:text-neutral-300 p-4 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600">
    Error loading history: {generationsError.message}
   </div>
  )
 }

 // Sort: processing first, then completed by date, then pending, then failed
 const sortedGenerations = [...(generations ?? [])].sort((a, b) => {
  // Processing items come first
  if (a.status === 'processing' && b.status !== 'processing') return -1
  if (b.status === 'processing' && a.status !== 'processing') return 1
  // Then completed items
  if (a.status === 'completed' && b.status !== 'completed' && b.status !== 'processing') return -1
  if (b.status === 'completed' && a.status !== 'completed' && a.status !== 'processing') return 1
  // Then sort by created_at descending
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
 })

 return (
  <div>
   <div className="flex items-center justify-between mb-6">
    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">History</h1>
   </div>

   {sortedGenerations.length === 0 ? (
    <div className="text-center py-16">
     <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
      <svg className="w-8 h-8 text-neutral-400 dark:text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
       />
      </svg>
     </div>
     <h2 className="text-lg font-medium text-neutral-700 dark:text-neutral-300 mb-2">No generations yet</h2>
     <p className="text-neutral-500 mb-4">Start generating images to see your history here</p>
     <Link
      to="/generate"
      className="inline-flex items-center px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
     >
      Generate Image
     </Link>
    </div>
   ) : (
    <div className="space-y-2">
     {sortedGenerations.map((generation) => (
      <div
       key={generation.id}
       className="flex items-center gap-4 p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
      >
       {/* Thumbnail */}
       <div className="w-12 h-12 flex-shrink-0 bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
        {generation.status === 'completed' && generation.thumbnail_path ? (
         <Link to={`/portfolio/${generation.portfolio_id}/image/${generation.id}`}>
          <img
           src={`/api/images/${generation.id}/thumbnail`}
           alt=""
           className="w-full h-full object-cover"
          />
         </Link>
        ) : generation.status === 'processing' ? (
         <div className="w-full h-full flex items-center justify-center">
          <Spinner size="sm" className="text-neutral-500" />
         </div>
        ) : generation.status === 'pending' ? (
         <div className="w-full h-full flex items-center justify-center">
          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
         </div>
        ) : (
         <div className="w-full h-full flex items-center justify-center">
          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
         </div>
        )}
       </div>

       {/* Content */}
       <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
         <TypeBadge type={generation.generation_type} />
         <StatusBadge status={generation.status} />
         <span className="text-xs text-neutral-400">
          {new Date(generation.created_at).toLocaleString()}
         </span>
        </div>
        <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate">
         {generation.prompt}
        </p>
       </div>

       {/* Links */}
       <div className="flex items-center gap-2 flex-shrink-0">
        <Link
         to={`/portfolio/${generation.portfolio_id}`}
         className="px-3 py-1.5 text-sm font-medium border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        >
         Portfolio
        </Link>
        {generation.status === 'completed' && (
         <Link
          to={`/portfolio/${generation.portfolio_id}/image/${generation.id}`}
          className="px-3 py-1.5 text-sm font-medium border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
         >
          Image
         </Link>
        )}
       </div>
      </div>
     ))}
    </div>
   )}
  </div>
 )
}
