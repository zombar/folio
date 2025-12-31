import type { Generation } from '../../types'
import { Spinner } from '../ui'

interface ImageCardProps {
 generation: Generation
 onClick?: () => void
 onDelete?: (e: React.MouseEvent) => void
 onSetCover?: (e: React.MouseEvent) => void
 isCover?: boolean
}

export default function ImageCard({ generation, onClick, onDelete, onSetCover, isCover }: ImageCardProps) {
 const getThumbnailUrl = (id: string) => `/api/images/${id}/thumbnail`

 return (
  <div
   onClick={onClick}
   className="relative aspect-square bg-neutral-100 dark:bg-neutral-800 overflow-hidden group cursor-pointer hover:ring-2 hover:ring-neutral-400 dark:hover:ring-neutral-500 transition-all"
  >
   {/* Star/Cover button */}
   {onSetCover && (
    <button
     onClick={(e) => {
      e.stopPropagation()
      onSetCover(e)
     }}
     className={`absolute top-1 left-1 z-10 w-6 h-6 flex items-center justify-center rounded-full transition-opacity ${
      isCover
       ? 'bg-yellow-500 text-white opacity-100'
       : 'bg-black/60 hover:bg-yellow-500 text-white opacity-0 group-hover:opacity-100'
     }`}
     title={isCover ? 'Cover image' : 'Set as cover'}
    >
     <svg className="w-4 h-4" fill={isCover ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
     </svg>
    </button>
   )}

   {/* Delete button */}
   {onDelete && (
    <button
     onClick={(e) => {
      e.stopPropagation()
      // Skip confirmation for pending/failed images
      if (generation.status === 'pending' || generation.status === 'failed') {
       onDelete(e)
      } else if (confirm('Delete this image?')) {
       onDelete(e)
      }
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
    <div
     className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
     title={generation.error_message || 'Generation failed'}
    >
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

  </div>
 )
}
