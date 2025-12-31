import { useEffect } from 'react'
import { useWorkflows } from '../../hooks/useWorkflows'

interface WorkflowSelectorProps {
 value: string | null
 onChange: (workflowId: string | null) => void
}

const DEFAULT_WORKFLOW_NAME = 'SDXL Text to Image'

export default function WorkflowSelector({ value, onChange }: WorkflowSelectorProps) {
 const { data: workflows, isLoading, error } = useWorkflows()

 // Auto-select default workflow when workflows load and none is selected
 useEffect(() => {
  if (!value && workflows?.length) {
   const defaultWorkflow = workflows.find(w => w.name === DEFAULT_WORKFLOW_NAME)
   if (defaultWorkflow) {
    onChange(defaultWorkflow.id)
   }
  }
 }, [workflows, value, onChange])

 return (
  <div>
   <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
    Workflow
   </label>
   <select
    value={value || ''}
    onChange={(e) => onChange(e.target.value || null)}
    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-500"
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
    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Failed to load workflows</p>
   )}
  </div>
 )
}
