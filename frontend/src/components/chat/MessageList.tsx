import { useEffect, useRef } from 'react'
import { useChatStore } from '../../stores/chatStore'
import type { Message } from '../../types'

interface MessageListProps {
  messages: Message[]
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function MessageList({ messages }: MessageListProps) {
  const isStreaming = useChatStore((s) => s.isStreaming)
  const streamingContent = useChatStore((s) => s.streamingContent)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  return (
    <div className="flex-1 overflow-y-auto font-mono text-sm p-4">
      {messages.length === 0 && !isStreaming && (
        <div className="text-neutral-400 dark:text-neutral-500 text-center py-8">
          Start a conversation by typing below
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className="py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 -mx-2 px-2"
        >
          <span className="text-neutral-400 dark:text-neutral-500 mr-2">
            [{formatTime(msg.created_at)}]
          </span>
          <span
            className={
              msg.role === 'user'
                ? 'text-neutral-700 dark:text-neutral-200'
                : 'text-neutral-500 dark:text-neutral-400'
            }
          >
            <span className="font-semibold">
              {msg.role === 'user' ? 'you' : 'llm'}:
            </span>{' '}
            <span className="whitespace-pre-wrap break-words">{msg.content}</span>
          </span>
        </div>
      ))}

      {/* Streaming response */}
      {isStreaming && streamingContent && (
        <div className="py-1 -mx-2 px-2">
          <span className="text-neutral-400 dark:text-neutral-500 mr-2">
            [--:--]
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold">llm:</span>{' '}
            <span className="whitespace-pre-wrap break-words">
              {streamingContent}
            </span>
            <span className="animate-pulse">_</span>
          </span>
        </div>
      )}

      {/* Streaming indicator when waiting for first token */}
      {isStreaming && !streamingContent && (
        <div className="py-1 -mx-2 px-2">
          <span className="text-neutral-400 dark:text-neutral-500 mr-2">
            [--:--]
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold">llm:</span>{' '}
            <span className="animate-pulse">_</span>
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
