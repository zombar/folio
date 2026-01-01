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

// Seeded random for consistent shuffling per session
function seededRandom(seed: number) {
 return function() {
  seed = (seed * 9301 + 49297) % 233280
  return seed / 233280
 }
}

export default function ImageGrid({ generations, onImageClick, onImageDelete, onSetCover, coverImageId }: ImageGridProps) {
 const [playingAnimationId, setPlayingAnimationId] = useState<string | null>(null)

 // Separate animations and non-animations, then shuffle animations into random positions
 const shuffledGenerations = useMemo(() => {
  const nonAnimations = generations.filter(g => g.generation_type !== 'animate')
  const animations = generations.filter(g => g.generation_type === 'animate')

  if (animations.length === 0) return nonAnimations

  // Use a session-stable seed based on generation IDs
  const seed = generations.reduce((acc, g) => acc + g.id.charCodeAt(0), 0)
  const random = seededRandom(seed)

  // Create result array with non-animations
  const result = [...nonAnimations]

  // Insert each animation at a random position
  for (const animation of animations) {
   const insertIndex = Math.floor(random() * (result.length + 1))
   result.splice(insertIndex, 0, animation)
  }

  return result
 }, [generations])

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

  let timeoutId: ReturnType<typeof setTimeout>

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
  <div
   className="grid gap-4"
   style={{ gridTemplateColumns: 'repeat(auto-fill, 260px)' }}
  >
   {shuffledGenerations.map((gen) => (
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
