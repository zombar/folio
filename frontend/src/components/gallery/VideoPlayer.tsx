import { getVideoUrl } from '../../api/client'

interface VideoPlayerProps {
  generationId: string
  className?: string
}

export default function VideoPlayer({ generationId, className = '' }: VideoPlayerProps) {
  return (
    <video
      src={getVideoUrl(generationId)}
      className={`w-full h-full object-cover ${className}`}
      autoPlay
      loop
      muted
      playsInline
    />
  )
}
