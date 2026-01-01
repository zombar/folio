export interface Portfolio {
  id: string
  name: string
  description: string | null
  cover_image_id: string | null
  created_at: string
  updated_at: string
  image_count: number
}

export type GenerationType = 'txt2img' | 'inpaint' | 'upscale' | 'outpaint' | 'animate'

export interface Generation {
  id: string
  portfolio_id: string
  generation_type: GenerationType
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
  source_generation_id: string | null
  workflow_id: string | null
  model_filename: string | null
  lora_filename: string | null
  // Inpainting fields
  mask_path: string | null
  denoising_strength: number | null
  grow_mask_by: number | null
  // Upscaling fields
  upscale_factor: number | null
  upscale_model: string | null
  sharpen_amount: number | null
  // Outpainting fields
  outpaint_left: number | null
  outpaint_right: number | null
  outpaint_top: number | null
  outpaint_bottom: number | null
  outpaint_feather: number | null
  // Animation fields
  video_path: string | null
  motion_bucket_id: number | null
  fps: number | null
  duration_seconds: number | null
  // Timestamps
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
  workflow_id?: string
  model_filename?: string
  lora_filename?: string
  quantity?: number
  // Generation type
  generation_type?: GenerationType
  source_generation_id?: string
  // Inpainting fields
  mask_image_base64?: string
  denoising_strength?: number
  grow_mask_by?: number
  // Upscaling fields
  upscale_factor?: number
  upscale_model?: string
  sharpen_amount?: number
  // Outpainting fields
  outpaint_left?: number
  outpaint_right?: number
  outpaint_top?: number
  outpaint_bottom?: number
  outpaint_feather?: number
  // Animation fields
  motion_bucket_id?: number
  fps?: number
  duration_seconds?: number
}

export interface ModelInfo {
  filename: string
  path: string
  type: 'checkpoint' | 'lora'
  size: number
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  workflow_json: Record<string, unknown>
  category: string | null
  is_builtin: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowCreate {
  name: string
  description?: string
  workflow_json: Record<string, unknown>
  category?: string
}

export interface WorkflowUpdate {
  name?: string
  description?: string
  workflow_json?: Record<string, unknown>
  category?: string
}
