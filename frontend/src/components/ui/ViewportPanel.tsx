import type { SvgIconComponent } from '@mui/icons-material'
import CloseIcon from '@mui/icons-material/Close'
import { Icon } from './Icon'
import Button from './Button'

interface ViewportPanelProps {
  title: string
  icon?: SvgIconComponent
  position: 'top' | 'bottom'
  children: React.ReactNode
  primaryAction?: {
    label: string
    onClick: () => void
    loading?: boolean
    disabled?: boolean
    icon?: SvgIconComponent
  }
  secondaryAction?: { label: string; onClick: () => void }
  onClose: () => void
  className?: string
}

export function ViewportPanel({
  title,
  icon: TitleIcon,
  position,
  children,
  primaryAction,
  secondaryAction,
  onClose,
  className = '',
}: ViewportPanelProps) {
  const positionClass = position === 'top' ? 'top-4' : 'bottom-4'

  return (
    <div
      className={`absolute left-4 right-4 ${positionClass} max-w-lg mx-auto z-20
                  bg-neutral-900/80 dark:bg-neutral-950/90 backdrop-blur-sm
                  rounded-lg shadow-xl border border-neutral-700/50 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700/50">
        <div className="flex items-center gap-2 text-white">
          {TitleIcon && <Icon icon={TitleIcon} size="sm" />}
          <span className="font-medium text-sm">{title}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded transition"
          aria-label="Close panel"
        >
          <Icon icon={CloseIcon} size="sm" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {children}
      </div>

      {/* Footer with actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-700/50">
          <div>
            {secondaryAction && (
              <Button
                variant="ghost"
                size="sm"
                onClick={secondaryAction.onClick}
                className="text-neutral-300 hover:text-white"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
          <div>
            {primaryAction && (
              <Button
                variant="primary"
                size="sm"
                onClick={primaryAction.onClick}
                loading={primaryAction.loading}
                disabled={primaryAction.disabled}
                className="bg-neutral-100 dark:bg-neutral-200 text-neutral-900 hover:bg-white"
              >
                {primaryAction.icon && (
                  <Icon icon={primaryAction.icon} size="sm" className="mr-1.5" />
                )}
                {primaryAction.label}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ViewportPanel
