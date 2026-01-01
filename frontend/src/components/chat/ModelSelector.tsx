import { useState, useEffect } from 'react'
import { useChatStatus, useSwitchModel } from '../../hooks/useChat'

const DEFAULT_MODEL = 'llama3.2:1b'

interface ModelSelectorProps {
  currentModel?: string
}

export default function ModelSelector({ currentModel }: ModelSelectorProps) {
  const { data: status } = useChatStatus()
  const switchMutation = useSwitchModel()
  const [modelInput, setModelInput] = useState(DEFAULT_MODEL)

  // Prepopulate with current/last used model
  useEffect(() => {
    const model = currentModel || status?.model_id
    if (model) {
      setModelInput(model)
    }
  }, [currentModel, status?.model_id])

  const isLoading = status?.status === 'loading' || switchMutation.isPending
  const isReady = status?.status === 'ready'
  const displayModel = currentModel || status?.model_id || 'No model loaded'

  const handleLoadModel = () => {
    if (modelInput.trim()) {
      switchMutation.mutate(modelInput.trim())
      setModelInput('')
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isLoading
              ? 'bg-neutral-400 dark:bg-neutral-500 animate-pulse'
              : isReady
                ? 'bg-neutral-600 dark:bg-neutral-300'
                : 'bg-neutral-300 dark:bg-neutral-600'
          }`}
          title={status?.status || 'unknown'}
        />
        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate max-w-48">
          {displayModel}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <input
          type="text"
          value={modelInput}
          onChange={(e) => setModelInput(e.target.value)}
          placeholder={DEFAULT_MODEL}
          disabled={isLoading}
          className="w-40 px-2 py-1 text-xs font-mono bg-transparent border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-neutral-500 dark:focus:border-neutral-400 disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleLoadModel()
          }}
        />
        <button
          onClick={handleLoadModel}
          disabled={isLoading || !modelInput.trim()}
          className="px-2 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Load
        </button>
      </div>
    </div>
  )
}
