import { useQuery } from '@tanstack/react-query'
import { modelApi } from '../api/client'

export function useModels(modelType?: 'checkpoint' | 'lora') {
  return useQuery({
    queryKey: ['models', modelType],
    queryFn: () => modelApi.list(modelType),
  })
}

export function useCheckpoints() {
  return useModels('checkpoint')
}

export function useLoras() {
  return useModels('lora')
}
