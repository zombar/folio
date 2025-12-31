import type { WorkflowTemplate } from '../../types'

interface WorkflowCardProps {
  workflow: WorkflowTemplate
  onEdit?: () => void
  onDelete?: () => void
}

export default function WorkflowCard({ workflow, onEdit, onDelete }: WorkflowCardProps) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 hover:ring-2 hover:ring-neutral-400 dark:hover:ring-neutral-500 transition-all shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-neutral-900 dark:text-white">{workflow.name}</h3>
        <div className="flex gap-1">
          {workflow.is_builtin && (
            <span className="px-2 py-0.5 text-xs bg-neutral-800 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded">
              Built-in
            </span>
          )}
          {workflow.category && (
            <span className="px-2 py-0.5 text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded">
              {workflow.category}
            </span>
          )}
        </div>
      </div>

      {workflow.description && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3 line-clamp-2">
          {workflow.description}
        </p>
      )}

      {!workflow.is_builtin && (
        <div className="flex gap-2 mt-3">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
