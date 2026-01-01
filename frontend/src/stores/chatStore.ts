import { create } from 'zustand'

interface ChatState {
  selectedConversationId: string | null
  isStreaming: boolean
  streamingContent: string
  inputValue: string

  selectConversation: (id: string | null) => void
  setStreaming: (streaming: boolean) => void
  appendStreamingContent: (content: string) => void
  clearStreamingContent: () => void
  setInputValue: (value: string) => void
  clearInput: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  selectedConversationId: null,
  isStreaming: false,
  streamingContent: '',
  inputValue: '',

  selectConversation: (id) => set({ selectedConversationId: id }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  appendStreamingContent: (content) =>
    set((state) => ({ streamingContent: state.streamingContent + content })),
  clearStreamingContent: () => set({ streamingContent: '' }),
  setInputValue: (inputValue) => set({ inputValue }),
  clearInput: () => set({ inputValue: '' }),
}))
