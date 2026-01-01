import { Link, useParams } from 'react-router-dom'
import {
  useConversations,
  useConversationCount,
} from '../../hooks/useChat'

const MAX_VISIBLE = 10

export default function ConversationList() {
  const { id: activeId } = useParams()
  const { data: conversations, isLoading } = useConversations(MAX_VISIBLE)
  const { data: countData } = useConversationCount()

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
            <Link
              key={conv.id}
              to={`/chat/${conv.id}`}
              className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                activeId === conv.id
                  ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className="truncate font-mono text-xs">
                {conv.title || 'New conversation'}
              </span>
              <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-500">
                {conv.message_count}
              </span>
            </Link>
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
