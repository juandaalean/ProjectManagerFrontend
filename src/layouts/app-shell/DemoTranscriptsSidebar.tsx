import { useNavigate, useParams } from 'react-router-dom'
import { FileText } from 'lucide-react'

const demos = [
  {
    filename: 'team-meeting.txt',
    label: 'Team Meeting',
    description: 'Feature planning meeting',
  },
  {
    filename: 'sprint-planning.md',
    label: 'Sprint Planning',
    description: 'Sprint 8 planning session',
  },
  {
    filename: 'daily-standup.txt',
    label: 'Daily Standup',
    description: 'Monday standup check-in',
  },
]

export function DemoTranscriptsSidebar() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  if (!projectId) return null

  return (
    <div className="mt-4">
      <div className="px-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">
          Demo Transcripts for IA feature
        </p>
      </div>
      <ul className="menu mt-2 rounded-box bg-base-100 p-1 w-full">
        {demos.map((demo) => (
          <li key={demo.filename}>
            <button
              type="button"
              onClick={() =>
                navigate(`/projects/${projectId}?view=ai&demo=${encodeURIComponent(demo.filename)}`)
              }
              title={demo.label}
              className="block w-full rounded-md px-2 py-1 transition-colors text-base-content hover:bg-base-200/50"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--color-base-content)]/10 text-[var(--color-base-content)] shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{demo.label}</div>
                  <div className="text-xs opacity-70">{demo.description}</div>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
