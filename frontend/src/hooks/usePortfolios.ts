import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portfolioApi } from '../api/client'

export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: portfolioApi.list,
  })
}

export function usePortfolio(id: string) {
  return useQuery({
    queryKey: ['portfolio', id],
    queryFn: () => portfolioApi.get(id),
    enabled: !!id,
  })
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: portfolioApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
    },
  })
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof portfolioApi.update>[1] }) =>
      portfolioApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio', id] })
    },
  })
}

export function useDeletePortfolio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: portfolioApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      queryClient.invalidateQueries({ queryKey: ['generations'] })
    },
  })
}
