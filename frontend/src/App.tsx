import { Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import HomePage from './pages/HomePage'
import PortfolioPage from './pages/PortfolioPage'
import GeneratePage from './pages/GeneratePage'
import WorkflowsPage from './pages/WorkflowsPage'
import HistoryPage from './pages/HistoryPage'
import ChatPage from './pages/ChatPage'
import { CreatePortfolioModal } from './components/portfolio'

function App() {
 return (
  <MainLayout>
   <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/portfolio/:id" element={<PortfolioPage />} />
    <Route path="/portfolio/:id/image/:imageId" element={<PortfolioPage />} />
    <Route path="/generate" element={<GeneratePage />} />
    <Route path="/workflows" element={<WorkflowsPage />} />
    <Route path="/history" element={<HistoryPage />} />
    <Route path="/chat" element={<ChatPage />} />
    <Route path="/chat/:id" element={<ChatPage />} />
   </Routes>

   {/* Global modals */}
   <CreatePortfolioModal />
  </MainLayout>
 )
}

export default App
