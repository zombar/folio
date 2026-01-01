import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useChatStore } from '../stores/chatStore'
import type { ChatStreamChunk } from '../types'

export function useChatStream(conversationId: string | null) {
  const queryClient = useQueryClient()
  const abortControllerRef = useRef<AbortController | null>(null)

  const setStreaming = useChatStore((s) => s.setStreaming)
  const appendStreamingContent = useChatStore((s) => s.appendStreamingContent)
  const clearStreamingContent = useChatStore((s) => s.clearStreamingContent)

  const sendMessage = useCallback(
    async (message: string) => {
      if (!conversationId || !message.trim()) return

      // Abort any existing stream
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      clearStreamingContent()
      setStreaming(true)

      try {
        const response = await fetch(`/api/conversations/${conversationId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let reading = true

        while (reading) {
          const { done, value } = await reader.read()
          if (done) {
            reading = false
            continue
          }

          const text = decoder.decode(value)
          const lines = text.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6)
              try {
                const chunk: ChatStreamChunk = JSON.parse(jsonStr)
                if (chunk.content) {
                  appendStreamingContent(chunk.content)
                }
                if (chunk.done) {
                  // Refresh conversation to get saved message
                  queryClient.invalidateQueries({
                    queryKey: ['conversation', conversationId],
                  })
                }
                if (chunk.error) {
                  console.error('Stream error:', chunk.error)
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Chat stream error:', error)
        }
      } finally {
        setStreaming(false)
      }
    },
    [
      conversationId,
      queryClient,
      setStreaming,
      appendStreamingContent,
      clearStreamingContent,
    ]
  )

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
    setStreaming(false)
  }, [setStreaming])

  return { sendMessage, abort }
}
