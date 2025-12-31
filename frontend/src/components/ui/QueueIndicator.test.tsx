import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import QueueIndicator from './QueueIndicator'

describe('QueueIndicator', () => {
  it('should not render when there are no queued items', () => {
    const { container } = render(<QueueIndicator pendingCount={0} processingCount={0} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render when there are pending items', () => {
    render(<QueueIndicator pendingCount={3} processingCount={0} />)
    expect(screen.getByTitle(/3 pending/i)).toBeInTheDocument()
  })

  it('should render when there are processing items', () => {
    render(<QueueIndicator pendingCount={0} processingCount={1} />)
    expect(screen.getByTitle(/1 processing/i)).toBeInTheDocument()
  })

  it('should show total count in title', () => {
    render(<QueueIndicator pendingCount={2} processingCount={1} />)
    expect(screen.getByTitle(/2 pending, 1 processing/i)).toBeInTheDocument()
  })

  it('should animate processing items', () => {
    const { container } = render(<QueueIndicator pendingCount={2} processingCount={1} />)
    const animatedDots = container.querySelectorAll('.animate-pulse')
    expect(animatedDots.length).toBe(1) // Only processing items animate
  })

  it('should display correct number of dots for large queues', () => {
    const { container } = render(<QueueIndicator pendingCount={20} processingCount={5} />)
    const dots = container.querySelectorAll('.w-1\\.5')
    expect(dots.length).toBe(25) // Max 25 dots displayed
  })

  it('should show total count text', () => {
    render(<QueueIndicator pendingCount={10} processingCount={2} />)
    expect(screen.getByText('12')).toBeInTheDocument()
  })
})
