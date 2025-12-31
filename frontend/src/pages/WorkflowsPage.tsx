import { useState } from 'react'
import { useWorkflows, useCreateWorkflow, useUpdateWorkflow, useDeleteWorkflow } from '../hooks/useWorkflows'
import { WorkflowCard, WorkflowModal } from '../components/workflows'
import { Button, Spinner } from '../components/ui'
import type { WorkflowTemplate, WorkflowCreate, WorkflowUpdate } from '../types'

export default function WorkflowsPage() {
 const [isModalOpen, setIsModalOpen] = useState(false)
 const [editingWorkflow, setEditingWorkflow] = useState<WorkflowTemplate | null>(null)

 const { data: workflows, isLoading } = useWorkflows()
 const createWorkflow = useCreateWorkflow()
 const updateWorkflow = useUpdateWorkflow()
 const deleteWorkflow = useDeleteWorkflow()

 const handleCreate = async (data: WorkflowCreate) => {
  await createWorkflow.mutateAsync(data)
  setIsModalOpen(false)
 }

 const handleUpdate = async (data: WorkflowUpdate) => {
  if (editingWorkflow) {
   await updateWorkflow.mutateAsync({ id: editingWorkflow.id, data })
   setEditingWorkflow(null)
   setIsModalOpen(false)
  }
 }

 const handleDelete = async (id: string) => {
  if (confirm('Are you sure you want to delete this workflow?')) {
   await deleteWorkflow.mutateAsync(id)
  }
 }

 const handleEdit = (workflow: WorkflowTemplate) => {
  setEditingWorkflow(workflow)
  setIsModalOpen(true)
 }

 const handleModalClose = () => {
  setIsModalOpen(false)
  setEditingWorkflow(null)
 }

 const builtinWorkflows = workflows?.filter((w) => w.is_builtin) || []
 const customWorkflows = workflows?.filter((w) => !w.is_builtin) || []

 return (
  <div className="space-y-6">
   <div className="flex justify-between items-center">
    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Workflows</h1>
    <Button onClick={() => setIsModalOpen(true)}>Add Workflow</Button>
   </div>

   {isLoading ? (
    <div className="flex justify-center py-12">
     <Spinner size="lg" />
    </div>
   ) : (
    <>
     {/* Built-in workflows */}
     {builtinWorkflows.length > 0 && (
      <section>
       <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Built-in Templates</h2>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {builtinWorkflows.map((workflow) => (
         <WorkflowCard key={workflow.id} workflow={workflow} />
        ))}
       </div>
      </section>
     )}

     {/* Custom workflows */}
     <section>
      <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Custom Workflows</h2>
      {customWorkflows.length > 0 ? (
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customWorkflows.map((workflow) => (
         <WorkflowCard
          key={workflow.id}
          workflow={workflow}
          onEdit={() => handleEdit(workflow)}
          onDelete={() => handleDelete(workflow.id)}
         />
        ))}
       </div>
      ) : (
       <div className="text-center py-8 text-neutral-500">
        <p>No custom workflows yet.</p>
        <p className="text-sm mt-1">
         Click "Add Workflow" to import a ComfyUI workflow.
        </p>
       </div>
      )}
     </section>

     {/* Tips section */}
     <section className="mt-8 p-4 bg-neutral-200/50 dark:bg-neutral-800/50 ">
      <h3 className="font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Tips</h3>
      <ul className="text-sm text-neutral-500 dark:text-neutral-400 space-y-1 list-disc list-inside">
       <li>Export workflows from ComfyUI using "Save (API Format)" to get the JSON</li>
       <li>Workflows with a CheckpointLoaderSimple node will automatically use your selected model</li>
       <li>Workflows with a LoraLoader node will automatically use your selected LoRA</li>
       <li>Find more workflows at <a href="https://comfyworkflows.com" target="_blank" rel="noopener noreferrer" className="text-neutral-600 dark:text-neutral-400 hover:underline">comfyworkflows.com</a></li>
      </ul>
     </section>
    </>
   )}

   <WorkflowModal
    isOpen={isModalOpen}
    onClose={handleModalClose}
    onSubmit={editingWorkflow ? handleUpdate : handleCreate}
    workflow={editingWorkflow}
    isLoading={createWorkflow.isPending || updateWorkflow.isPending}
   />
  </div>
 )
}
