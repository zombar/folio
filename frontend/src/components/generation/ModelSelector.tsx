import { useModels } from '../../hooks/useModels'

interface ModelSelectorProps {
  label: string
  modelType: 'checkpoint' | 'lora'
  value: string | null
  onChange: (filename: string | null) => void
  optional?: boolean
}

function formatFileSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(0)} MB`
}

export default function ModelSelector({
  label,
  modelType,
  value,
  onChange,
  optional = false,
}: ModelSelectorProps) {
  const { data: models, isLoading, error } = useModels(modelType)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
        disabled={isLoading}
      >
        {optional ? (
          <option value="">None</option>
        ) : (
          <option value="">
            {isLoading ? 'Loading...' : `Select a ${modelType}`}
          </option>
        )}
        {models?.map((model) => (
          <option key={model.path} value={model.filename}>
            {model.filename} ({formatFileSize(model.size)})
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">Failed to load models</p>
      )}
      {!isLoading && models?.length === 0 && (
        <p className="mt-1 text-sm text-gray-500">
          No {modelType}s found. Add models to ./models/{modelType === 'checkpoint' ? 'checkpoints' : 'loras'}/
        </p>
      )}
    </div>
  )
}
