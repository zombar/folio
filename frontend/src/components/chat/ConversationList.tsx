import { Link, useParams } from 'react-router-dom'
import {
  useConversations,
  useConversationCount,
  useDeleteConversation,
} from '../../hooks/useChat'

const MAX_VISIBLE = 10

export default function ConversationList() {
  const { id: activeId } = useParams()
  const { data: conversations, isLoading } = useConversations(MAX_VISIBLE)
  const { data: countData } = useConversationCount()
  const deleteMutation = useDeleteConversation()

  const totalCount = countData?.count || 0
  const hasMore = totalCount > MAX_VISIBLE

  if (isLoading) {
    return (
      <div className="px-3 py-2 text-neutral-500 dark:text-neutral-500 text-sm">
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {conversations?.length === 0 ? (
        <div className="px-3 py-2 text-neutral-500 dark:text-neutral-500 text-sm">
          No conversations
        </div>
      ) : (
        <>
          {conversations?.map((conv) => (
            <div key={conv.id} className="group flex items-center">
              <Link
                to={`/chat/${conv.id}`}
                className={`flex-1 flex items-center gap-2 px-3 py-2 text-sm truncate transition-colors ${
                  activeId === conv.id
                    ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                    : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                <span className="truncate font-mono text-xs">
                  {conv.title || 'New conversation'}
                </span>
                <span className="ml-auto text-xs text-neutral-400 dark:text-neutral-500">
                  {conv.message_count}
                </span>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  deleteMutation.mutate(conv.id)
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-opacity"
                aria-label="Delete conversation"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
          {hasMore && (
            <Link
              to="/chat/all"
              className="block px-3 py-2 text-sm text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              ...and {totalCount - MAX_VISIBLE} more
            </Link>
          )}
        </>
      )}
    </div>
  )
}
