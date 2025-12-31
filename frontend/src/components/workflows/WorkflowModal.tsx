import { useState, useEffect } from 'react'
import { Modal, Button, Input, Textarea } from '../ui'
import type { WorkflowTemplate, WorkflowCreate, WorkflowUpdate } from '../../types'

interface WorkflowModalProps {
 isOpen: boolean
 onClose: () => void
 onSubmit: (data: WorkflowCreate | WorkflowUpdate) => void
 workflow?: WorkflowTemplate | null
 isLoading?: boolean
}

export default function WorkflowModal({
 isOpen,
 onClose,
 onSubmit,
 workflow,
 isLoading,
}: WorkflowModalProps) {
 const [name, setName] = useState('')
 const [description, setDescription] = useState('')
 const [category, setCategory] = useState('')
 const [workflowJson, setWorkflowJson] = useState('')
 const [jsonError, setJsonError] = useState<string | null>(null)

 const isEditing = !!workflow

 useEffect(() => {
  if (workflow) {
   setName(workflow.name)
   setDescription(workflow.description || '')
   setCategory(workflow.category || '')
   setWorkflowJson(JSON.stringify(workflow.workflow_json, null, 2))
  } else {
   setName('')
   setDescription('')
   setCategory('')
   setWorkflowJson('')
  }
  setJsonError(null)
 }, [workflow, isOpen])

 const validateJson = (json: string): Record<string, unknown> | null => {
  try {
   const parsed = JSON.parse(json)
   if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    setJsonError('Workflow must be a JSON object')
    return null
   }
   setJsonError(null)
   return parsed
  } catch {
   setJsonError('Invalid JSON format')
   return null
  }
 }

 const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()

  const parsedJson = validateJson(workflowJson)
  if (!parsedJson) return

  if (isEditing) {
   const update: WorkflowUpdate = {}
   if (name !== workflow!.name) update.name = name
   if (description !== (workflow!.description || '')) update.description = description
   if (category !== (workflow!.category || '')) update.category = category || undefined
   if (workflowJson !== JSON.stringify(workflow!.workflow_json, null, 2)) {
    update.workflow_json = parsedJson
   }
   onSubmit(update)
  } else {
   onSubmit({
    name,
    description: description || undefined,
    category: category || undefined,
    workflow_json: parsedJson,
   })
  }
 }

 const handleClose = () => {
  setName('')
  setDescription('')
  setCategory('')
  setWorkflowJson('')
  setJsonError(null)
  onClose()
 }

 return (
  <Modal
   isOpen={isOpen}
   onClose={handleClose}
   title={isEditing ? 'Edit Workflow' : 'Add Workflow'}
   size="lg"
  >
   <form onSubmit={handleSubmit} className="space-y-4">
    <Input
     label="Name"
     value={name}
     onChange={(e) => setName(e.target.value)}
     placeholder="My Workflow"
     required
    />

    <Textarea
     label="Description (optional)"
     value={description}
     onChange={(e) => setDescription(e.target.value)}
     placeholder="What does this workflow do?"
     rows={2}
    />

    <Input
     label="Category (optional)"
     value={category}
     onChange={(e) => setCategory(e.target.value)}
     placeholder="txt2img, img2img, inpaint..."
    />

    <div>
     <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
      Workflow JSON
     </label>
     <textarea
      value={workflowJson}
      onChange={(e) => {
       setWorkflowJson(e.target.value)
       if (jsonError) validateJson(e.target.value)
      }}
      onBlur={() => validateJson(workflowJson)}
      placeholder="Paste your ComfyUI workflow JSON here..."
      rows={10}
      className={`w-full bg-white dark:bg-neutral-800 border px-4 py-2 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500 ${
       jsonError ? 'border-neutral-500 dark:border-neutral-400' : 'border-neutral-300 dark:border-neutral-700'
      }`}
      required
     />
     {jsonError && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{jsonError}</p>}
     <p className="mt-1 text-xs text-neutral-500">
      Export a workflow from ComfyUI (Save API format) and paste it here
     </p>
    </div>

    <div className="flex justify-end gap-3 pt-2">
     <Button type="button" variant="ghost" onClick={handleClose}>
      Cancel
     </Button>
     <Button type="submit" loading={isLoading} disabled={!name || !workflowJson}>
      {isEditing ? 'Save Changes' : 'Add Workflow'}
     </Button>
    </div>
   </form>
  </Modal>
 )
}
