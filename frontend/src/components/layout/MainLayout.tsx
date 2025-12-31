import { ReactNode, useEffect } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import { useUIStore } from '../../stores/uiStore'
import { useSSE } from '../../hooks/useSSE'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)
  const theme = useUIStore((state) => state.theme)

  // Initialize SSE connection
  useSSE()

  // Apply theme class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 transition-colors">
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
