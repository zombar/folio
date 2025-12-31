import { useState } from 'react'
import { Button } from '../ui'
import { useGeneration, useIterateGeneration, useDeleteGeneration } from '../../hooks/useGenerations'

interface ImageDetailProps {
  generationId: string
  onClose: () => void
}

export default function ImageDetail({ generationId, onClose }: ImageDetailProps) {
  const { data: generation, isLoading } = useGeneration(generationId)
  const iterateGeneration = useIterateGeneration()
  const deleteGeneration = useDeleteGeneration()
  const [copied, setCopied] = useState(false)

  if (isLoading || !generation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
      </div>
    )
  }

  const getImageUrl = (id: string) => `/api/images/${id}`

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(generation.prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = getImageUrl(generation.id)
    link.download = `${generation.id}.webp`
    link.click()
  }

  const handleIterate = async () => {
    await iterateGeneration.mutateAsync(generation.id)
    onClose()
  }

  const handleDelete = async () => {
    if (confirm('Delete this image?')) {
      await deleteGeneration.mutateAsync(generation.id)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/95" onClick={onClose}>
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white z-10"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center p-8" onClick={(e) => e.stopPropagation()}>
        {generation.status === 'completed' ? (
          <img
            src={getImageUrl(generation.id)}
            alt={generation.prompt}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        ) : (
          <div className="text-slate-400">Image not available</div>
        )}
      </div>

      {/* Sidebar */}
      <div
        className="w-80 bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">Details</h2>

        {/* Prompt */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">Prompt</span>
            <button
              onClick={handleCopyPrompt}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-sm text-slate-300">{generation.prompt}</p>
        </div>

        {/* Negative prompt */}
        {generation.negative_prompt && (
          <div className="mb-4">
            <span className="text-sm font-medium text-slate-400 block mb-2">Negative Prompt</span>
            <p className="text-sm text-slate-300">{generation.negative_prompt}</p>
          </div>
        )}

        {/* Parameters */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Size</span>
            <span className="text-slate-300">{generation.width} x {generation.height}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Seed</span>
            <span className="text-slate-300 font-mono">{generation.seed}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Steps</span>
            <span className="text-slate-300">{generation.steps}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">CFG Scale</span>
            <span className="text-slate-300">{generation.cfg_scale}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Sampler</span>
            <span className="text-slate-300">{generation.sampler}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={handleIterate}
            loading={iterateGeneration.isPending}
            className="w-full"
          >
            Generate Variation
          </Button>
          <Button onClick={handleDownload} variant="secondary" className="w-full">
            Download
          </Button>
          <Button
            onClick={handleDelete}
            variant="danger"
            loading={deleteGeneration.isPending}
            className="w-full"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}
