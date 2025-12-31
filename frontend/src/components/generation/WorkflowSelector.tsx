import { useWorkflows } from '../../hooks/useWorkflows'

interface WorkflowSelectorProps {
  value: string | null
  onChange: (workflowId: string | null) => void
}

export default function WorkflowSelector({ value, onChange }: WorkflowSelectorProps) {
  const { data: workflows, isLoading, error } = useWorkflows()

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Workflow
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
        disabled={isLoading}
      >
        <option value="">
          {isLoading ? 'Loading...' : 'Default workflow'}
        </option>
        {workflows?.map((workflow) => (
          <option key={workflow.id} value={workflow.id}>
            {workflow.name}
            {workflow.category && ` (${workflow.category})`}
            {workflow.is_builtin && ' [Built-in]'}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">Failed to load workflows</p>
      )}
    </div>
  )
}
