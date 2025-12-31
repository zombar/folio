import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface SSEEvent {
  type: string
  data: Record<string, unknown>
}

interface UseSSEOptions {
  onEvent?: (event: SSEEvent) => void
  enabled?: boolean
}

export function useSSE(options: UseSSEOptions = {}) {
  const { onEvent, enabled = true } = options
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)

  const handleEvent = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        const sseEvent: SSEEvent = {
          type: event.type,
          data,
        }

        // Invalidate relevant queries based on event type
        if (event.type.startsWith('generation.')) {
          queryClient.invalidateQueries({ queryKey: ['generations'] })
          if (data.id) {
            queryClient.invalidateQueries({ queryKey: ['generation', data.id] })
          }
        }

        if (event.type.startsWith('portfolio.')) {
          queryClient.invalidateQueries({ queryKey: ['portfolios'] })
        }

        onEvent?.(sseEvent)
      } catch (e) {
        console.error('Failed to parse SSE event:', e)
      }
    },
    [queryClient, onEvent]
  )

  useEffect(() => {
    if (!enabled) return

    const eventSource = new EventSource('/api/events/stream')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('SSE connection opened')
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      // EventSource will automatically reconnect
    }

    // Listen for specific event types
    const eventTypes = [
      'connected',
      'ping',
      'generation.created',
      'generation.processing',
      'generation.completed',
      'generation.failed',
    ]

    eventTypes.forEach((type) => {
      eventSource.addEventListener(type, handleEvent)
    })

    return () => {
      eventTypes.forEach((type) => {
        eventSource.removeEventListener(type, handleEvent)
      })
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [enabled, handleEvent])

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
  }
}
