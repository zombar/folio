import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import HomePage from './pages/HomePage'
import PortfolioPage from './pages/PortfolioPage'
import GeneratePage from './pages/GeneratePage'
import WorkflowsPage from './pages/WorkflowsPage'
import HistoryPage from './pages/HistoryPage'
import { CreatePortfolioModal } from './components/portfolio'
import { ImageDetail } from './components/gallery'
import { useUIStore } from './stores/uiStore'

function App() {
 const location = useLocation()
 const navigate = useNavigate()
 const imageDetailId = useUIStore((state) => state.imageDetailId)
 const closeImageDetail = useUIStore((state) => state.closeImageDetail)

 // Check if we're on an image URL route
 const imageUrlMatch = location.pathname.match(/^\/portfolio\/([^/]+)\/image\//)

 const handleCloseImageDetail = () => {
  closeImageDetail()
  // If on image URL, navigate back to portfolio
  if (imageUrlMatch) {
   navigate(`/portfolio/${imageUrlMatch[1]}`, { replace: true })
  }
 }

 return (
  <MainLayout>
   <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/portfolio/:id" element={<PortfolioPage />} />
    <Route path="/portfolio/:id/image/:imageId" element={<PortfolioPage />} />
    <Route path="/generate" element={<GeneratePage />} />
    <Route path="/workflows" element={<WorkflowsPage />} />
    <Route path="/history" element={<HistoryPage />} />
   </Routes>

   {/* Global modals */}
   <CreatePortfolioModal />

   {/* Image detail modal */}
   {imageDetailId && (
    <ImageDetail generationId={imageDetailId} onClose={handleCloseImageDetail} />
   )}
  </MainLayout>
 )
}

export default App
