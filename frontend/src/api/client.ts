import axios from 'axios'
import type { Portfolio, Generation, GenerationParams, ModelInfo, WorkflowTemplate, WorkflowCreate, WorkflowUpdate } from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Portfolio API
export const portfolioApi = {
  list: async (): Promise<Portfolio[]> => {
    const response = await api.get('/portfolios')
    return response.data
  },

  get: async (id: string): Promise<Portfolio> => {
    const response = await api.get(`/portfolios/${id}`)
    return response.data
  },

  create: async (data: { name: string; description?: string }): Promise<Portfolio> => {
    const response = await api.post('/portfolios', data)
    return response.data
  },

  update: async (id: string, data: Partial<Portfolio>): Promise<Portfolio> => {
    const response = await api.put(`/portfolios/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/portfolios/${id}`)
  },
}

// Generation API
export const generationApi = {
  list: async (portfolioId?: string): Promise<Generation[]> => {
    const params = portfolioId ? { portfolio_id: portfolioId } : {}
    const response = await api.get('/generations', { params })
    return response.data
  },

  get: async (id: string): Promise<Generation> => {
    const response = await api.get(`/generations/${id}`)
    return response.data
  },

  create: async (params: GenerationParams): Promise<Generation> => {
    const response = await api.post('/generations', params)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/generations/${id}`)
  },

  iterate: async (id: string): Promise<Generation> => {
    const response = await api.post(`/generations/${id}/iterate`)
    return response.data
  },
}

// Image URLs
export const getImageUrl = (path: string | null): string | null => {
  if (!path) return null
  // In development, images are served from the backend
  return `/api/images/${path.split('/').pop()?.replace('.webp', '')}`
}

export const getThumbnailUrl = (path: string | null): string | null => {
  if (!path) return null
  const id = path.split('/').pop()?.replace('_thumb.webp', '')
  return `/api/images/${id}/thumbnail`
}

// Model API
export const modelApi = {
  list: async (modelType?: 'checkpoint' | 'lora'): Promise<ModelInfo[]> => {
    const params = modelType ? { model_type: modelType } : {}
    const response = await api.get('/models', { params })
    return response.data
  },
}

// Workflow API
export const workflowApi = {
  list: async (category?: string): Promise<WorkflowTemplate[]> => {
    const params = category ? { category } : {}
    const response = await api.get('/workflows', { params })
    return response.data
  },

  get: async (id: string): Promise<WorkflowTemplate> => {
    const response = await api.get(`/workflows/${id}`)
    return response.data
  },

  create: async (data: WorkflowCreate): Promise<WorkflowTemplate> => {
    const response = await api.post('/workflows', data)
    return response.data
  },

  update: async (id: string, data: WorkflowUpdate): Promise<WorkflowTemplate> => {
    const response = await api.put(`/workflows/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workflows/${id}`)
  },
}
