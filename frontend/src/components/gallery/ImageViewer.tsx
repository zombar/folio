import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteIcon from '@mui/icons-material/Delete'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import PhotoSizeSelectLargeIcon from '@mui/icons-material/PhotoSizeSelectLarge'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import ClearIcon from '@mui/icons-material/Clear'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import { TransformViewport, ImageToolbar, ViewportPanel, Input, Spinner } from '../ui'
import type { TransformViewportHandle } from '../ui'
import { useGeneration, useGenerations, useDeleteGeneration, useCreateGeneration } from '../../hooks/useGenerations'
import { useGenerationStore } from '../../stores/generationStore'
import type { GenerationParams } from '../../types'

interface ImageViewerProps {
  generationId: string
  onClose: () => void
}

type ActivePanel = 'none' | 'inpaint' | 'upscale' | 'outpaint'

const UPSCALE_MODELS = [
  { value: '4x-UltraSharp.pth', label: '4x UltraSharp' },
  { value: 'RealESRGAN_x4plus.pth', label: 'RealESRGAN 4x' },
  { value: 'RealESRGAN_x2plus.pth', label: 'RealESRGAN 2x' },
]

export default function ImageViewer({ generationId, onClose }: ImageViewerProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: generation, isLoading } = useGeneration(generationId)
  const deleteGeneration = useDeleteGeneration()
  const createGeneration = useCreateGeneration()
  const loadFromGeneration = useGenerationStore((state) => state.loadFromGeneration)

  // Get all generations for navigation
  const { data: allGenerations } = useGenerations(generation?.portfolio_id)

  // Calculate navigation indices - only show completed images
  const completedGenerations = useMemo(
    () => allGenerations?.filter(g => g.status === 'completed') || [],
    [allGenerations]
  )
  const currentIndex = completedGenerations.findIndex(g => g.id === generationId)
  const totalImages = completedGenerations.length

  const handlePrev = useCallback(() => {
    if (currentIndex > 0 && generation) {
      const prevGeneration = completedGenerations[currentIndex - 1]
      navigate(`/portfolio/${generation.portfolio_id}/image/${prevGeneration.id}`, { replace: true })
    }
  }, [currentIndex, completedGenerations, generation, navigate])

  const handleNext = useCallback(() => {
    if (currentIndex < totalImages - 1 && generation) {
      const nextGeneration = completedGenerations[currentIndex + 1]
      navigate(`/portfolio/${generation.portfolio_id}/image/${nextGeneration.id}`, { replace: true })
    }
  }, [currentIndex, totalImages, completedGenerations, generation, navigate])

  const viewportRef = useRef<TransformViewportHandle>(null)
  const [activePanel, setActivePanel] = useState<ActivePanel>('none')

  // Inpaint state
  const [brushSize, setBrushSize] = useState(25)
  const [hasMask, setHasMask] = useState(false)
  const [inpaintPrompt, setInpaintPrompt] = useState('')
  const [denoisingStrength, setDenoisingStrength] = useState(0.85)

  // Upscale state
  const [upscaleFactor, setUpscaleFactor] = useState(2)
  const [upscaleModel, setUpscaleModel] = useState('4x-UltraSharp.pth')
  const [sharpenAmount, setSharpenAmount] = useState(0)

  // Outpaint state
  const [outpaintLeft, setOutpaintLeft] = useState(0)
  const [outpaintRight, setOutpaintRight] = useState(0)
  const [outpaintTop, setOutpaintTop] = useState(0)
  const [outpaintBottom, setOutpaintBottom] = useState(0)
  const [outpaintPrompt, setOutpaintPrompt] = useState('')

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize prompts from generation
  useEffect(() => {
    if (generation) {
      setInpaintPrompt(generation.prompt)
      setOutpaintPrompt(generation.prompt)
    }
  }, [generation])

  const getImageUrl = (id: string) => `/api/images/${id}`

  const handleDownload = useCallback(() => {
    if (!generation) return
    const link = document.createElement('a')
    link.href = getImageUrl(generation.id)
    link.download = `${generation.id}.webp`
    link.click()
  }, [generation])

  const handleIterate = useCallback(() => {
    if (!generation) return
    loadFromGeneration(generation)
    onClose()
    navigate(`/generate?portfolio=${generation.portfolio_id}`)
  }, [generation, loadFromGeneration, onClose, navigate])

  const handleDelete = useCallback(async () => {
    if (!generation) return
    if (confirm('Delete this image?')) {
      await deleteGeneration.mutateAsync(generation.id)
      onClose()
    }
  }, [generation, deleteGeneration, onClose])

  const handleClearMask = useCallback(() => {
    viewportRef.current?.clearMask()
    setHasMask(false)
  }, [])

  const handleSubmitInpaint = useCallback(async () => {
    if (!generation || !hasMask) return
    const maskBase64 = viewportRef.current?.getMaskBase64()
    if (!maskBase64) return

    setIsSubmitting(true)
    try {
      const params: GenerationParams = {
        portfolio_id: generation.portfolio_id,
        prompt: inpaintPrompt,
        negative_prompt: generation.negative_prompt || undefined,
        generation_type: 'inpaint',
        source_generation_id: generation.id,
        mask_image_base64: maskBase64,
        denoising_strength: denoisingStrength,
        grow_mask_by: 6,
        steps: generation.steps,
        cfg_scale: generation.cfg_scale,
        sampler: generation.sampler,
        model_filename: generation.model_filename || undefined,
      }
      await createGeneration.mutateAsync(params)
      queryClient.invalidateQueries({ queryKey: ['generations'] })
      setActivePanel('none')
      handleClearMask()
    } finally {
      setIsSubmitting(false)
    }
  }, [generation, hasMask, inpaintPrompt, denoisingStrength, createGeneration, queryClient, handleClearMask])

  const handleSubmitUpscale = useCallback(async () => {
    if (!generation) return

    setIsSubmitting(true)
    try {
      const params: GenerationParams = {
        portfolio_id: generation.portfolio_id,
        prompt: generation.prompt,
        generation_type: 'upscale',
        source_generation_id: generation.id,
        upscale_factor: upscaleFactor,
        upscale_model: upscaleModel,
        sharpen_amount: sharpenAmount,
      }
      await createGeneration.mutateAsync(params)
      queryClient.invalidateQueries({ queryKey: ['generations'] })
      setActivePanel('none')
    } finally {
      setIsSubmitting(false)
    }
  }, [generation, upscaleFactor, upscaleModel, sharpenAmount, createGeneration, queryClient])

  const handleSubmitOutpaint = useCallback(async () => {
    if (!generation) return
    if (outpaintLeft === 0 && outpaintRight === 0 && outpaintTop === 0 && outpaintBottom === 0) return

    setIsSubmitting(true)
    try {
      const params: GenerationParams = {
        portfolio_id: generation.portfolio_id,
        prompt: outpaintPrompt,
        negative_prompt: generation.negative_prompt || undefined,
        generation_type: 'outpaint',
        source_generation_id: generation.id,
        outpaint_left: outpaintLeft,
        outpaint_right: outpaintRight,
        outpaint_top: outpaintTop,
        outpaint_bottom: outpaintBottom,
        outpaint_feather: 80,
        denoising_strength: 0.95,
        steps: generation.steps,
        cfg_scale: generation.cfg_scale,
        sampler: generation.sampler,
        model_filename: generation.model_filename || undefined,
      }
      await createGeneration.mutateAsync(params)
      queryClient.invalidateQueries({ queryKey: ['generations'] })
      setActivePanel('none')
    } finally {
      setIsSubmitting(false)
    }
  }, [generation, outpaintPrompt, outpaintLeft, outpaintRight, outpaintTop, outpaintBottom, createGeneration, queryClient])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'Escape') {
        if (activePanel !== 'none') {
          setActivePanel('none')
          if (activePanel === 'inpaint') handleClearMask()
        } else {
          onClose()
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePanel, onClose, handleClearMask, handlePrev, handleNext])

  if (isLoading || !generation) {
    return (
      <div className="relative w-full h-[calc(100vh-6.5rem)] min-h-[400px] bg-neutral-200 dark:bg-neutral-950 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const isCompleted = generation.status === 'completed'

  // Build toolbar items based on active panel
  const getToolbarItems = () => {
    if (activePanel === 'inpaint') {
      return [
        { type: 'brush-size' as const, value: brushSize, onChange: setBrushSize },
        { type: 'divider' as const },
        {
          id: 'clear-mask',
          icon: ClearIcon,
          tooltip: 'Clear mask',
          onClick: handleClearMask,
          disabled: !hasMask,
        },
      ]
    }

    return [
      {
        id: 'delete',
        icon: DeleteIcon,
        tooltip: 'Delete',
        onClick: handleDelete,
        variant: 'default' as const,
      },
      { type: 'divider' as const },
      {
        id: 'inpaint',
        icon: AutoFixHighIcon,
        tooltip: 'Touch-up (Inpaint)',
        onClick: () => setActivePanel('inpaint'),
        disabled: !isCompleted,
      },
      {
        id: 'upscale',
        icon: PhotoSizeSelectLargeIcon,
        tooltip: 'Upscale',
        onClick: () => setActivePanel('upscale'),
        disabled: !isCompleted,
      },
      {
        id: 'outpaint',
        icon: OpenInFullIcon,
        tooltip: 'Extend (Outpaint)',
        onClick: () => setActivePanel('outpaint'),
        disabled: !isCompleted,
      },
      { type: 'divider' as const },
      {
        id: 'iterate',
        icon: AutorenewIcon,
        tooltip: 'Generate Variation',
        onClick: handleIterate,
        disabled: !isCompleted,
      },
      {
        id: 'download',
        icon: DownloadIcon,
        tooltip: 'Download',
        onClick: handleDownload,
        disabled: !isCompleted,
      },
      { type: 'divider' as const },
      {
        id: 'close',
        icon: CloseIcon,
        tooltip: 'Close',
        onClick: onClose,
      },
    ]
  }

  return (
    <div className="relative w-full h-[calc(100vh-6.5rem)] min-h-[400px] bg-neutral-200 dark:bg-neutral-950 overflow-hidden">
      {/* Edge fade vignette - light mode (dark edges) */}
      <div
        className="absolute inset-0 pointer-events-none z-20 dark:hidden"
        style={{
          boxShadow: 'inset 0 0 100px 20px rgba(0, 0, 0, 0.045)',
        }}
      />
      {/* Edge fade vignette - dark mode (light edges) */}
      <div
        className="absolute inset-0 pointer-events-none z-20 hidden dark:block"
        style={{
          boxShadow: 'inset 0 0 100px 20px rgba(255, 255, 255, 0.045)',
        }}
      />

      {/* Main viewport */}
      <div className="w-full h-full">
        {isCompleted ? (
          <TransformViewport
            ref={viewportRef}
            contentWidth={generation.width}
            contentHeight={generation.height}
            className="w-full h-full"
            showZoomControls
            showNavigation={totalImages > 1}
            onPrev={handlePrev}
            onNext={handleNext}
            currentIndex={currentIndex}
            totalItems={totalImages}
            maskMode={activePanel === 'inpaint'}
            brushSize={brushSize}
            onMaskChange={setHasMask}
            toolbar={<ImageToolbar items={getToolbarItems()} position="top-right" />}
          >
            <img
              src={getImageUrl(generation.id)}
              alt={generation.prompt}
              style={{ width: generation.width, height: generation.height }}
              draggable={false}
              onLoad={() => viewportRef.current?.fitToContainer()}
            />
          </TransformViewport>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400">
            {generation.status === 'processing' ? 'Processing...' : 'Image not available'}
          </div>
        )}

        {/* Inpaint Panel */}
        {activePanel === 'inpaint' && (
          <ViewportPanel
            title="Touch-up"
            icon={AutoFixHighIcon}
            position="bottom"
            onClose={() => { setActivePanel('none'); handleClearMask() }}
            primaryAction={{
              label: 'Apply',
              onClick: handleSubmitInpaint,
              loading: isSubmitting,
              disabled: !hasMask,
            }}
            secondaryAction={{ label: 'Cancel', onClick: () => { setActivePanel('none'); handleClearMask() } }}
          >
            <div className="space-y-3">
              <p className="text-xs text-neutral-400">
                Paint over the areas you want to regenerate
              </p>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Prompt</label>
                <Input
                  value={inpaintPrompt}
                  onChange={(e) => setInpaintPrompt(e.target.value)}
                  placeholder="Describe what should appear..."
                  className="w-full text-sm bg-neutral-800 border-neutral-700"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Denoising Strength: {denoisingStrength.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.05"
                  value={denoisingStrength}
                  onChange={(e) => setDenoisingStrength(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </ViewportPanel>
        )}

        {/* Upscale Panel */}
        {activePanel === 'upscale' && (
          <ViewportPanel
            title="Upscale"
            icon={PhotoSizeSelectLargeIcon}
            position="bottom"
            onClose={() => setActivePanel('none')}
            primaryAction={{
              label: 'Upscale',
              onClick: handleSubmitUpscale,
              loading: isSubmitting,
            }}
            secondaryAction={{ label: 'Cancel', onClick: () => setActivePanel('none') }}
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-2">Scale Factor</label>
                <div className="flex gap-2">
                  {[2, 3, 4].map((factor) => (
                    <button
                      key={factor}
                      onClick={() => setUpscaleFactor(factor)}
                      className={`px-4 py-2 rounded text-sm font-medium transition
                        ${upscaleFactor === factor
                          ? 'bg-white text-neutral-900'
                          : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                        }`}
                    >
                      {factor}x
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Output: {generation.width * upscaleFactor} x {generation.height * upscaleFactor}
                </p>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Model</label>
                <select
                  value={upscaleModel}
                  onChange={(e) => setUpscaleModel(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-white"
                >
                  {UPSCALE_MODELS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Sharpening: {sharpenAmount.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={sharpenAmount}
                  onChange={(e) => setSharpenAmount(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </ViewportPanel>
        )}

        {/* Outpaint Panel */}
        {activePanel === 'outpaint' && (
          <ViewportPanel
            title="Extend"
            icon={OpenInFullIcon}
            position="bottom"
            onClose={() => setActivePanel('none')}
            primaryAction={{
              label: 'Extend',
              onClick: handleSubmitOutpaint,
              loading: isSubmitting,
              disabled: outpaintLeft === 0 && outpaintRight === 0 && outpaintTop === 0 && outpaintBottom === 0,
            }}
            secondaryAction={{ label: 'Cancel', onClick: () => setActivePanel('none') }}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 items-center">
                <div />
                <div>
                  <label className="block text-xs text-neutral-400 mb-1 text-center">Top</label>
                  <Input
                    type="number"
                    value={outpaintTop}
                    onChange={(e) => setOutpaintTop(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-sm text-center bg-neutral-800 border-neutral-700"
                    min="0"
                    step="64"
                  />
                </div>
                <div />
                <div>
                  <label className="block text-xs text-neutral-400 mb-1 text-center">Left</label>
                  <Input
                    type="number"
                    value={outpaintLeft}
                    onChange={(e) => setOutpaintLeft(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-sm text-center bg-neutral-800 border-neutral-700"
                    min="0"
                    step="64"
                  />
                </div>
                <div className="flex items-center justify-center text-xs text-neutral-500">
                  {generation.width} x {generation.height}
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1 text-center">Right</label>
                  <Input
                    type="number"
                    value={outpaintRight}
                    onChange={(e) => setOutpaintRight(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-sm text-center bg-neutral-800 border-neutral-700"
                    min="0"
                    step="64"
                  />
                </div>
                <div />
                <div>
                  <label className="block text-xs text-neutral-400 mb-1 text-center">Bottom</label>
                  <Input
                    type="number"
                    value={outpaintBottom}
                    onChange={(e) => setOutpaintBottom(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-sm text-center bg-neutral-800 border-neutral-700"
                    min="0"
                    step="64"
                  />
                </div>
                <div />
              </div>
              <p className="text-xs text-neutral-500 text-center">
                New size: {generation.width + outpaintLeft + outpaintRight} x {generation.height + outpaintTop + outpaintBottom}
              </p>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Prompt</label>
                <Input
                  value={outpaintPrompt}
                  onChange={(e) => setOutpaintPrompt(e.target.value)}
                  placeholder="Describe the extended areas..."
                  className="w-full text-sm bg-neutral-800 border-neutral-700"
                />
              </div>
            </div>
          </ViewportPanel>
        )}
      </div>
    </div>
  )
}

export { ImageViewer }
