export interface Portfolio {
  id: string
  name: string
  description: string | null
  cover_image_id: string | null
  created_at: string
  updated_at: string
  image_count: number
}

export interface Generation {
  id: string
  portfolio_id: string
  prompt: string
  negative_prompt: string | null
  width: number
  height: number
  seed: number | null
  steps: number
  cfg_scale: number
  sampler: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error_message: string | null
  image_path: string | null
  thumbnail_path: string | null
  parent_id: string | null
  created_at: string
  completed_at: string | null
}

export interface GenerationParams {
  portfolio_id: string
  prompt: string
  negative_prompt?: string
  width?: number
  height?: number
  seed?: number
  steps?: number
  cfg_scale?: number
  sampler?: string
}
