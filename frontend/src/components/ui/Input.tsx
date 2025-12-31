import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
 label?: string
 error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
 ({ className = '', label, error, id, ...props }, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
   <div className="w-full">
    {label && (
     <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
      {label}
     </label>
    )}
    <input
     ref={ref}
     id={inputId}
     className={`w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent rounded-sm ${error ? 'border-neutral-500 dark:border-neutral-400' : ''} ${className}`}
     {...props}
    />
    {error && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{error}</p>}
   </div>
  )
 }
)

Input.displayName = 'Input'

export default Input
