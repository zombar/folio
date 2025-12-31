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

  it('should animate when processing', () => {
    const { container } = render(<QueueIndicator pendingCount={0} processingCount={1} />)
    const indicator = container.querySelector('.animate-pulse')
    expect(indicator).toBeInTheDocument()
  })
})
