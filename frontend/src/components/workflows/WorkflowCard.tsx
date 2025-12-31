import type { WorkflowTemplate } from '../../types'

interface WorkflowCardProps {
  workflow: WorkflowTemplate
  onEdit?: () => void
  onDelete?: () => void
}

export default function WorkflowCard({ workflow, onEdit, onDelete }: WorkflowCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 hover:ring-2 hover:ring-gray-400 dark:hover:ring-gray-500 transition-all shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">{workflow.name}</h3>
        <div className="flex gap-1">
          {workflow.is_builtin && (
            <span className="px-2 py-0.5 text-xs bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 rounded">
              Built-in
            </span>
          )}
          {workflow.category && (
            <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
              {workflow.category}
            </span>
          )}
        </div>
      </div>

      {workflow.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
          {workflow.description}
        </p>
      )}

      {!workflow.is_builtin && (
        <div className="flex gap-2 mt-3">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
