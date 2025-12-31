import { create } from 'zustand'

type Theme = 'light' | 'dark'

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('theme') as Theme | null
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface UIState {
  sidebarOpen: boolean
  selectedPortfolioId: string | null
  createPortfolioModalOpen: boolean
  imageDetailId: string | null
  theme: Theme

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  selectPortfolio: (id: string | null) => void
  openCreatePortfolioModal: () => void
  closeCreatePortfolioModal: () => void
  openImageDetail: (id: string) => void
  closeImageDetail: () => void
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedPortfolioId: null,
  createPortfolioModalOpen: false,
  imageDetailId: null,
  theme: getInitialTheme(),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  selectPortfolio: (id) => set({ selectedPortfolioId: id }),
  openCreatePortfolioModal: () => set({ createPortfolioModalOpen: true }),
  closeCreatePortfolioModal: () => set({ createPortfolioModalOpen: false }),
  openImageDetail: (id) => set({ imageDetailId: id }),
  closeImageDetail: () => set({ imageDetailId: null }),
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', newTheme)
    return { theme: newTheme }
  }),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    set({ theme })
  },
}))
