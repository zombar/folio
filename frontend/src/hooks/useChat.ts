import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import { chatApi } from '../api/client'
import type { ChatStatus } from '../types'

export function useChatStatus() {
  return useQuery({
    queryKey: ['chat-status'],
    queryFn: chatApi.getStatus,
    refetchInterval: 10000, // Poll every 10s
  })
}

export function useSwitchModel() {
  const queryClient = useQueryClient()
  const abortControllerRef = useRef<AbortController | null>(null)

  const mutate = useCallback(
    async (modelId: string) => {
      // Abort any existing request
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch('/api/chat/model/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_id: modelId }),
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
                const status: ChatStatus = JSON.parse(jsonStr)
                // Update the query cache with each progress update
                queryClient.setQueryData(['chat-status'], status)
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        // Final refresh
        queryClient.invalidateQueries({ queryKey: ['chat-status'] })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Model switch error:', error)
        }
      }
    },
    [queryClient]
  )

  return { mutate, isPending: false }
}

export function useConversations(limit = 10, offset = 0) {
  return useQuery({
    queryKey: ['conversations', limit, offset],
    queryFn: () => chatApi.listConversations(limit, offset),
  })
}

export function useConversationCount() {
  return useQuery({
    queryKey: ['conversations-count'],
    queryFn: chatApi.countConversations,
  })
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => chatApi.getConversation(id!),
    enabled: !!id,
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: chatApi.createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations-count'] })
    },
  })
}

export function useUpdateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Parameters<typeof chatApi.updateConversation>[1]
    }) => chatApi.updateConversation(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversation', id] })
    },
  })
}

export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: chatApi.deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations-count'] })
    },
  })
}
