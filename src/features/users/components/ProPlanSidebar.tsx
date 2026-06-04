import { useState } from 'react'
import { Crown, InfinityIcon, Lock } from 'lucide-react'
import { useAuth } from '../../auth/hooks/useAuth'
import { useUserStats } from '../hooks/useUserStats'
import { UpgradeModal } from './UpgradeModal'
import { Button } from '../../../shared/ui/Button'

export function ProPlanSidebar() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { user } = useAuth()
  const { data: stats, isLoading } = useUserStats()

  const plan = user?.plan ?? stats?.plan ?? 'free'
  const projectLimit = user?.projectLimit ?? stats?.projectLimit ?? 3
  const projectCount = stats?.projectCount ?? 0

  if (isLoading || !stats) {
    return (
      <div className="mt-auto p-4">
        <div className="skeleton w-full h-24 rounded-box" />
      </div>
    )
  }

  const percentage = projectLimit > 0
    ? Math.min((projectCount / projectLimit) * 100, 100)
    : 0

  const isPro = plan === 'pro'
  const isLocked = !isPro && projectCount >= projectLimit

  return (
    <>
      <div className="mt-auto p-2 lg:p-4">
        <div className="rounded-box border border-base-300 bg-base-200 p-4 w-full">
          <div className="flex items-center gap-2 mb-3">
            {isPro ? (
              <Crown className="w-4 h-4 text-warning" />
            ) : (
              <Crown className="w-4 h-4 text-base-content/50" />
            )}
            <span className="text-xs font-semibold uppercase tracking-[0.15em]">
              {isPro ? 'Pro Plan' : 'Free Plan'}
            </span>
          </div>

          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-base-content/70">
                Projects
              </span>
              <span className="font-medium">
                {isPro ? (
                  <span className="flex items-center gap-1">
                    {projectCount}
                    <InfinityIcon className="w-3 h-3" />
                  </span>
                ) : (
                  `${projectCount} / ${projectLimit}`
                )}
              </span>
            </div>

            {!isPro && (
              <progress
                className={`progress w-full ${percentage >= 100 ? 'progress-error' : percentage >= 75 ? 'progress-warning' : 'progress-primary'}`}
                value={projectCount}
                max={projectLimit}
              />
            )}
          </div>

          {isLocked && (
            <div className="mt-3">
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-2"
                onClick={() => setIsModalOpen(true)}
              >
                <Lock className="w-3.5 h-3.5" />
                Upgrade to Pro
              </Button>
            </div>
          )}

          {isPro && (
            <p className="text-xs text-base-content/50 italic">
              Unlimited projects and premium features unlocked.
            </p>
          )}
        </div>
      </div>

      <UpgradeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
