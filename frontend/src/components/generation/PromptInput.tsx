import { useGenerationStore } from '../../stores/generationStore'
import { Textarea } from '../ui'

export default function PromptInput() {
 const prompt = useGenerationStore((state) => state.prompt)
 const negativePrompt = useGenerationStore((state) => state.negativePrompt)
 const setPrompt = useGenerationStore((state) => state.setPrompt)
 const setNegativePrompt = useGenerationStore((state) => state.setNegativePrompt)

 return (
  <div className="space-y-4">
   <Textarea
    label="Prompt"
    placeholder="Describe the image you want to generate..."
    value={prompt}
    onChange={(e) => setPrompt(e.target.value)}
    rows={4}
   />

   <Textarea
    label="Negative Prompt (optional)"
    placeholder="What to avoid in the image..."
    value={negativePrompt}
    onChange={(e) => setNegativePrompt(e.target.value)}
    rows={2}
   />
  </div>
 )
}
