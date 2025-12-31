import { Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import HomePage from './pages/HomePage'
import PortfolioPage from './pages/PortfolioPage'
import GeneratePage from './pages/GeneratePage'
import WorkflowsPage from './pages/WorkflowsPage'
import { CreatePortfolioModal } from './components/portfolio'
import { ImageDetail } from './components/gallery'
import { useUIStore } from './stores/uiStore'

function App() {
 const imageDetailId = useUIStore((state) => state.imageDetailId)
 const closeImageDetail = useUIStore((state) => state.closeImageDetail)

 return (
  <MainLayout>
   <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/portfolio/:id" element={<PortfolioPage />} />
    <Route path="/generate" element={<GeneratePage />} />
    <Route path="/workflows" element={<WorkflowsPage />} />
   </Routes>

   {/* Global modals */}
   <CreatePortfolioModal />

   {/* Image detail modal */}
   {imageDetailId && (
    <ImageDetail generationId={imageDetailId} onClose={closeImageDetail} />
   )}
  </MainLayout>
 )
}

export default App
