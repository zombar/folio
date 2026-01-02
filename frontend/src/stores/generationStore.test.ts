import { describe, it, expect, beforeEach } from 'vitest'
import { useGenerationStore } from './generationStore'

const DEFAULT_NEGATIVE_PROMPT = 'cartoon, anime, illustration, painting, drawing, deformed, ugly, mutated hands, poorly drawn face, extra fingers, extra limbs, watermark, signature, blurry'

describe('generationStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGenerationStore.getState().reset()
  })

  it('should have default values', () => {
    const state = useGenerationStore.getState()

    expect(state.prompt).toBe('')
    expect(state.negativePrompt).toBe(DEFAULT_NEGATIVE_PROMPT)
    expect(state.width).toBe(1024)
    expect(state.height).toBe(1024)
    expect(state.steps).toBe(30)
    expect(state.cfgScale).toBe(5.5)
    expect(state.sampler).toBe('dpmpp_2m')
    expect(state.scheduler).toBe('karras')
    expect(state.seed).toBeNull()
  })

  it('should set prompt', () => {
    const { setPrompt } = useGenerationStore.getState()

    setPrompt('a beautiful sunset')
    expect(useGenerationStore.getState().prompt).toBe('a beautiful sunset')
  })

  it('should set negative prompt', () => {
    const { setNegativePrompt } = useGenerationStore.getState()

    setNegativePrompt('blurry, low quality')
    expect(useGenerationStore.getState().negativePrompt).toBe('blurry, low quality')
  })

  it('should set dimensions', () => {
    const { setWidth, setHeight } = useGenerationStore.getState()

    setWidth(512)
    setHeight(768)
    expect(useGenerationStore.getState().width).toBe(512)
    expect(useGenerationStore.getState().height).toBe(768)
  })

  it('should set steps and cfg scale', () => {
    const { setSteps, setCfgScale } = useGenerationStore.getState()

    setSteps(50)
    setCfgScale(10.5)
    expect(useGenerationStore.getState().steps).toBe(50)
    expect(useGenerationStore.getState().cfgScale).toBe(10.5)
  })

  it('should reset prompt fields but preserve settings', () => {
    const { setPrompt, setNegativePrompt, setWidth, setSeed, reset } = useGenerationStore.getState()

    setPrompt('test prompt')
    setNegativePrompt('test negative')
    setWidth(512)
    setSeed(12345)
    reset()

    // Prompt fields should be cleared (negative prompt resets to default)
    expect(useGenerationStore.getState().prompt).toBe('')
    expect(useGenerationStore.getState().negativePrompt).toBe(DEFAULT_NEGATIVE_PROMPT)
    expect(useGenerationStore.getState().seed).toBeNull()
    // Settings should be preserved
    expect(useGenerationStore.getState().width).toBe(512)
  })

  it('should get params for generation', () => {
    const { setPrompt, setNegativePrompt, setWidth, getParams } = useGenerationStore.getState()

    setPrompt('a beautiful sunset')
    setNegativePrompt('ugly')
    setWidth(512)

    const params = getParams('portfolio-123')

    expect(params.portfolio_id).toBe('portfolio-123')
    expect(params.prompt).toBe('a beautiful sunset')
    expect(params.negative_prompt).toBe('ugly')
    expect(params.width).toBe(512)
  })
})
