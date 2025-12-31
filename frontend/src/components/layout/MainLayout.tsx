import { ReactNode } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import { useUIStore } from '../../stores/uiStore'
import { useSSE } from '../../hooks/useSSE'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)

  // Initialize SSE connection
  useSSE()

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className={`flex-1 overflow-auto transition-all duration-200 ${
            sidebarOpen ? 'ml-64' : 'ml-0'
          }`}
        >
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
