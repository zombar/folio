import { FormEvent, KeyboardEvent, useRef } from 'react'
import { useChatStore } from '../../stores/chatStore'

interface ChatInputProps {
  onSubmit: (message: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSubmit, disabled }: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputValue = useChatStore((s) => s.inputValue)
  const setInputValue = useChatStore((s) => s.setInputValue)
  const clearInput = useChatStore((s) => s.clearInput)
  const isStreaming = useChatStore((s) => s.isStreaming)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || disabled || isStreaming) return

    onSubmit(inputValue)
    clearInput()
    // Keep focus on input after sending
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-neutral-200 dark:border-neutral-700 p-4"
    >
      <div className="flex items-center gap-2 font-mono">
        <span className="text-neutral-400 dark:text-neutral-500">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? 'Waiting...' : 'Type a message...'}
          disabled={disabled || isStreaming}
          className="flex-1 bg-transparent border-none outline-none text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 text-sm"
          autoFocus
        />
        <button
          type="submit"
          disabled={disabled || isStreaming || !inputValue.trim()}
          className="px-3 py-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </form>
  )
}
