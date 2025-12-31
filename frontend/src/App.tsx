import { Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import HomePage from './pages/HomePage'
import PortfolioPage from './pages/PortfolioPage'
import GeneratePage from './pages/GeneratePage'
import { CreatePortfolioModal } from './components/portfolio'
import { ImageDetail } from './components/gallery'
import { GenerationQueue } from './components/generation'
import { useUIStore } from './stores/uiStore'
import { useGenerations } from './hooks/useGenerations'

function App() {
  const imageDetailId = useUIStore((state) => state.imageDetailId)
  const closeImageDetail = useUIStore((state) => state.closeImageDetail)
  const { data: generations } = useGenerations()

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/portfolio/:id" element={<PortfolioPage />} />
        <Route path="/generate" element={<GeneratePage />} />
      </Routes>

      {/* Global modals */}
      <CreatePortfolioModal />

      {/* Image detail modal */}
      {imageDetailId && (
        <ImageDetail generationId={imageDetailId} onClose={closeImageDetail} />
      )}

      {/* Generation queue */}
      {generations && <GenerationQueue generations={generations} />}
    </MainLayout>
  )
}

export default App
