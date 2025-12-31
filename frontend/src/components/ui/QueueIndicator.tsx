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

  // Calculate sparkline dimensions - show up to 25 dots in a compact space
  const maxDots = 25
  const displayCount = Math.min(total, maxDots)

  return (
    <div
      className="flex items-center gap-2 px-2 py-1"
      title={title}
    >
      {/* Sparkline - grid of small squares */}
      <div className="flex flex-wrap gap-px max-w-[60px]" style={{ width: `${Math.min(displayCount, 5) * 8}px` }}>
        {Array.from({ length: displayCount }).map((_, i) => {
          const isProcessing = i < processingCount
          return (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-sm transition-colors ${
                isProcessing
                  ? 'bg-neutral-700 dark:bg-neutral-200 animate-pulse'
                  : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            />
          )
        })}
      </div>
      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 tabular-nums">
        {total}
      </span>
    </div>
  )
}
