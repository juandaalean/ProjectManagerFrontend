import { useNavigate, useParams } from 'react-router-dom'
import { FileText } from 'lucide-react'

const demos = [
  {
    filename: 'transcript-1-es.txt',
    label: 'Demo 1 .txt file Spanish',
    description: 'Reportes + seguridad',
  },
  {
    filename: 'transcript-2-es.md',
    label: 'Demo 2 .md file Spanish',
    description: 'Recuperación + analítica',
  },
  {
    filename: 'transcript-3-es.txt',
    label: 'Demo 3 .txt file Spanish',
    description: 'SSO + segmentación',
  },
  {
    filename: 'transcript-1-en.txt',
    label: 'Demo 1 .txt file English',
    description: 'Reports + security',
  },
  {
    filename: 'transcript-2-en.md',
    label: 'Demo 2 .md file English',
    description: 'Recovery + analytics',
  },
  {
    filename: 'transcript-3-en.txt',
    label: 'Demo 3 .txt file English',
    description: 'SSO + segmentation',
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
      <div className="mt-2 max-h-55 overflow-y-auto rounded-box">
        <ul className="menu rounded-box bg-base-100 p-1 w-full">
          {demos.map((demo) => (
            <li key={demo.filename}>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/projects/${projectId}?view=ai&demo=${encodeURIComponent(demo.filename)}`,
                  )
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
    </div>
  )
}
