import type { Generation } from '../../types'
import { Spinner } from '../ui'

interface ImageCardProps {
  generation: Generation
  onClick?: () => void
}

export default function ImageCard({ generation, onClick }: ImageCardProps) {
  const getThumbnailUrl = (id: string) => `/api/images/${id}/thumbnail`

  return (
    <div
      onClick={onClick}
      className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden group cursor-pointer hover:ring-2 hover:ring-gray-400 dark:hover:ring-gray-500 transition-all"
    >
      {generation.status === 'completed' && generation.thumbnail_path ? (
        <img
          src={getThumbnailUrl(generation.id)}
          alt={generation.prompt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : generation.status === 'processing' ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800">
          <Spinner size="md" className="text-gray-500 mb-2" />
          <span className="text-sm text-gray-500 dark:text-gray-400">{generation.progress}%</span>
        </div>
      ) : generation.status === 'failed' ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
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
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <Spinner size="sm" className="text-gray-400" />
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
        <div className="absolute top-2 right-2 px-2 py-1 bg-gray-200/80 dark:bg-gray-700/80 rounded text-xs text-gray-700 dark:text-gray-300">
          Queued
        </div>
      )}
    </div>
  )
}
