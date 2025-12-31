import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { usePortfolios } from '../hooks/usePortfolios'
import { useCreateGeneration } from '../hooks/useGenerations'
import { useGenerationStore } from '../stores/generationStore'
import { PromptInput, ParameterControls, ModelSelector, WorkflowSelector } from '../components/generation'
import { Button } from '../components/ui'

export default function GeneratePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const preselectedPortfolio = searchParams.get('portfolio')

  const { data: portfolios } = usePortfolios()
  const createGeneration = useCreateGeneration()

  const [selectedPortfolio, setSelectedPortfolio] = useState(preselectedPortfolio || '')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const prompt = useGenerationStore((state) => state.prompt)
  const getParams = useGenerationStore((state) => state.getParams)
  const reset = useGenerationStore((state) => state.reset)
  const workflowId = useGenerationStore((state) => state.workflowId)
  const modelFilename = useGenerationStore((state) => state.modelFilename)
  const loraFilename = useGenerationStore((state) => state.loraFilename)
  const setWorkflowId = useGenerationStore((state) => state.setWorkflowId)
  const setModelFilename = useGenerationStore((state) => state.setModelFilename)
  const setLoraFilename = useGenerationStore((state) => state.setLoraFilename)

  // Update selected portfolio when preselected changes
  useEffect(() => {
    if (preselectedPortfolio) {
      setSelectedPortfolio(preselectedPortfolio)
    }
  }, [preselectedPortfolio])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPortfolio || !prompt.trim()) return

    try {
      await createGeneration.mutateAsync(getParams(selectedPortfolio))
      reset()
      navigate(`/portfolio/${selectedPortfolio}`)
    } catch (error) {
      console.error('Failed to create generation:', error)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-white">Generate Image</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Portfolio selection */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Portfolio
          </label>
          <select
            value={selectedPortfolio}
            onChange={(e) => setSelectedPortfolio(e.target.value)}
            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-500"
            required
          >
            <option value="">Select a portfolio</option>
            {portfolios?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Model selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModelSelector
            label="Checkpoint Model"
            modelType="checkpoint"
            value={modelFilename}
            onChange={setModelFilename}
          />
          <ModelSelector
            label="LoRA (optional)"
            modelType="lora"
            value={loraFilename}
            onChange={setLoraFilename}
            optional
          />
        </div>

        {/* Workflow selection */}
        <WorkflowSelector value={workflowId} onChange={setWorkflowId} />

        {/* Prompt inputs */}
        <PromptInput />

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Advanced Settings
        </button>

        {/* Advanced parameters */}
        {showAdvanced && (
          <div className="p-4 bg-neutral-200/50 dark:bg-neutral-800/50 rounded-lg">
            <ParameterControls />
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          loading={createGeneration.isPending}
          disabled={!selectedPortfolio || !prompt.trim()}
          className="w-full"
        >
          Generate
        </Button>
      </form>
    </div>
  )
}
