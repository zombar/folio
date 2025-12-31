import type { Generation } from '../../types'
import { Spinner } from '../ui'

interface ImageCardProps {
 generation: Generation
 onClick?: () => void
 onDelete?: (e: React.MouseEvent) => void
}

export default function ImageCard({ generation, onClick, onDelete }: ImageCardProps) {
 const getThumbnailUrl = (id: string) => `/api/images/${id}/thumbnail`

 return (
  <div
   onClick={onClick}
   className="relative aspect-square bg-neutral-100 dark:bg-neutral-800 overflow-hidden group cursor-pointer hover:ring-2 hover:ring-neutral-400 dark:hover:ring-neutral-500 transition-all"
  >
   {/* Delete button */}
   {onDelete && (
    <button
     onClick={(e) => {
      e.stopPropagation()
      onDelete(e)
     }}
     className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center bg-black/60 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
     title="Delete"
    >
     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
     </svg>
    </button>
   )}
   {generation.status === 'completed' && generation.thumbnail_path ? (
    <img
     src={getThumbnailUrl(generation.id)}
     alt={generation.prompt}
     className="w-full h-full object-cover"
     loading="lazy"
    />
   ) : generation.status === 'processing' ? (
    <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-800">
     <Spinner size="md" className="text-neutral-500 mb-2" />
     <span className="text-sm text-neutral-500 dark:text-neutral-400">{generation.progress}%</span>
    </div>
   ) : generation.status === 'failed' ? (
    <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
     <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
       strokeLinecap="round"
       strokeLinejoin="round"
       strokeWidth={2}
       d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
     </svg>
     <span className="text-xs">Failed</span>
    </div>
   ) : (
    <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
     <Spinner size="sm" className="text-neutral-400" />
    </div>
   )}

   {/* Hover overlay */}
   {generation.status === 'completed' && (
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
     <p className="text-sm text-white line-clamp-2">{generation.prompt}</p>
    </div>
   )}

   {/* Status badge for non-completed */}
   {generation.status === 'pending' && (
    <div className="absolute top-2 right-2 px-2 py-1 bg-neutral-200/80 dark:bg-neutral-700/80 text-xs text-neutral-700 dark:text-neutral-300">
     Queued
    </div>
   )}
  </div>
 )
}
