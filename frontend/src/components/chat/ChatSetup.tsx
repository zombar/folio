import { useState } from 'react'
import { useSetup, useSetupStatus } from '../../hooks/useChat'

export default function ChatSetup() {
  const [token, setToken] = useState('')
  const { data: status, isLoading: statusLoading } = useSetupStatus()
  const setup = useSetup()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return
    await setup.mutateAsync(token)
  }

  if (statusLoading) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 font-mono text-sm">
        Checking setup...
      </div>
    )
  }

  // Already set up
  if (status?.hf_token_set && status.status === 'ready') {
    return null
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
            Chat Setup
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Enter your HuggingFace token to download and use LLM models.
            The default model ({status?.default_model}) will be downloaded.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="hf-token"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              HuggingFace Token
            </label>
            <input
              id="hf-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="hf_..."
              className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500"
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Get your token at{' '}
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                huggingface.co/settings/tokens
              </a>
            </p>
          </div>

          <button
            type="submit"
            disabled={!token.trim() || setup.isPending}
            className="w-full px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium text-sm hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {setup.isPending ? 'Setting up...' : 'Save & Download Model'}
          </button>

          {setup.isError && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Error: {(setup.error as Error).message}
            </p>
          )}
        </form>

        {status?.status === 'loading' && (
          <div className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            <div className="animate-pulse">Downloading model...</div>
            <p className="mt-1 text-xs">This may take a few minutes on first run.</p>
          </div>
        )}

        <div className="text-center text-xs text-neutral-400 dark:text-neutral-500">
          <p>
            Note: Some models like Llama require accepting the license on HuggingFace first.
          </p>
        </div>
      </div>
    </div>
  )
}
