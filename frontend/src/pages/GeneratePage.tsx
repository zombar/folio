import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { usePortfolios } from '../hooks/usePortfolios'
import { useCreateGeneration } from '../hooks/useGenerations'
import { useGenerationStore } from '../stores/generationStore'

export default function GeneratePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const preselectedPortfolio = searchParams.get('portfolio')

  const { data: portfolios } = usePortfolios()
  const createGeneration = useCreateGeneration()

  const [selectedPortfolio, setSelectedPortfolio] = useState(preselectedPortfolio || '')

  const {
    prompt,
    negativePrompt,
    width,
    height,
    steps,
    cfgScale,
    setPrompt,
    setNegativePrompt,
    setWidth,
    setHeight,
    setSteps,
    setCfgScale,
    getParams,
  } = useGenerationStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPortfolio || !prompt.trim()) return

    try {
      await createGeneration.mutateAsync(getParams(selectedPortfolio))
      navigate(`/portfolio/${selectedPortfolio}`)
    } catch (error) {
      console.error('Failed to create generation:', error)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Generate Image</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Portfolio selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Portfolio
          </label>
          <select
            value={selectedPortfolio}
            onChange={(e) => setSelectedPortfolio(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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

        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[100px]"
            required
          />
        </div>

        {/* Negative prompt */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Negative Prompt (optional)
          </label>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="What to avoid in the image..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Width
            </label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              min={256}
              max={2048}
              step={64}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Height
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              min={256}
              max={2048}
              step={64}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Steps
            </label>
            <input
              type="number"
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              min={1}
              max={100}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              CFG Scale
            </label>
            <input
              type="number"
              value={cfgScale}
              onChange={(e) => setCfgScale(Number(e.target.value))}
              min={1}
              max={20}
              step={0.5}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={createGeneration.isPending || !selectedPortfolio || !prompt.trim()}
          className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {createGeneration.isPending ? 'Generating...' : 'Generate'}
        </button>
      </form>
    </div>
  )
}
