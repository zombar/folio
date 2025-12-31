import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { generationApi } from '../api/client'
import type { GenerationParams } from '../types'

export function useGenerations(portfolioId?: string) {
  return useQuery({
    queryKey: ['generations', { portfolioId }],
    queryFn: () => generationApi.list(portfolioId),
  })
}

export function useGeneration(id: string) {
  return useQuery({
    queryKey: ['generation', id],
    queryFn: () => generationApi.get(id),
    enabled: !!id,
  })
}

export function useCreateGeneration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: GenerationParams) => generationApi.create(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generations'] })
    },
  })
}

export function useDeleteGeneration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generationApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generations'] })
    },
  })
}

export function useIterateGeneration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generationApi.iterate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generations'] })
    },
  })
}
