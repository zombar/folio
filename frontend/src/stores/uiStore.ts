import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  selectedPortfolioId: string | null
  createPortfolioModalOpen: boolean
  imageDetailId: string | null

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  selectPortfolio: (id: string | null) => void
  openCreatePortfolioModal: () => void
  closeCreatePortfolioModal: () => void
  openImageDetail: (id: string) => void
  closeImageDetail: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedPortfolioId: null,
  createPortfolioModalOpen: false,
  imageDetailId: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  selectPortfolio: (id) => set({ selectedPortfolioId: id }),
  openCreatePortfolioModal: () => set({ createPortfolioModalOpen: true }),
  closeCreatePortfolioModal: () => set({ createPortfolioModalOpen: false }),
  openImageDetail: (id) => set({ imageDetailId: id }),
  closeImageDetail: () => set({ imageDetailId: null }),
}))
