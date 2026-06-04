import { useMemo, useRef, useState } from 'react'
import { Card } from '../../../shared/ui/Card'
import { Button } from '../../../shared/ui/Button'
import { createTaskSchemaForProject } from '../../tasks/schemas/taskSchema'
import { useCreateTaskMutation } from '../../tasks/hooks/useTaskMutations'
import {
  extractTasksFromTranscript,
  type TaskDraftForCreation,
} from '../../tasks/ai/transcriptTaskAgent'
import type { ProjectMemberDto } from '../types/project.types'
import { TaskPriorityValues } from '../../tasks/types/task.types'

interface TranscriptTaskAutomationPanelProps {
  projectId: string
  projectName: string
  ownerId: string
  projectStartDate?: string
  projectEndDate?: string
  members: ProjectMemberDto[]
  enabled: boolean
  autoOpen?: boolean
  hideTriggerButton?: boolean
  onClose?: () => void
}

type LogKind = 'info' | 'success' | 'error'

type LogEntry = {
  id: number
  kind: LogKind
  message: string
}

const toIsoDateStartUtc = (value?: string) => {
  if (!value) {
    return undefined
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

export function TranscriptTaskAutomationPanel({
  projectId,
  projectName,
  ownerId,
  projectStartDate,
  projectEndDate,
  members,
  enabled,
  autoOpen,
  hideTriggerButton = false,
  onClose,
}: TranscriptTaskAutomationPanelProps) {
  const createMutation = useCreateTaskMutation()
  const nextLogId = useRef(1)
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isOpen = autoOpen !== undefined ? autoOpen : internalIsOpen
  const [transcript, setTranscript] = useState('')
  const [sourceName, setSourceName] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [drafts, setDrafts] = useState<TaskDraftForCreation[]>([])
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])

  const memberById = useMemo(
    () => new Map(members.map((member) => [member.userId, member])),
    [members],
  )

  if (!enabled) {
    return null
  }

  const pushLog = (kind: LogKind, message: string) => {
    setLogEntries((current) => [
      ...current,
      {
        id: nextLogId.current++,
        kind,
        message,
      },
    ])
  }

  const resetFlowState = () => {
    setErrorMessage(null)
    setStatusMessage(null)
    setRowErrors({})
    setTranscript('')
    setSourceName(null)
    setDrafts([])
    setLogEntries([])
    nextLogId.current = 1
  }

  const closeModal = () => {
    resetFlowState()
    if (autoOpen === undefined) {
      setInternalIsOpen(false)
    }
    onClose?.()
  }

  const onUploadTranscript = async (file: File | undefined) => {
    if (!file) {
      return
    }

    const content = await file.text()
    setTranscript(content)
    setSourceName(file.name)
    setErrorMessage(null)
    pushLog('info', `Loaded transcript file: ${file.name}`)
  }

  const onExtract = async () => {
    setErrorMessage(null)
    setStatusMessage(null)
    setRowErrors({})
    setLogEntries([])
    nextLogId.current = 1

    pushLog('info', 'Starting transcript processing...')

    try {
      setIsExtracting(true)
      const extracted = await extractTasksFromTranscript({
        transcript,
        members,
        ownerId,
        onProgress: (message) => {
          setStatusMessage(message)
          pushLog('info', message)
        },
      })

      setDrafts((current) => [...current, ...extracted])
      pushLog(
        'success',
        `Extraction finished with ${extracted.length} draft tasks. Total drafts: ${drafts.length + extracted.length}.`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to process transcript.'
      setErrorMessage(message)
      pushLog('error', message)
    } finally {
      setIsExtracting(false)
    }
  }

  const updateDraft = <K extends keyof TaskDraftForCreation>(
    index: number,
    key: K,
    value: TaskDraftForCreation[K],
  ) => {
    setDrafts((current) =>
      current.map((draft, rowIndex) =>
        rowIndex === index
          ? {
              ...draft,
              [key]: value,
            }
          : draft,
      ),
    )
  }

  const onCreateTasks = async () => {
    setErrorMessage(null)
    setStatusMessage(null)
    const nextRowErrors: Record<number, string> = {}
    pushLog('info', `Validating ${drafts.length} draft tasks before creation...`)
    const taskSchema = createTaskSchemaForProject({
      startDate: projectStartDate,
      endDate: projectEndDate,
    })

    const payloads = drafts.map((draft, index) => {
      const validation = taskSchema.safeParse({
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
        assignedUserId: draft.assignedUserId,
        startAt: draft.startAt ?? '',
        completedAt: draft.completedAt ?? '',
      })

      if (!validation.success) {
        const firstError = validation.error.issues[0]?.message ?? 'Invalid task data.'
        nextRowErrors[index] = firstError
        pushLog('error', `Row ${index + 1} validation error: ${firstError}`)
        return null
      }

      return {
        assignedUserId: draft.assignedUserId,
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
        startAt: toIsoDateStartUtc(draft.startAt),
        completedAt: toIsoDateStartUtc(draft.completedAt),
      }
    })

    setRowErrors(nextRowErrors)
    const validPayloads = payloads.filter((payload) => payload !== null)

    if (!validPayloads.length) {
      const message = 'No valid tasks to create. Fix validation errors and retry.'
      setErrorMessage(message)
      pushLog('error', message)
      return
    }

    let successCount = 0
    setIsSaving(true)

    try {
      for (const [index, payload] of validPayloads.entries()) {
        if (!payload) {
          continue
        }

        pushLog('info', `Creating task ${index + 1} of ${validPayloads.length}: ${payload.title}`)

        await createMutation.mutateAsync({
          projectId,
          task: payload,
        })
        successCount += 1
        pushLog('success', `Created task: ${payload.title}`)
      }

      const message = `${successCount} tasks created successfully.`
      setStatusMessage(message)
      pushLog('success', message)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed creating tasks.'
      setErrorMessage(message)
      pushLog('error', message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {!hideTriggerButton && (
        <Button variant="secondary" onClick={() => setInternalIsOpen(true)}>
          AI Tasks
        </Button>
      )}

      {isOpen && (
        <div className="modal modal-open">
          <Card className="modal-box w-full max-w-5xl border border-base-300 bg-base-100 p-0 shadow-xl">
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">AI Task Automation</h2>
                <p className="text-sm text-base-content/70">
                  Extract multiple tasks from meeting transcripts for {projectName} and review them
                  before creation.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className="label">
                    <span className="label-text font-semibold">Transcript (paste text)</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered h-48 w-full"
                    placeholder="Paste Microsoft Teams or Google Meet transcript here..."
                    value={transcript}
                    onChange={(event) => setTranscript(event.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Or upload .txt/.md file</span>
                    </label>
                    <input
                      type="file"
                      className="file-input file-input-bordered w-full"
                      accept=".txt,.md,text/plain,text/markdown"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        void onUploadTranscript(file)
                      }}
                    />
                    {sourceName && (
                      <p className="mt-2 text-xs text-base-content/60">Loaded file: {sourceName}</p>
                    )}
                  </div>

                  <div className="rounded-box border border-base-300 bg-base-200/50 p-3 text-xs text-base-content/70">
                    If assignee is not explicitly detected in transcript, the task will be assigned
                    to the project owner.
                  </div>

                  <Button
                    onClick={() => void onExtract()}
                    disabled={isExtracting || !transcript.trim()}
                  >
                    {isExtracting ? 'Processing...' : 'Process with AI'}
                  </Button>
                </div>
              </div>

              {statusMessage && (
                <div className="alert alert-info">
                  <span>{statusMessage}</span>
                </div>
              )}
              {errorMessage && (
                <div className="alert alert-error">
                  <span>{errorMessage}</span>
                </div>
              )}

              <details className="rounded-box border border-base-300 bg-base-200/40 p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide">Process log</h3>
                    <p className="text-xs text-base-content/60">
                      Live status of model loading, parsing and task creation.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-base-content/60">
                    {logEntries.length} events
                  </span>
                </summary>
                <div className="mt-4 flex justify-end">
                  <Button variant="secondary" size="sm" onClick={resetFlowState}>
                    Clear log
                  </Button>
                </div>
                <div className="mt-3 max-h-44 space-y-2 overflow-auto pr-1 text-sm">
                  {logEntries.length === 0 ? (
                    <p className="text-base-content/50">No events yet.</p>
                  ) : (
                    logEntries.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-2">
                        <span
                          className={`mt-1 inline-block h-2 w-2 rounded-full ${entry.kind === 'success' ? 'bg-success' : entry.kind === 'error' ? 'bg-error' : 'bg-info'}`}
                        />
                        <p
                          className={`${entry.kind === 'success' ? 'text-success' : entry.kind === 'error' ? 'text-error' : 'text-base-content/80'}`}
                        >
                          {entry.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </details>

              {drafts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Draft tasks ({drafts.length})</h3>
                  <div className="max-h-[45vh] space-y-3 overflow-auto pr-1">
                    {drafts.map((draft, index) => (
                      <div
                        key={`${draft.title}-${index}`}
                        className="rounded-box border border-base-300 p-3"
                      >
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="label">
                              <span className="label-text font-semibold">Title</span>
                            </label>
                            <input
                              className="input input-bordered w-full"
                              value={draft.title}
                              onChange={(event) => updateDraft(index, 'title', event.target.value)}
                            />
                          </div>

                          <div>
                            <label className="label">
                              <span className="label-text font-semibold">Priority</span>
                            </label>
                            <select
                              className="select select-bordered w-full"
                              value={draft.priority}
                              onChange={(event) =>
                                updateDraft(
                                  index,
                                  'priority',
                                  event.target.value as TaskDraftForCreation['priority'],
                                )
                              }
                            >
                              {TaskPriorityValues.map((priority) => (
                                <option key={priority} value={priority}>
                                  {priority}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="label">
                              <span className="label-text font-semibold">Description</span>
                            </label>
                            <textarea
                              className="textarea textarea-bordered h-20 w-full"
                              value={draft.description ?? ''}
                              onChange={(event) =>
                                updateDraft(index, 'description', event.target.value)
                              }
                            />
                          </div>

                          <div>
                            <label className="label">
                              <span className="label-text font-semibold">Assignee</span>
                            </label>
                            <select
                              className="select select-bordered w-full"
                              value={draft.assignedUserId}
                              onChange={(event) =>
                                updateDraft(index, 'assignedUserId', event.target.value)
                              }
                            >
                              {members.map((member) => (
                                <option key={member.userId} value={member.userId}>
                                  {member.userName} ({member.userEmail})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="label">
                              <span className="label-text font-semibold">Start At</span>
                            </label>
                            <input
                              type="date"
                              className="input input-bordered w-full"
                              value={draft.startAt ?? ''}
                              onChange={(event) =>
                                updateDraft(index, 'startAt', event.target.value || undefined)
                              }
                            />
                          </div>

                          <div>
                            <label className="label">
                              <span className="label-text font-semibold">Completed At</span>
                            </label>
                            <input
                              type="date"
                              className="input input-bordered w-full"
                              value={draft.completedAt ?? ''}
                              onChange={(event) =>
                                updateDraft(index, 'completedAt', event.target.value || undefined)
                              }
                            />
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-xs text-base-content/60">
                          <span>
                            Resolved assignee:{' '}
                            {memberById.get(draft.assignedUserId)?.userName ?? draft.assignedUserId}
                          </span>
                          {typeof draft.confidence === 'number' && (
                            <span>Confidence: {Math.round(draft.confidence * 100)}%</span>
                          )}
                        </div>

                        {rowErrors[index] && (
                          <p className="mt-2 text-sm text-error">
                            Row {index + 1}: {rowErrors[index]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-action">
                <Button variant="secondary" onClick={closeModal}>
                  Close
                </Button>
                <Button
                  onClick={() => void onCreateTasks()}
                  disabled={!drafts.length || isSaving || isExtracting}
                >
                  {isSaving ? 'Creating tasks...' : 'Create tasks'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
