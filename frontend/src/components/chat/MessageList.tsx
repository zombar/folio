import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
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

// Markdown components for styling
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <span className="block mb-2 last:mb-0">{children}</span>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 text-xs">{children}</code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="bg-neutral-200 dark:bg-neutral-700 p-2 my-2 overflow-x-auto text-xs">{children}</pre>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="ml-2">{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
}

export default function MessageList({ messages }: MessageListProps) {
  const isStreaming = useChatStore((s) => s.isStreaming)
  const streamingContent = useChatStore((s) => s.streamingContent)
  const pendingMessage = useChatStore((s) => s.pendingMessage)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, pendingMessage])

  return (
    <div className="flex-1 overflow-y-auto font-mono text-sm p-4" style={{ lineHeight: 1.725 }}>
      {messages.length === 0 && !isStreaming && (
        <div className="text-neutral-400 dark:text-neutral-500 text-center py-8">
          Start a conversation by typing below
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className="py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 -mx-2 px-2 border-b border-neutral-100 dark:border-neutral-800"
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
            {msg.role === 'user' ? (
              <span className="whitespace-pre-wrap break-words">{msg.content}</span>
            ) : (
              <span className="inline">
                <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
              </span>
            )}
          </span>
        </div>
      ))}

      {/* Pending user message (shown while waiting for LLM response) */}
      {isStreaming && pendingMessage && (
        <div className="py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 -mx-2 px-2 border-b border-neutral-100 dark:border-neutral-800">
          <span className="text-neutral-400 dark:text-neutral-500 mr-2">
            [--:--]
          </span>
          <span className="text-neutral-700 dark:text-neutral-200">
            <span className="font-semibold">you:</span>{' '}
            <span className="whitespace-pre-wrap break-words">{pendingMessage}</span>
          </span>
        </div>
      )}

      {/* Streaming response */}
      {isStreaming && streamingContent && (
        <div className="py-2 -mx-2 px-2 border-b border-neutral-100 dark:border-neutral-800">
          <span className="text-neutral-400 dark:text-neutral-500 mr-2">
            [--:--]
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold">llm:</span>{' '}
            <span className="inline">
              <ReactMarkdown components={markdownComponents}>{streamingContent}</ReactMarkdown>
            </span>
            <span className="animate-pulse">_</span>
          </span>
        </div>
      )}

      {/* Streaming indicator when waiting for first token */}
      {isStreaming && !streamingContent && (
        <div className="py-2 -mx-2 px-2 border-b border-neutral-100 dark:border-neutral-800">
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
