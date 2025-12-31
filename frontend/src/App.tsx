import { Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import HomePage from './pages/HomePage'
import PortfolioPage from './pages/PortfolioPage'
import GeneratePage from './pages/GeneratePage'

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/portfolio/:id" element={<PortfolioPage />} />
        <Route path="/generate" element={<GeneratePage />} />
      </Routes>
    </MainLayout>
  )
}

export default App
