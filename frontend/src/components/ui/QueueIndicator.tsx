interface QueueIndicatorProps {
  pendingCount: number
  processingCount: number
}

export default function QueueIndicator({ pendingCount, processingCount }: QueueIndicatorProps) {
  const total = pendingCount + processingCount

  if (total === 0) return null

  const titleParts = []
  if (pendingCount > 0) titleParts.push(`${pendingCount} pending`)
  if (processingCount > 0) titleParts.push(`${processingCount} processing`)
  const title = titleParts.join(', ')

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded ${processingCount > 0 ? 'animate-pulse' : ''}`}
      title={title}
    >
      {/* Sparkline bars representing queue */}
      <div className="flex items-end gap-0.5 h-4">
        {Array.from({ length: Math.min(total, 5) }).map((_, i) => (
          <div
            key={i}
            className={`w-1 rounded-sm ${
              i < processingCount
                ? 'bg-neutral-600 dark:bg-neutral-300'
                : 'bg-neutral-300 dark:bg-neutral-600'
            }`}
            style={{ height: `${Math.max(25, Math.min(100, (i + 1) * 20))}%` }}
          />
        ))}
      </div>
      <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-1">{total}</span>
    </div>
  )
}
