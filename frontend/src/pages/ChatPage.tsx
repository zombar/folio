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
import { MessageList, ChatInput, ModelSelector, ChatSetup } from '../components/chat'

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

  // Show setup if HF token not configured or model not ready
  if (setupStatus && (!setupStatus.hf_token_set || setupStatus.status !== 'ready')) {
    return <ChatSetup />
  }

  if (!id) {
    // No conversation selected - show empty state
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400">
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
