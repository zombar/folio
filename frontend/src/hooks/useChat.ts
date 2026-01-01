import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '../api/client'

export function useChatStatus() {
  return useQuery({
    queryKey: ['chat-status'],
    queryFn: chatApi.getStatus,
    refetchInterval: 10000, // Poll every 10s
  })
}

export function useSwitchModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: chatApi.switchModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-status'] })
    },
  })
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

export function useSetupStatus() {
  return useQuery({
    queryKey: ['chat-setup'],
    queryFn: chatApi.getSetupStatus,
  })
}

export function useSetup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: chatApi.setup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-setup'] })
      queryClient.invalidateQueries({ queryKey: ['chat-status'] })
    },
  })
}
