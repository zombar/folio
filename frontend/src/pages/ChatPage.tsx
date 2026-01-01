import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useConversation,
  useCreateConversation,
  useChatStatus,
  useSwitchModel,
} from '../hooks/useChat'
import { useChatStream } from '../hooks/useChatStream'
import { useChatStore } from '../stores/chatStore'
import { MessageList, ChatInput, ModelSelector } from '../components/chat'
import { Button } from '../components/ui'

const DEFAULT_MODEL = 'llama3.2:1b'

// Notification bar for chat issues
function NotificationBar({ status }: { status: { model_id: string | null; status: string; error?: string | null } | undefined }) {
  if (!status) return null

  const issues: string[] = []

  if (status.status === 'loading') {
    issues.push(`Loading model${status.model_id ? ` ${status.model_id}` : ''}...`)
  } else if (status.status === 'error') {
    issues.push(`LLM server error: ${status.error || 'Check that the ollama service is running.'}`)
  }

  if (issues.length === 0) return null

  return (
    <div className="text-neutral-700 dark:text-neutral-300 p-4 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600">
      {issues.map((issue, i) => (
        <p key={i}>{issue}</p>
      ))}
    </div>
  )
}

export default function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: conversation, isLoading } = useConversation(id || null)
  const { data: status } = useChatStatus()
  const createConversation = useCreateConversation()
  const switchModel = useSwitchModel()
  const { sendMessage } = useChatStream(id || null)

  const selectConversation = useChatStore((s) => s.selectConversation)
  const clearStreamingContent = useChatStore((s) => s.clearStreamingContent)

  // Sync selected conversation with URL
  useEffect(() => {
    selectConversation(id || null)
    clearStreamingContent()
  }, [id, selectConversation, clearStreamingContent])

  // Prefetch model when chat page opens
  const hasPrefetched = useRef(false)
  useEffect(() => {
    if (status?.status === 'stopped' && !hasPrefetched.current) {
      hasPrefetched.current = true
      switchModel.mutate(DEFAULT_MODEL)
    }
  }, [status?.status, switchModel])

  const handleNewConversation = async () => {
    const model = status?.model_id || DEFAULT_MODEL

    const conv = await createConversation.mutateAsync({ model })
    navigate(`/chat/${conv.id}`)
  }

  if (!id) {
    // No conversation selected - show empty state (matching portfolio empty state)
    return (
      <div className="h-full flex flex-col">
        <NotificationBar status={status} />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-neutral-400 dark:text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-neutral-700 dark:text-neutral-300 mb-2">No conversation selected</h2>
            <p className="text-neutral-500 mb-4">Start a new conversation to chat with the model</p>
            <Button onClick={handleNewConversation} loading={createConversation.isPending}>
              New Conversation
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 font-mono text-sm">
        Loading...
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 font-mono text-sm">
        Conversation not found
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900">
      {/* Notification bar for issues */}
      <NotificationBar status={status} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <span className="text-sm text-neutral-600 dark:text-neutral-400 font-mono truncate max-w-xs">
          {conversation.title || 'New conversation'}
        </span>
        <ModelSelector currentModel={conversation.model} />
      </div>

      {/* Messages */}
      <MessageList messages={conversation.messages} />

      {/* Input */}
      <ChatInput
        onSubmit={sendMessage}
        disabled={status?.status !== 'ready'}
      />
    </div>
  )
}
