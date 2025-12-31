import type { SvgIconComponent } from '@mui/icons-material'
import { Icon } from './Icon'
import { Tooltip } from './Tooltip'
import BrushIcon from '@mui/icons-material/Brush'

interface ToolbarButton {
  id: string
  icon: SvgIconComponent
  tooltip: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  variant?: 'default' | 'primary' | 'danger' | 'success'
  testId?: string
}

interface ToolbarDivider {
  type: 'divider'
}

interface ToolbarBrushSize {
  type: 'brush-size'
  value: number
  onChange: (size: number) => void
  disabled?: boolean
}

type ToolbarItem = ToolbarButton | ToolbarDivider | ToolbarBrushSize

interface ImageToolbarProps {
  items: ToolbarItem[]
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  className?: string
}

const BRUSH_SIZES = [
  { value: 10, label: 'S' },
  { value: 25, label: 'M' },
  { value: 50, label: 'L' },
  { value: 100, label: 'XL' },
]

function isDivider(item: ToolbarItem): item is ToolbarDivider {
  return 'type' in item && item.type === 'divider'
}

function isBrushSize(item: ToolbarItem): item is ToolbarBrushSize {
  return 'type' in item && item.type === 'brush-size'
}

export function ImageToolbar({ items, position = 'top-right', className = '' }: ImageToolbarProps) {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  }

  const tooltipPosition = position.startsWith('top-') ? 'bottom' : 'top'

  return (
    <div
      className={`absolute ${positionClasses[position]} flex items-center gap-1
                  bg-neutral-900/60 backdrop-blur-sm rounded-lg p-1.5 z-10 ${className}`}
    >
      {items.map((item, index) => {
        if (isDivider(item)) {
          return (
            <div
              key={`divider-${index}`}
              className="w-px h-5 bg-white/20 mx-1"
            />
          )
        }

        if (isBrushSize(item)) {
          return (
            <div key={`brush-${index}`} className="flex items-center gap-1 px-1">
              <Icon icon={BrushIcon} size="sm" className="text-white/60" />
              {BRUSH_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => item.onChange(size.value)}
                  disabled={item.disabled}
                  className={`px-2 py-0.5 text-xs font-medium rounded transition
                    ${item.value === size.value
                      ? 'bg-white/30 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                  data-testid={`brush-size-${size.label.toLowerCase()}`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          )
        }

        const button = item as ToolbarButton
        const variantClasses = {
          default: 'text-white/70 hover:text-white hover:bg-white/10',
          primary: 'text-neutral-300 hover:text-white hover:bg-neutral-700/50',
          danger: 'text-red-400 hover:text-red-300 hover:bg-red-500/20',
          success: 'text-green-400 hover:text-green-300 hover:bg-green-500/20',
        }

        return (
          <Tooltip key={button.id} content={button.tooltip} position={tooltipPosition}>
            <button
              onClick={button.onClick}
              disabled={button.disabled}
              className={`p-1.5 rounded transition
                ${button.active ? 'bg-white/20 text-white' : variantClasses[button.variant || 'default']}
                disabled:opacity-50 disabled:cursor-not-allowed`}
              data-testid={button.testId}
            >
              <Icon icon={button.icon} size="sm" />
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}

export default ImageToolbar
