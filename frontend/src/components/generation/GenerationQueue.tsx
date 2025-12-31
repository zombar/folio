import type { Generation } from '../../types'
import { Spinner } from '../ui'

interface GenerationQueueProps {
  generations: Generation[]
}

export default function GenerationQueue({ generations }: GenerationQueueProps) {
  const pending = generations.filter((g) => g.status === 'pending' || g.status === 'processing')

  if (pending.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-40">
      <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-700">
        <h3 className="text-sm font-medium text-white">
          Generation Queue ({pending.length})
        </h3>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {pending.map((gen) => (
          <div key={gen.id} className="px-4 py-3 border-b border-slate-700/50 last:border-0">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {gen.status === 'processing' ? (
                  <Spinner size="sm" className="text-violet-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-slate-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300 truncate">{gen.prompt}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {gen.status === 'processing'
                    ? `Processing... ${gen.progress}%`
                    : 'Waiting...'}
                </p>
              </div>
            </div>
            {gen.status === 'processing' && (
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all duration-300"
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
