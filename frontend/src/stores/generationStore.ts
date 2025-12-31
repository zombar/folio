import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Generation, GenerationParams } from '../types'

interface GenerationState {
  prompt: string
  negativePrompt: string
  width: number
  height: number
  steps: number
  cfgScale: number
  sampler: string
  seed: number | null
  workflowId: string | null
  modelFilename: string | null
  loraFilename: string | null
  quantity: number
  parentId: string | null

  setPrompt: (prompt: string) => void
  setNegativePrompt: (prompt: string) => void
  setWidth: (width: number) => void
  setHeight: (height: number) => void
  setSteps: (steps: number) => void
  setCfgScale: (cfg: number) => void
  setSampler: (sampler: string) => void
  setSeed: (seed: number | null) => void
  setWorkflowId: (id: string | null) => void
  setModelFilename: (filename: string | null) => void
  setLoraFilename: (filename: string | null) => void
  setQuantity: (quantity: number) => void
  setParentId: (id: string | null) => void
  loadFromGeneration: (generation: Generation) => void
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
  workflowId: null as string | null,
  modelFilename: null as string | null,
  loraFilename: null as string | null,
  quantity: 1,
  parentId: null as string | null,
}

export const useGenerationStore = create<GenerationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setPrompt: (prompt) => set({ prompt }),
      setNegativePrompt: (prompt) => set({ negativePrompt: prompt }),
      setWidth: (width) => set({ width }),
      setHeight: (height) => set({ height }),
      setSteps: (steps) => set({ steps }),
      setCfgScale: (cfgScale) => set({ cfgScale }),
      setSampler: (sampler) => set({ sampler }),
      setSeed: (seed) => set({ seed }),
      setWorkflowId: (workflowId) => set({ workflowId }),
      setModelFilename: (modelFilename) => set({ modelFilename }),
      setLoraFilename: (loraFilename) => set({ loraFilename }),
      setQuantity: (quantity) => set({ quantity }),
      setParentId: (parentId) => set({ parentId }),
      loadFromGeneration: (generation: Generation) => set({
        prompt: generation.prompt,
        negativePrompt: generation.negative_prompt || '',
        width: generation.width,
        height: generation.height,
        steps: generation.steps,
        cfgScale: generation.cfg_scale,
        sampler: generation.sampler,
        seed: null, // Don't copy seed - let it generate a new one
        workflowId: generation.workflow_id,
        modelFilename: null, // Don't copy model - let user pick a new one
        loraFilename: generation.lora_filename,
        quantity: 1,
        parentId: generation.id,
      }),
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
          workflow_id: state.workflowId ?? undefined,
          model_filename: state.modelFilename ?? undefined,
          lora_filename: state.loraFilename ?? undefined,
          quantity: state.quantity,
        }
      },
    }),
    {
      name: 'generation-store',
      partialize: (state) => ({
        prompt: state.prompt,
        negativePrompt: state.negativePrompt,
        width: state.width,
        height: state.height,
        steps: state.steps,
        cfgScale: state.cfgScale,
        sampler: state.sampler,
        quantity: state.quantity,
        modelFilename: state.modelFilename,
      }),
    }
  )
)
