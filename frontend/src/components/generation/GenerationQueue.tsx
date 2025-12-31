import type { Generation } from '../../types'
import { Spinner } from '../ui'

interface GenerationQueueProps {
 generations: Generation[]
}

export default function GenerationQueue({ generations }: GenerationQueueProps) {
 const pending = generations.filter((g) => g.status === 'pending' || g.status === 'processing')

 if (pending.length === 0) return null

 return (
  <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-neutral-800 shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden z-40">
   <div className="px-4 py-3 bg-neutral-100 dark:bg-neutral-700/50 border-b border-neutral-200 dark:border-neutral-700">
    <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
     Generation Queue ({pending.length})
    </h3>
   </div>
   <div className="max-h-64 overflow-y-auto">
    {pending.map((gen) => (
     <div key={gen.id} className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-700/50 last:border-0">
      <div className="flex items-start gap-3">
       <div className="flex-shrink-0 mt-0.5">
        {gen.status === 'processing' ? (
         <Spinner size="sm" className="text-neutral-500" />
        ) : (
         <div className="w-4 h-4 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        )}
       </div>
       <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate">{gen.prompt}</p>
        <p className="text-xs text-neutral-500 mt-1">
         {gen.status === 'processing'
          ? `Processing... ${gen.progress}%`
          : 'Waiting...'}
        </p>
       </div>
      </div>
      {gen.status === 'processing' && (
       <div className="mt-2 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
         className="h-full bg-neutral-600 dark:bg-neutral-400 transition-all duration-300"
         style={{ width: `${gen.progress}%` }}
        />
       </div>
      )}
     </div>
    ))}
   </div>
  </div>
 )
}
