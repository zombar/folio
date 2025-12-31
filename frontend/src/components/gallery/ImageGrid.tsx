import type { Generation } from '../../types'
import ImageCard from './ImageCard'

interface ImageGridProps {
 generations: Generation[]
 onImageClick?: (id: string) => void
}

export default function ImageGrid({ generations, onImageClick }: ImageGridProps) {
 return (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
   {generations.map((gen) => (
    <ImageCard
     key={gen.id}
     generation={gen}
     onClick={() => onImageClick?.(gen.id)}
    />
   ))}
  </div>
 )
}
