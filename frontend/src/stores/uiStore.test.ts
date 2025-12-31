import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from './uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      sidebarOpen: true,
      selectedPortfolioId: null,
      createPortfolioModalOpen: false,
      imageDetailId: null,
    })
  })

  it('should toggle sidebar', () => {
    const { toggleSidebar } = useUIStore.getState()

    expect(useUIStore.getState().sidebarOpen).toBe(true)
    toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(false)
    toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(true)
  })

  it('should set sidebar open state', () => {
    const { setSidebarOpen } = useUIStore.getState()

    setSidebarOpen(false)
    expect(useUIStore.getState().sidebarOpen).toBe(false)
    setSidebarOpen(true)
    expect(useUIStore.getState().sidebarOpen).toBe(true)
  })

  it('should select portfolio', () => {
    const { selectPortfolio } = useUIStore.getState()

    selectPortfolio('portfolio-123')
    expect(useUIStore.getState().selectedPortfolioId).toBe('portfolio-123')
    selectPortfolio(null)
    expect(useUIStore.getState().selectedPortfolioId).toBeNull()
  })

  it('should open and close create portfolio modal', () => {
    const { openCreatePortfolioModal, closeCreatePortfolioModal } = useUIStore.getState()

    expect(useUIStore.getState().createPortfolioModalOpen).toBe(false)
    openCreatePortfolioModal()
    expect(useUIStore.getState().createPortfolioModalOpen).toBe(true)
    closeCreatePortfolioModal()
    expect(useUIStore.getState().createPortfolioModalOpen).toBe(false)
  })

  it('should open and close image detail', () => {
    const { openImageDetail, closeImageDetail } = useUIStore.getState()

    expect(useUIStore.getState().imageDetailId).toBeNull()
    openImageDetail('image-456')
    expect(useUIStore.getState().imageDetailId).toBe('image-456')
    closeImageDetail()
    expect(useUIStore.getState().imageDetailId).toBeNull()
  })
})
