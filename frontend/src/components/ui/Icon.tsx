import type { SvgIconComponent } from '@mui/icons-material'

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface IconProps {
  icon: SvgIconComponent
  size?: IconSize
  className?: string
}

const sizePx: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
}

export function Icon({ icon: IconComponent, size = 'md', className = '' }: IconProps) {
  return (
    <IconComponent
      className={className}
      sx={{ fontSize: sizePx[size] }}
    />
  )
}

export default Icon
