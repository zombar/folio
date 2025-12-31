import { useState, useEffect, useMemo } from 'react'
import type { Generation } from '../../types'
import ImageCard from './ImageCard'

interface ImageGridProps {
 generations: Generation[]
 onImageClick?: (id: string) => void
 onImageDelete?: (id: string) => void
 onSetCover?: (id: string) => void
 coverImageId?: string | null
}

export default function ImageGrid({ generations, onImageClick, onImageDelete, onSetCover, coverImageId }: ImageGridProps) {
 const [playingAnimationId, setPlayingAnimationId] = useState<string | null>(null)

 // Get all completed animations
 const animations = useMemo(() =>
  generations.filter(g =>
   g.generation_type === 'animate' &&
   g.status === 'completed' &&
   g.video_path
  ),
  [generations]
 )

 // Rotate animations every 5-10 seconds
 useEffect(() => {
  if (animations.length === 0) {
   setPlayingAnimationId(null)
   return
  }

  // Pick a random animation to start
  const pickRandomAnimation = () => {
   const randomIndex = Math.floor(Math.random() * animations.length)
   setPlayingAnimationId(animations[randomIndex].id)
  }

  // Initial pick
  pickRandomAnimation()

  // Rotate every 5-10 seconds (random interval)
  const getRandomInterval = () => 5000 + Math.random() * 5000

  let timeoutId: NodeJS.Timeout

  const scheduleNext = () => {
   timeoutId = setTimeout(() => {
    pickRandomAnimation()
    scheduleNext()
   }, getRandomInterval())
  }

  scheduleNext()

  return () => clearTimeout(timeoutId)
 }, [animations])

 return (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
   {generations.map((gen) => (
    <ImageCard
     key={gen.id}
     generation={gen}
     onClick={() => onImageClick?.(gen.id)}
     onDelete={onImageDelete ? () => onImageDelete(gen.id) : undefined}
     onSetCover={onSetCover ? () => onSetCover(gen.id) : undefined}
     isCover={gen.id === coverImageId}
     isPlayingAnimation={gen.id === playingAnimationId}
    />
   ))}
  </div>
 )
}
