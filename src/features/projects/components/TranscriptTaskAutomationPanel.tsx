import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '../../../shared/ui/Card'
import { Button } from '../../../shared/ui/Button'
import { createTaskSchemaForProject } from '../../tasks/schemas/taskSchema'
import { useCreateTaskMutation } from '../../tasks/hooks/useTaskMutations'
import {
  extractTasksFromTranscript,
  AVAILABLE_MODELS,
  type AvailableModelId,
  type TaskDraftForCreation,
} from '../../tasks/ai/transcriptTaskAgent'
import type { ProjectMemberDto } from '../types/project.types'
import { TaskPriorityValues } from '../../tasks/types/task.types'
import { preprocessTranscript, type SupportedLanguage } from '../../tasks/ai/transcriptPreprocessor'

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
  demoFile?: string
}

type LogKind = 'info' | 'success' | 'error'

type LogEntry = {
  id: number
  kind: LogKind
  message: string
}

type TestSuiteResult = {
  filename: string
  label: string
  language: SupportedLanguage
  meetingDate?: string
  drafts: TaskDraftForCreation[]
  error?: string
  durationMs: number
}

const DEMO_FILES: Array<{ filename: string; label: string }> = [
  { filename: 'transcript-1-es.txt', label: 'Demo 1 ES — Reportes + seguridad' },
  { filename: 'transcript-2-es.md', label: 'Demo 2 ES — Recuperación + analítica' },
  { filename: 'transcript-3-es.txt', label: 'Demo 3 ES — SSO + segmentación' },
  { filename: 'transcript-1-en.txt', label: 'Demo 1 EN — Reports + security' },
  { filename: 'transcript-2-en.md', label: 'Demo 2 EN — Recovery + analytics' },
  { filename: 'transcript-3-en.txt', label: 'Demo 3 EN — SSO + segmentation' },
]

const toIsoDateStartUtc = (value?: string) => {
  if (!value) return undefined
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
  demoFile,
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
  const [detectedLanguage, setDetectedLanguage] = useState<SupportedLanguage | null>(null)
  const [detectedMeetingDate, setDetectedMeetingDate] = useState<string | undefined>(undefined)
  const [testSuiteResults, setTestSuiteResults] = useState<TestSuiteResult[]>([])
  const [isRunningSuite, setIsRunningSuite] = useState(false)
  const [showTestSuite] = useState(false)
  const [selectedModel, setSelectedModel] = useState<AvailableModelId>(
    AVAILABLE_MODELS[0].id as AvailableModelId,
  )

  const memberById = useMemo(
    () => new Map(members.map((member) => [member.userId, member])),
    [members],
  )

  useEffect(() => {
    if (!demoFile || !isOpen) return
    let cancelled = false
    fetch(`/demos/${demoFile}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load demo file: ${demoFile}`)
        return res.text()
      })
      .then((content) => {
        if (cancelled) return
        setTranscript(content)
        setSourceName(demoFile)
        const pre = preprocessTranscript(content, members)
        setDetectedLanguage(pre.language)
        setDetectedMeetingDate(pre.meetingDate)
        pushLog('info', `Loaded demo transcript: ${demoFile}`)
        pushLog(
          'info',
          `Detected language: ${pre.language === 'es' ? 'español' : 'English'}. Meeting date: ${
            pre.meetingDate ?? 'unknown'
          }. Preprocessor found ${pre.detectedDates.length} date hints.`,
        )
      })
      .catch(() => {
        if (!cancelled) pushLog('error', `Could not load demo file: ${demoFile}`)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoFile, isOpen])

  if (!enabled) return null

  const pushLog = (kind: LogKind, message: string) => {
    setLogEntries((current) => [...current, { id: nextLogId.current++, kind, message }])
  }

  const resetFlowState = () => {
    setErrorMessage(null)
    setStatusMessage(null)
    setRowErrors({})
    setTranscript('')
    setSourceName(null)
    setDrafts([])
    setLogEntries([])
    setDetectedLanguage(null)
    setDetectedMeetingDate(undefined)
    nextLogId.current = 1
  }

  const closeModal = () => {
    resetFlowState()
    if (autoOpen === undefined) setInternalIsOpen(false)
    onClose?.()
  }

  const onUploadTranscript = async (file: File | undefined) => {
    if (!file) return
    const content = await file.text()
    setTranscript(content)
    setSourceName(file.name)
    setErrorMessage(null)
    const pre = preprocessTranscript(content, members)
    setDetectedLanguage(pre.language)
    setDetectedMeetingDate(pre.meetingDate)
    pushLog('info', `Loaded transcript file: ${file.name}`)
    pushLog(
      'info',
      `Detected language: ${pre.language === 'es' ? 'español' : 'English'}. Found ${pre.detectedDates.length} date hints.`,
    )
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
        model: selectedModel,
        onProgress: (message) => {
          setStatusMessage(message)
          pushLog('info', message)
        },
      })

      if (extracted.length > 0) {
        setDetectedLanguage(extracted[0].language ?? null)
      }
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

  // For testing/debugging: bypass the LLM and use only the local parser. Useful when the model crashes or to get deterministic output.
  // const onExtractLocalOnly = async () => {
  //   setErrorMessage(null)
  //   setStatusMessage(null)
  //   setRowErrors({})
  //   setLogEntries([])
  //   nextLogId.current = 1

  //   pushLog('info', 'Starting local-parser-only extraction (no LLM)...')

  //   try {
  //     setIsExtracting(true)
  //     const extracted = await extractTasksFromTranscript({
  //       transcript,
  //       members,
  //       ownerId,
  //       forceFallback: true,
  //       onProgress: (message) => {
  //         setStatusMessage(message)
  //         pushLog('info', message)
  //       },
  //     })

  //     if (extracted.length > 0) {
  //       setDetectedLanguage(extracted[0].language ?? null)
  //     }
  //     setDrafts((current) => [...current, ...extracted])
  //     pushLog(
  //       'success',
  //       `Local parser produced ${extracted.length} draft tasks. Total drafts: ${drafts.length + extracted.length}.`,
  //     )
  //   } catch (error) {
  //     const message = error instanceof Error ? error.message : 'Unable to parse transcript.'
  //     setErrorMessage(message)
  //     pushLog('error', message)
  //   } finally {
  //     setIsExtracting(false)
  //   }
  // }

  const updateDraft = <K extends keyof TaskDraftForCreation>(
    index: number,
    key: K,
    value: TaskDraftForCreation[K],
  ) => {
    setDrafts((current) =>
      current.map((draft, rowIndex) => (rowIndex === index ? { ...draft, [key]: value } : draft)),
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
        if (!payload) continue
        pushLog('info', `Creating task ${index + 1} of ${validPayloads.length}: ${payload.title}`)
        await createMutation.mutateAsync({ projectId, task: payload })
        successCount += 1
        pushLog('success', `Created task: ${payload.title}`)
      }
      const message = `${successCount} tasks created successfully.`
      setStatusMessage(message)
      pushLog('success', message)
      setTimeout(() => closeModal(), 800)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed creating tasks.'
      setErrorMessage(message)
      pushLog('error', message)
    } finally {
      setIsSaving(false)
    }
  }

  const runTestSuite = async () => {
    setIsRunningSuite(true)
    setTestSuiteResults([])
    pushLog('info', 'Starting test suite on all demo transcripts...')

    const results: TestSuiteResult[] = []
    for (const demo of DEMO_FILES) {
      const startedAt = performance.now()
      try {
        pushLog('info', `Suite: loading ${demo.filename}...`)
        const res = await fetch(`/demos/${demo.filename}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const content = await res.text()
        const pre = preprocessTranscript(content, members)
        pushLog(
          'info',
          `Suite: ${demo.filename} → language=${pre.language}, meetingDate=${pre.meetingDate ?? '?'}`,
        )
        const draftsExtracted = await extractTasksFromTranscript({
          transcript: content,
          members,
          ownerId,
          model: selectedModel,
          onProgress: (message) => pushLog('info', `[${demo.filename}] ${message}`),
        })
        results.push({
          filename: demo.filename,
          label: demo.label,
          language: pre.language,
          meetingDate: pre.meetingDate,
          drafts: draftsExtracted,
          durationMs: Math.round(performance.now() - startedAt),
        })
        pushLog(
          'success',
          `Suite: ${demo.filename} → ${draftsExtracted.length} drafts in ${Math.round(performance.now() - startedAt)}ms`,
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          filename: demo.filename,
          label: demo.label,
          language: 'es',
          drafts: [],
          error: message,
          durationMs: Math.round(performance.now() - startedAt),
        })
        pushLog('error', `Suite: ${demo.filename} failed: ${message}`)
      }
    }
    setTestSuiteResults(results)
    setIsRunningSuite(false)
    pushLog('success', `Test suite finished. ${results.length} demos processed.`)
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
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold">AI Task Automation</h2>
                  {detectedLanguage && (
                    <div
                      className="badge badge-outline"
                      title="Detected language of the loaded transcript"
                    >
                      {detectedLanguage === 'es' ? 'Español' : 'English'}
                    </div>
                  )}
                  {detectedMeetingDate && (
                    <div
                      className="badge badge-outline badge-sm"
                      title="Detected meeting date used as reference for relative dates"
                    >
                      Meeting: {detectedMeetingDate}
                    </div>
                  )}
                </div>
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
                    placeholder="Paste meeting transcript here (Spanish or English)..."
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
                    Bilingual (ES/EN). Auto-detects language, dates and assignees. Start date and
                    end date are detected separately. If assignee is not explicitly detected, the
                    task is assigned to the project owner.
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[200px]">
                      <label className="label py-0">
                        <span className="label-text text-xs font-semibold">Model</span>
                      </label>
                      <select
                        className="select select-bordered select-sm w-full"
                        value={selectedModel}
                        onChange={(event) =>
                          setSelectedModel(event.target.value as AvailableModelId)
                        }
                        disabled={isExtracting}
                      >
                        {AVAILABLE_MODELS.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      onClick={() => void onExtract()}
                      disabled={isExtracting || !transcript.trim()}
                    >
                      {isExtracting ? 'Processing...' : 'Process with AI'}
                    </Button>
                    {/* <Button
                      variant="secondary"
                      onClick={() => void onExtractLocalOnly()}
                      disabled={isExtracting || !transcript.trim()}
                      title="Skip the LLM and use the local parser only. Useful when the model crashes or you want deterministic output."
                    >
                      Local parser only
                    </Button> */}
                    {/* <Button
                      variant="secondary"
                      onClick={() => setShowTestSuite((v) => !v)}
                      disabled={isRunningSuite}
                    >
                      {showTestSuite ? 'Hide test suite' : 'Test suite'}
                    </Button> */}
                  </div>
                </div>
              </div>

              {showTestSuite && (
                <div className="rounded-box border border-base-300 bg-base-200/30 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide">
                        Test suite (batched extraction)
                      </h3>
                      <p className="text-xs text-base-content/60">
                        Runs the extraction on all 3 demo transcripts sequentially. Use to compare
                        model versions or prompt changes.
                      </p>
                    </div>
                    <Button size="sm" onClick={() => void runTestSuite()} disabled={isRunningSuite}>
                      {isRunningSuite ? 'Running...' : 'Run on all demos'}
                    </Button>
                  </div>
                  {testSuiteResults.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Demo</th>
                            <th>Lang</th>
                            <th>Meeting</th>
                            <th>Drafts</th>
                            <th>With dates</th>
                            <th>Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {testSuiteResults.map((r) => {
                            const withDates = r.drafts.filter(
                              (d) => d.startAt || d.completedAt,
                            ).length
                            return (
                              <tr key={r.filename}>
                                <td>
                                  <div className="font-medium">{r.label}</div>
                                  <div className="text-xs text-base-content/50">{r.filename}</div>
                                </td>
                                <td>
                                  <div className="badge badge-ghost badge-sm">
                                    {r.language === 'es' ? 'es' : 'en'}
                                  </div>
                                </td>
                                <td className="text-xs">{r.meetingDate ?? '—'}</td>
                                <td>
                                  {r.error ? (
                                    <span className="text-error">{r.error}</span>
                                  ) : (
                                    r.drafts.length
                                  )}
                                </td>
                                <td>{r.error ? '—' : withDates}</td>
                                <td className="text-xs">{r.durationMs}ms</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      {testSuiteResults.some((r) => r.drafts.length > 0) && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-semibold">
                            Show extracted titles per demo
                          </summary>
                          <div className="mt-2 space-y-3">
                            {testSuiteResults.map((r) => (
                              <div key={`titles-${r.filename}`} className="text-xs">
                                <div className="font-semibold">{r.label}</div>
                                <ul className="list-disc pl-5 text-base-content/70">
                                  {r.drafts.map((d, i) => (
                                    <li key={`${r.filename}-${i}`}>
                                      {d.title}
                                      {d.assigneeHint ? ` → @${d.assigneeHint}` : ''}
                                      {d.startAt || d.completedAt
                                        ? ` (${d.startAt ?? '?'} → ${d.completedAt ?? '?'})`
                                        : ''}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              )}

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
                              <span className="label-text font-semibold">Language</span>
                            </label>
                            <div className="input input-bordered flex items-center bg-base-200/40 text-sm">
                              {draft.language === 'en'
                                ? 'English'
                                : draft.language === 'es'
                                  ? 'Español'
                                  : '—'}
                            </div>
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
