import { useGenerationStore } from '../../stores/generationStore'
import { Input } from '../ui'

export default function ParameterControls() {
 const width = useGenerationStore((state) => state.width)
 const height = useGenerationStore((state) => state.height)
 const steps = useGenerationStore((state) => state.steps)
 const cfgScale = useGenerationStore((state) => state.cfgScale)
 const sampler = useGenerationStore((state) => state.sampler)
 const seed = useGenerationStore((state) => state.seed)

 const setWidth = useGenerationStore((state) => state.setWidth)
 const setHeight = useGenerationStore((state) => state.setHeight)
 const setSteps = useGenerationStore((state) => state.setSteps)
 const setCfgScale = useGenerationStore((state) => state.setCfgScale)
 const setSampler = useGenerationStore((state) => state.setSampler)
 const setSeed = useGenerationStore((state) => state.setSeed)

 const samplers = ['euler', 'euler_ancestral', 'dpmpp_2m', 'dpmpp_sde', 'ddim']
 const presets = [
  { label: '1:1', width: 1024, height: 1024 },
  { label: '16:9', width: 1344, height: 768 },
  { label: '9:16', width: 768, height: 1344 },
  { label: '4:3', width: 1152, height: 896 },
  { label: '3:4', width: 896, height: 1152 },
 ]

 return (
  <div className="space-y-4">
   {/* Aspect ratio presets */}
   <div>
    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Aspect Ratio</label>
    <div className="flex gap-2">
     {presets.map((preset) => (
      <button
       key={preset.label}
       onClick={() => {
        setWidth(preset.width)
        setHeight(preset.height)
       }}
       className={`px-3 py-1.5 text-sm transition-colors ${
        width === preset.width && height === preset.height
         ? 'bg-neutral-800 dark:bg-neutral-100 text-white dark:text-neutral-900'
         : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'
       }`}
      >
       {preset.label}
      </button>
     ))}
    </div>
   </div>

   {/* Size inputs */}
   <div className="grid grid-cols-2 gap-4">
    <Input
     label="Width"
     type="number"
     value={width}
     onChange={(e) => setWidth(Number(e.target.value))}
     min={256}
     max={2048}
     step={64}
    />
    <Input
     label="Height"
     type="number"
     value={height}
     onChange={(e) => setHeight(Number(e.target.value))}
     min={256}
     max={2048}
     step={64}
    />
   </div>

   {/* Steps and CFG */}
   <div className="grid grid-cols-2 gap-4">
    <Input
     label="Steps"
     type="number"
     value={steps}
     onChange={(e) => setSteps(Number(e.target.value))}
     min={1}
     max={100}
    />
    <Input
     label="CFG Scale"
     type="number"
     value={cfgScale}
     onChange={(e) => setCfgScale(Number(e.target.value))}
     min={1}
     max={20}
     step={0.5}
    />
   </div>

   {/* Sampler */}
   <div>
    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Sampler</label>
    <select
     value={sampler}
     onChange={(e) => setSampler(e.target.value)}
     className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-500"
    >
     {samplers.map((s) => (
      <option key={s} value={s}>
       {s}
      </option>
     ))}
    </select>
   </div>

   {/* Seed */}
   <Input
    label="Seed (optional)"
    type="number"
    value={seed ?? ''}
    onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : null)}
    placeholder="Random"
   />
  </div>
 )
}
