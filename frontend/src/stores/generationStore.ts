import { create } from 'zustand'
import type { GenerationParams } from '../types'

interface GenerationState {
  prompt: string
  negativePrompt: string
  width: number
  height: number
  steps: number
  cfgScale: number
  sampler: string
  seed: number | null

  setPrompt: (prompt: string) => void
  setNegativePrompt: (prompt: string) => void
  setWidth: (width: number) => void
  setHeight: (height: number) => void
  setSteps: (steps: number) => void
  setCfgScale: (cfg: number) => void
  setSampler: (sampler: string) => void
  setSeed: (seed: number | null) => void
  reset: () => void
  getParams: (portfolioId: string) => GenerationParams
}

const initialState = {
  prompt: '',
  negativePrompt: '',
  width: 1024,
  height: 1024,
  steps: 30,
  cfgScale: 7.0,
  sampler: 'euler',
  seed: null as number | null,
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  ...initialState,

  setPrompt: (prompt) => set({ prompt }),
  setNegativePrompt: (prompt) => set({ negativePrompt: prompt }),
  setWidth: (width) => set({ width }),
  setHeight: (height) => set({ height }),
  setSteps: (steps) => set({ steps }),
  setCfgScale: (cfgScale) => set({ cfgScale }),
  setSampler: (sampler) => set({ sampler }),
  setSeed: (seed) => set({ seed }),
  reset: () => set(initialState),

  getParams: (portfolioId: string): GenerationParams => {
    const state = get()
    return {
      portfolio_id: portfolioId,
      prompt: state.prompt,
      negative_prompt: state.negativePrompt || undefined,
      width: state.width,
      height: state.height,
      steps: state.steps,
      cfg_scale: state.cfgScale,
      sampler: state.sampler,
      seed: state.seed ?? undefined,
    }
  },
}))
