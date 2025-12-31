import { useState, useRef, useCallback, useEffect, useLayoutEffect, useImperativeHandle, forwardRef, useMemo } from 'react'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import FitScreenIcon from '@mui/icons-material/FitScreen'
import { Icon } from './Icon'
import { Tooltip } from './Tooltip'

// Theme-aware grid colors
const useGridColors = () => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return useMemo(() => ({
    background: isDark ? 'rgb(23, 23, 23)' : 'rgb(245, 245, 245)',
    majorLine: isDark ? 'rgb(64, 64, 64)' : 'rgb(212, 212, 212)',
    minorLine: isDark ? 'rgb(38, 38, 38)' : 'rgb(229, 229, 229)',
  }), [isDark])
}

export interface TransformViewportHandle {
  clearMask: () => void
  getMaskBase64: () => string | null
}

export interface TransformState {
  scale: number
  translateX: number
  translateY: number
}

interface TransformViewportProps {
  children: React.ReactNode
  contentWidth: number
  contentHeight: number
  minScale?: number
  maxScale?: number
  className?: string
  showNavigation?: boolean
  onPrev?: () => void
  onNext?: () => void
  currentIndex?: number
  totalItems?: number
  showZoomControls?: boolean
  actionButtons?: React.ReactNode
  toolbar?: React.ReactNode
  maskMode?: boolean
  brushSize?: number
  onMaskChange?: (hasMask: boolean) => void
  transform?: TransformState
  onTransformChange?: (transform: TransformState) => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export const TransformViewport = forwardRef<TransformViewportHandle, TransformViewportProps>(function TransformViewport({
  children,
  contentWidth,
  contentHeight,
  minScale = 0.25,
  maxScale = 4,
  className = '',
  showNavigation = false,
  onPrev,
  onNext,
  currentIndex,
  totalItems,
  showZoomControls = false,
  actionButtons,
  toolbar,
  maskMode = false,
  brushSize = 25,
  onMaskChange,
  transform: controlledTransform,
  onTransformChange,
}, ref) {
  const gridColors = useGridColors()
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const displayCanvasRef = useRef<HTMLCanvasElement>(null)

  const isControlled = controlledTransform !== undefined
  const [internalScale, setInternalScale] = useState(() => controlledTransform?.scale ?? 1)
  const [internalTranslateX, setInternalTranslateX] = useState(() => controlledTransform?.translateX ?? 0)
  const [internalTranslateY, setInternalTranslateY] = useState(() => controlledTransform?.translateY ?? 0)

  const scale = isControlled ? controlledTransform.scale : internalScale
  const translateX = isControlled ? controlledTransform.translateX : internalTranslateX
  const translateY = isControlled ? controlledTransform.translateY : internalTranslateY

  const updateTransform = useCallback((newScale: number, newTranslateX: number, newTranslateY: number) => {
    if (isControlled) {
      onTransformChange?.({ scale: newScale, translateX: newTranslateX, translateY: newTranslateY })
    } else {
      setInternalScale(newScale)
      setInternalTranslateX(newTranslateX)
      setInternalTranslateY(newTranslateY)
    }
  }, [isControlled, onTransformChange])

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialTranslate, setInitialTranslate] = useState({ x: 0, y: 0 })
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasMask, setHasMask] = useState(false)
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null)
  const [touchStartScale, setTouchStartScale] = useState(1)

  const clampTranslate = useCallback((x: number, y: number, currentScale: number) => {
    const container = containerRef.current
    if (!container) return { x, y }

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    const scaledContentWidth = contentWidth * currentScale
    const scaledContentHeight = contentHeight * currentScale

    let maxX = 0
    let maxY = 0

    if (scaledContentWidth > containerWidth) {
      maxX = (scaledContentWidth - containerWidth) / 2
    }
    if (scaledContentHeight > containerHeight) {
      maxY = (scaledContentHeight - containerHeight) / 2
    }

    return {
      x: clamp(x, -maxX, maxX),
      y: clamp(y, -maxY, maxY),
    }
  }, [contentWidth, contentHeight])

  const fitToContainer = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    const scaleX = containerWidth / contentWidth
    const scaleY = containerHeight / contentHeight
    const fitScale = Math.min(scaleX, scaleY, 1)

    updateTransform(fitScale, 0, 0)
  }, [contentWidth, contentHeight, updateTransform])

  const initialFitDone = useRef(false)

  useLayoutEffect(() => {
    if (isControlled || initialFitDone.current) {
      return
    }
    initialFitDone.current = true
    fitToContainer()
  }, [fitToContainer, isControlled])

  const zoomAtPoint = useCallback((newScale: number, clientX: number, clientY: number) => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const pointX = clientX - rect.left - centerX
    const pointY = clientY - rect.top - centerY

    const scaleRatio = newScale / scale
    const newTranslateX = pointX - (pointX - translateX) * scaleRatio
    const newTranslateY = pointY - (pointY - translateY) * scaleRatio

    const clamped = clampTranslate(newTranslateX, newTranslateY, newScale)

    updateTransform(newScale, clamped.x, clamped.y)
  }, [scale, translateX, translateY, clampTranslate, updateTransform])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()

    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setInitialTranslate({ x: translateX, y: translateY })
  }, [translateX, translateY])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return

    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y

    const clamped = clampTranslate(initialTranslate.x + dx, initialTranslate.y + dy, scale)
    updateTransform(scale, clamped.x, clamped.y)
  }, [isDragging, dragStart, initialTranslate, scale, clampTranslate, updateTransform])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const getTouchDistance = (touches: React.TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const getTouchCenter = (touches: React.TouchList): { x: number; y: number } => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    }
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      setTouchStartDistance(getTouchDistance(e.touches))
      setTouchStartScale(scale)
    } else if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
      setInitialTranslate({ x: translateX, y: translateY })
    }
  }, [scale, translateX, translateY])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistance !== null) {
      e.preventDefault()
      const currentDistance = getTouchDistance(e.touches)
      const scaleFactor = currentDistance / touchStartDistance
      const newScale = clamp(touchStartScale * scaleFactor, minScale, maxScale)

      const center = getTouchCenter(e.touches)
      zoomAtPoint(newScale, center.x, center.y)
    } else if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStart.x
      const dy = e.touches[0].clientY - dragStart.y

      const clamped = clampTranslate(initialTranslate.x + dx, initialTranslate.y + dy, scale)
      updateTransform(scale, clamped.x, clamped.y)
    }
  }, [touchStartDistance, touchStartScale, minScale, maxScale, zoomAtPoint, isDragging, dragStart, initialTranslate, scale, clampTranslate, updateTransform])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    setTouchStartDistance(null)
  }, [])

  const zoomIn = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const newScale = clamp(scale * 1.25, minScale, maxScale)
    zoomAtPoint(newScale, rect.left + rect.width / 2, rect.top + rect.height / 2)
  }, [scale, minScale, maxScale, zoomAtPoint])

  const zoomOut = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const newScale = clamp(scale * 0.8, minScale, maxScale)
    zoomAtPoint(newScale, rect.left + rect.width / 2, rect.top + rect.height / 2)
  }, [scale, minScale, maxScale, zoomAtPoint])

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
      }
      if (isDrawing) {
        setIsDrawing(false)
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isDragging, isDrawing])

  const prevMaskModeRef = useRef(maskMode)

  useEffect(() => {
    const wasEnabled = prevMaskModeRef.current
    prevMaskModeRef.current = maskMode

    if (maskMode && !wasEnabled && maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, contentWidth, contentHeight)
      }
      setTimeout(() => {
        setHasMask(false)
        onMaskChange?.(false)
      }, 0)
    }
  }, [maskMode, contentWidth, contentHeight, onMaskChange])

  useEffect(() => {
    if (!maskMode || !maskCanvasRef.current || !displayCanvasRef.current) return

    const updateDisplay = () => {
      const maskCanvas = maskCanvasRef.current
      const displayCanvas = displayCanvasRef.current
      if (!maskCanvas || !displayCanvas) return

      const maskCtx = maskCanvas.getContext('2d')
      const displayCtx = displayCanvas.getContext('2d')
      if (!maskCtx || !displayCtx) return

      displayCtx.clearRect(0, 0, contentWidth, contentHeight)

      const maskData = maskCtx.getImageData(0, 0, contentWidth, contentHeight)
      const coloredData = displayCtx.createImageData(contentWidth, contentHeight)

      for (let i = 0; i < maskData.data.length; i += 4) {
        if (maskData.data[i + 3] > 0) {
          coloredData.data[i] = 255     // R (Orange highlight)
          coloredData.data[i + 1] = 87  // G
          coloredData.data[i + 2] = 34  // B
          coloredData.data[i + 3] = 180 // A
        }
      }
      displayCtx.putImageData(coloredData, 0, 0)
    }

    const interval = setInterval(updateDisplay, 50)
    return () => clearInterval(interval)
  }, [maskMode, contentWidth, contentHeight])

  const getContentCoordinates = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return { x: 0, y: 0 }

    const contentRect = content.getBoundingClientRect()

    const scaledWidth = contentWidth * scale
    const scaledHeight = contentHeight * scale
    const imageLeft = contentRect.left + (contentRect.width - scaledWidth) / 2
    const imageTop = contentRect.top + (contentRect.height - scaledHeight) / 2

    const contentX = (clientX - imageLeft) / scale
    const contentY = (clientY - imageTop) / scale

    return { x: contentX, y: contentY }
  }, [scale, contentWidth, contentHeight])

  const drawOnMask = useCallback((x: number, y: number) => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return

    const ctx = maskCanvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()

    if (!hasMask) {
      setHasMask(true)
      onMaskChange?.(true)
    }
  }, [brushSize, hasMask, onMaskChange])

  const handleMaskMouseDown = useCallback((e: React.MouseEvent) => {
    if (!maskMode || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    setIsDrawing(true)
    const { x, y } = getContentCoordinates(e.clientX, e.clientY)
    drawOnMask(x, y)
  }, [maskMode, getContentCoordinates, drawOnMask])

  const handleMaskMouseMove = useCallback((e: React.MouseEvent) => {
    if (!maskMode || !isDrawing) return
    e.preventDefault()
    const { x, y } = getContentCoordinates(e.clientX, e.clientY)
    drawOnMask(x, y)
  }, [maskMode, isDrawing, getContentCoordinates, drawOnMask])

  const handleMaskMouseUp = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const clearMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return

    const ctx = maskCanvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, contentWidth, contentHeight)
    setHasMask(false)
    onMaskChange?.(false)
  }, [contentWidth, contentHeight, onMaskChange])

  const getMaskBase64 = useCallback(() => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas || !hasMask) return null

    return maskCanvas.toDataURL('image/png').split(',')[1]
  }, [hasMask])

  useImperativeHandle(ref, () => ({
    clearMask,
    getMaskBase64,
  }), [clearMask, getMaskBase64])

  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateDims = () => {
      setContainerDims({ width: container.clientWidth, height: container.clientHeight })
    }

    updateDims()
    const observer = new ResizeObserver(updateDims)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const scaleRef = useRef(scale)
  const minScaleRef = useRef(minScale)
  const maxScaleRef = useRef(maxScale)
  const zoomAtPointRef = useRef(zoomAtPoint)

  useEffect(() => {
    scaleRef.current = scale
    minScaleRef.current = minScale
    maxScaleRef.current = maxScale
    zoomAtPointRef.current = zoomAtPoint
  }, [scale, minScale, maxScale, zoomAtPoint])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheelZoom = (e: WheelEvent) => {
      e.preventDefault()
      const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100)
      const sensitivity = 0.002
      const zoomFactor = 1 - normalizedDelta * sensitivity
      const newScale = clamp(scaleRef.current * zoomFactor, minScaleRef.current, maxScaleRef.current)
      zoomAtPointRef.current(newScale, e.clientX, e.clientY)
    }

    container.addEventListener('wheel', handleWheelZoom, { passive: false })
    return () => container.removeEventListener('wheel', handleWheelZoom)
  }, [])

  const majorGridSize = 256 * scale
  const minorGridSize = majorGridSize / 5

  const scaledContentWidth = contentWidth * scale
  const scaledContentHeight = contentHeight * scale

  const imageTopRightX = containerDims.width / 2 + translateX + scaledContentWidth / 2
  const imageTopRightY = containerDims.height / 2 + translateY - scaledContentHeight / 2

  const majorGridOffsetX = imageTopRightX % majorGridSize
  const majorGridOffsetY = imageTopRightY % majorGridSize
  const minorGridOffsetX = imageTopRightX % minorGridSize
  const minorGridOffsetY = imageTopRightY % minorGridSize

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        cursor: maskMode ? 'crosshair' : (isDragging ? 'grabbing' : 'grab'),
        backgroundColor: gridColors.background,
        backgroundImage: `
          linear-gradient(${gridColors.majorLine} 1px, transparent 1px),
          linear-gradient(90deg, ${gridColors.majorLine} 1px, transparent 1px),
          linear-gradient(${gridColors.minorLine} 1px, transparent 1px),
          linear-gradient(90deg, ${gridColors.minorLine} 1px, transparent 1px)
        `,
        backgroundSize: `${majorGridSize}px ${majorGridSize}px, ${majorGridSize}px ${majorGridSize}px, ${minorGridSize}px ${minorGridSize}px, ${minorGridSize}px ${minorGridSize}px`,
        backgroundPosition: `${majorGridOffsetX}px ${majorGridOffsetY}px, ${majorGridOffsetX}px ${majorGridOffsetY}px, ${minorGridOffsetX}px ${minorGridOffsetY}px, ${minorGridOffsetX}px ${minorGridOffsetY}px`,
      }}
      onMouseDown={maskMode ? handleMaskMouseDown : handleMouseDown}
      onMouseMove={maskMode ? handleMaskMouseMove : handleMouseMove}
      onMouseUp={maskMode ? handleMaskMouseUp : handleMouseUp}
      onMouseLeave={maskMode ? handleMaskMouseUp : handleMouseUp}
      onTouchStart={maskMode ? undefined : handleTouchStart}
      onTouchMove={maskMode ? undefined : handleTouchMove}
      onTouchEnd={maskMode ? undefined : handleTouchEnd}
    >
      <div
        ref={contentRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isDragging || isDrawing || isControlled ? 'none' : 'transform 0.05s ease-out',
          pointerEvents: 'none',
        }}
      >
        <div className="relative" style={{ pointerEvents: maskMode ? 'none' : 'auto' }}>
          {children}
          {maskMode && (
            <>
              <canvas
                ref={maskCanvasRef}
                width={contentWidth}
                height={contentHeight}
                className="absolute inset-0 opacity-0 pointer-events-none"
                data-testid="mask-canvas"
              />
              <canvas
                ref={displayCanvasRef}
                width={contentWidth}
                height={contentHeight}
                className="absolute inset-0 pointer-events-none rounded-lg"
                style={{ opacity: 0.6 }}
              />
            </>
          )}
        </div>
      </div>

      {showNavigation && onPrev && onNext && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-neutral-900/50 hover:bg-neutral-900/70 text-white rounded-full transition-colors z-10"
            aria-label="Previous image"
          >
            <Icon icon={ChevronLeftIcon} size="lg" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-neutral-900/50 hover:bg-neutral-900/70 text-white rounded-full transition-colors z-10"
            aria-label="Next image"
          >
            <Icon icon={ChevronRightIcon} size="lg" />
          </button>
          {currentIndex !== undefined && totalItems !== undefined && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-neutral-900/50 px-3 py-1 rounded-full text-white text-sm z-10">
              {currentIndex + 1} / {totalItems}
            </div>
          )}
        </>
      )}

      {showZoomControls && (
        <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-neutral-900/80 backdrop-blur-sm p-2 z-10">
          <Tooltip content="Fit to view" position="bottom">
            <button
              onClick={(e) => { e.stopPropagation(); fitToContainer() }}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              <Icon icon={FitScreenIcon} size="md" />
            </button>
          </Tooltip>
          <Tooltip content="Zoom out" position="bottom">
            <button
              onClick={(e) => { e.stopPropagation(); zoomOut() }}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              <Icon icon={ZoomOutIcon} size="md" />
            </button>
          </Tooltip>
          <span className="text-white/70 text-sm px-2 min-w-[3.5rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Tooltip content="Zoom in" position="bottom">
            <button
              onClick={(e) => { e.stopPropagation(); zoomIn() }}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              <Icon icon={ZoomInIcon} size="md" />
            </button>
          </Tooltip>
        </div>
      )}

      {toolbar}

      {!toolbar && actionButtons && (
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          {actionButtons}
        </div>
      )}
    </div>
  )
})

export default TransformViewport
