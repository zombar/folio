import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, Button, Input, Textarea } from '../ui'
import { useUIStore } from '../../stores/uiStore'
import { useCreatePortfolio } from '../../hooks/usePortfolios'

export default function CreatePortfolioModal() {
  const navigate = useNavigate()
  const isOpen = useUIStore((state) => state.createPortfolioModalOpen)
  const closeModal = useUIStore((state) => state.closeCreatePortfolioModal)
  const createPortfolio = useCreatePortfolio()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      const portfolio = await createPortfolio.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      setName('')
      setDescription('')
      closeModal()
      navigate(`/portfolio/${portfolio.id}`)
    } catch (error) {
      console.error('Failed to create portfolio:', error)
    }
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    closeModal()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Portfolio">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          placeholder="My awesome project"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />

        <Textarea
          label="Description (optional)"
          placeholder="What's this portfolio about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={createPortfolio.isPending}
            disabled={!name.trim()}
          >
            Create
          </Button>
        </div>
      </form>
    </Modal>
  )
}
