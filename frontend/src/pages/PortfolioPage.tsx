import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { usePortfolio, useDeletePortfolio, useUpdatePortfolio } from '../hooks/usePortfolios'
import { useGenerations, useDeleteGeneration } from '../hooks/useGenerations'
import { useUIStore } from '../stores/uiStore'
import { ImageGrid, ImageViewer } from '../components/gallery'
import { Button, Spinner } from '../components/ui'

export default function PortfolioPage() {
 const { id, imageId } = useParams<{ id: string; imageId?: string }>()
 const navigate = useNavigate()
 const { data: portfolio, isLoading: portfolioLoading } = usePortfolio(id!)
 const { data: generations, isLoading: generationsLoading } = useGenerations(id)
 const deletePortfolio = useDeletePortfolio()
 const deleteGeneration = useDeleteGeneration()
 const updatePortfolio = useUpdatePortfolio()
 const imageDetailId = useUIStore((state) => state.imageDetailId)
 const openImageDetail = useUIStore((state) => state.openImageDetail)
 const closeImageDetail = useUIStore((state) => state.closeImageDetail)
 const [isEditing, setIsEditing] = useState(false)

 // Handle direct image link - open viewer when imageId is in URL
 useEffect(() => {
  if (imageId) {
   openImageDetail(imageId)
  }
 }, [imageId, openImageDetail])

 const handleCloseImageViewer = () => {
  closeImageDetail()
  navigate(`/portfolio/${id}`, { replace: true })
 }

 // Custom handler for opening image - navigates to image URL
 const handleImageClick = (generationId: string) => {
  navigate(`/portfolio/${id}/image/${generationId}`)
 }
 const [editName, setEditName] = useState('')
 const [editDescription, setEditDescription] = useState('')

 const handleDelete = async () => {
  if (confirm(`Delete "${portfolio?.name}"? This will also delete all images in this portfolio.`)) {
   await deletePortfolio.mutateAsync(id!)
   navigate('/')
  }
 }

 const handleImageDelete = async (generationId: string) => {
  await deleteGeneration.mutateAsync(generationId)
 }

 const handleSetCover = async (generationId: string) => {
  await updatePortfolio.mutateAsync({
   id: id!,
   data: { cover_image_id: generationId }
  })
 }

 const handleStartEdit = () => {
  setEditName(portfolio?.name || '')
  setEditDescription(portfolio?.description || '')
  setIsEditing(true)
 }

 const handleSaveEdit = async () => {
  await updatePortfolio.mutateAsync({
   id: id!,
   data: { name: editName, description: editDescription || undefined }
  })
  setIsEditing(false)
 }

 const handleCancelEdit = () => {
  setIsEditing(false)
 }

 if (portfolioLoading) {
  return (
   <div className="flex items-center justify-center h-64">
    <Spinner size="lg" className="text-neutral-500" />
   </div>
  )
 }

 if (!portfolio) {
  return (
   <div className="text-center py-16">
    <h2 className="text-lg font-medium text-neutral-700 dark:text-neutral-300 mb-2">Portfolio not found</h2>
    <Link to="/" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 underline">
     Back to home
    </Link>
   </div>
  )
 }

 return (
  <div>
   <div className="flex items-start justify-between mb-6">
    <div className="flex-1 mr-4">
     {isEditing ? (
      <div className="space-y-2">
       <input
        type="text"
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        className="w-full text-2xl font-bold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 px-2 py-1 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-500"
        placeholder="Portfolio name"
       />
       <input
        type="text"
        value={editDescription}
        onChange={(e) => setEditDescription(e.target.value)}
        className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 px-2 py-1 text-neutral-500 dark:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500"
        placeholder="Description (optional)"
       />
       <div className="flex gap-2">
        <Button size="sm" onClick={handleSaveEdit} loading={updatePortfolio.isPending}>Save</Button>
        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
       </div>
      </div>
     ) : (
      <div className="group">
       <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{portfolio.name}</h1>
        <button
         onClick={handleStartEdit}
         className="p-1 opacity-0 group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-opacity"
         title="Edit portfolio"
        >
         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
         </svg>
        </button>
       </div>
       {portfolio.description && (
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">{portfolio.description}</p>
       )}
      </div>
     )}
    </div>
    <div className="flex gap-2">
     <Button
      variant="ghost"
      onClick={handleDelete}
      loading={deletePortfolio.isPending}
     >
      Delete
     </Button>
     <Link to={`/generate?portfolio=${id}`}>
      <Button>Generate</Button>
     </Link>
    </div>
   </div>

   {imageDetailId ? (
    <ImageViewer generationId={imageDetailId} onClose={handleCloseImageViewer} />
   ) : generationsLoading ? (
    <div className="flex items-center justify-center h-64">
     <Spinner size="lg" className="text-neutral-500" />
    </div>
   ) : generations?.length === 0 ? (
    <div className="text-center py-16">
     <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
      <svg className="w-8 h-8 text-neutral-400 dark:text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
       />
      </svg>
     </div>
     <h2 className="text-lg font-medium text-neutral-700 dark:text-neutral-300 mb-2">No images yet</h2>
     <p className="text-neutral-500 mb-4">Generate your first image in this portfolio</p>
     <Link to={`/generate?portfolio=${id}`}>
      <Button>Generate Image</Button>
     </Link>
    </div>
   ) : (
    <ImageGrid
     generations={generations}
     onImageClick={handleImageClick}
     onImageDelete={handleImageDelete}
     onSetCover={handleSetCover}
     coverImageId={portfolio.cover_image_id}
    />
   )}
  </div>
 )
}
