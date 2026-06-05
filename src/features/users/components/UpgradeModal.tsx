import { useState, useCallback } from 'react'
import { Crown, Loader2 } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useAuth } from '../../auth/hooks/useAuth'
import { Button } from '../../../shared/ui/Button'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { updateUser } = useAuth()
  const [status, setStatus] = useState<'idle' | 'upgrading' | 'success'>('idle')

  const handleUpgrade = useCallback(() => {
    setStatus('upgrading')

    setTimeout(() => {
      updateUser({ plan: 'pro', projectLimit: 9999 })
      setStatus('success')

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      })

      setTimeout(() => {
        setStatus('idle')
        onClose()
      }, 2000)
    }, 2000)
  }, [updateUser, onClose])

  if (!isOpen) return null

  const handleClose = () => {
    setStatus('idle')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-base-100 text-base-content rounded-2xl shadow-xl p-6 w-full max-w-md text-center">
        {status === 'success' ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <span className="text-5xl">🎉</span>
            <h2 className="text-2xl font-bold">Welcome to Pro!</h2>
            <p className="text-base-content/70">
              You now have unlimited projects and all premium features.
            </p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-warning/20 flex items-center justify-center">
              <Crown className="w-7 h-7 text-warning" />
            </div>

            <h2 className="text-xl font-semibold mb-2">Free plan limit reached</h2>

            <p className="text-sm text-base-content/70 mb-6">
              You have reached the maximum number of projects allowed in your free plan. Upgrade to{' '}
              <strong>Pro</strong> for unlimited projects and premium features.
            </p>

            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={handleClose} disabled={status === 'upgrading'}>
                Maybe later
              </Button>

              <Button
                onClick={handleUpgrade}
                disabled={status === 'upgrading'}
                className="btn-warning gap-2"
              >
                {status === 'upgrading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    Upgrade to Pro
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
