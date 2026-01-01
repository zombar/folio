import { create } from 'zustand'

interface ChatState {
  selectedConversationId: string | null
  isStreaming: boolean
  streamingContent: string
  pendingMessage: string | null
  inputValue: string

  selectConversation: (id: string | null) => void
  setStreaming: (streaming: boolean) => void
  appendStreamingContent: (content: string) => void
  clearStreamingContent: () => void
  setPendingMessage: (message: string | null) => void
  setInputValue: (value: string) => void
  clearInput: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  selectedConversationId: null,
  isStreaming: false,
  streamingContent: '',
  pendingMessage: null,
  inputValue: '',

  selectConversation: (id) => set({ selectedConversationId: id }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  appendStreamingContent: (content) =>
    set((state) => ({ streamingContent: state.streamingContent + content })),
  clearStreamingContent: () => set({ streamingContent: '', pendingMessage: null }),
  setPendingMessage: (pendingMessage) => set({ pendingMessage }),
  setInputValue: (inputValue) => set({ inputValue }),
  clearInput: () => set({ inputValue: '' }),
}))
