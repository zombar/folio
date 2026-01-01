import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useConversation,
  useCreateConversation,
  useChatStatus,
  useSetupStatus,
} from '../hooks/useChat'
import { useChatStream } from '../hooks/useChatStream'
import { useChatStore } from '../stores/chatStore'
import { MessageList, ChatInput, ModelSelector } from '../components/chat'

// Notification bar for chat issues
function NotificationBar({ setupStatus }: { setupStatus: { hf_token_set: boolean; status: string; default_model?: string } | undefined }) {
  if (!setupStatus) return null

  const issues: string[] = []

  if (!setupStatus.hf_token_set) {
    issues.push('HuggingFace token not configured. Set HF_TOKEN in .env to use gated models.')
  }

  if (setupStatus.status === 'loading') {
    issues.push('Model is loading...')
  } else if (setupStatus.status === 'error') {
    issues.push('LLM server error. Check that the sglang service is running.')
  } else if (setupStatus.status !== 'ready') {
    issues.push(`LLM server not ready (status: ${setupStatus.status})`)
  }

  if (issues.length === 0) return null

  return (
    <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
      <div className="flex items-start gap-2">
        <span className="text-amber-600 dark:text-amber-400 text-sm">!</span>
        <div className="text-xs text-amber-700 dark:text-amber-300 font-mono">
          {issues.map((issue, i) => (
            <p key={i}>{issue}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: conversation, isLoading } = useConversation(id || null)
  const { data: status } = useChatStatus()
  const { data: setupStatus } = useSetupStatus()
  const createConversation = useCreateConversation()
  const { sendMessage } = useChatStream(id || null)

  const selectConversation = useChatStore((s) => s.selectConversation)
  const clearStreamingContent = useChatStore((s) => s.clearStreamingContent)

  // Sync selected conversation with URL
  useEffect(() => {
    selectConversation(id || null)
    clearStreamingContent()
  }, [id, selectConversation, clearStreamingContent])

  const handleNewConversation = async () => {
    const model = status?.model_id || 'meta-llama/Llama-3.2-1B-Instruct'

    const conv = await createConversation.mutateAsync({ model })
    navigate(`/chat/${conv.id}`)
  }

  if (!id) {
    // No conversation selected - show empty state
    return (
      <div className="h-full flex flex-col">
        <NotificationBar setupStatus={setupStatus} />
        <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400">
          <p className="mb-4 font-mono text-sm">
            Select a conversation or start a new one
          </p>
          <button
            onClick={handleNewConversation}
            disabled={createConversation.isPending}
            className="px-4 py-2 text-sm font-mono text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            New Conversation
          </button>
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
      <NotificationBar setupStatus={setupStatus} />

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
