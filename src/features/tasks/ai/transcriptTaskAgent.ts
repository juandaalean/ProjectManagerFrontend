import type { ProjectMemberDto } from '../../projects/types/project.types'
import type { TaskPriority } from '../types/task.types'
import { llmTaskExtractionSchema } from './transcriptTaskSchemas'

const DEFAULT_MODEL = 'Llama-3.2-3B-Instruct-q4f32_1-MLC'
const PRIORITY_VALUES: readonly TaskPriority[] = ['Low', 'Medium', 'High', 'Critical']
const MODEL_LOAD_TIMEOUT_MS = 20000
const EXTRACTION_TIMEOUT_MS = 45000

type WebLlmEngine = {
  chat: {
    completions: {
      create: (input: unknown) => Promise<{
        choices?: Array<{
          message?: {
            content?: string | null
          }
        }>
      }>
    }
  }
}

export type TaskDraftForCreation = {
  title: string
  description?: string
  priority: TaskPriority
  assignedUserId: string
  completedAt?: string
  assigneeHint?: string
  confidence?: number
}

export type ExtractTasksFromTranscriptInput = {
  transcript: string
  members: ProjectMemberDto[]
  ownerId: string
  model?: string
  onProgress?: (message: string) => void
}

let engineInstance: WebLlmEngine | null = null
let engineModelLoaded: string | null = null

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()

const normalizePriority = (value?: string): TaskPriority => {
  if (!value) {
    return 'Medium'
  }

  return PRIORITY_VALUES.includes(value as TaskPriority) ? (value as TaskPriority) : 'Medium'
}

const normalizeDate = (value?: string) => {
  if (!value) {
    return undefined
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const resolveAssigneeId = (
  assigneeHint: string | undefined,
  members: ProjectMemberDto[],
  ownerId: string,
) => {
  if (!assigneeHint) {
    return ownerId
  }

  const normalizedHint = normalizeText(assigneeHint)
  const emailMatch = members.find((member) => normalizeText(member.userEmail) === normalizedHint)
  if (emailMatch) {
    return emailMatch.userId
  }

  const nameMatch = members.find((member) => {
    const normalizedName = normalizeText(member.userName)
    return normalizedName.includes(normalizedHint) || normalizedHint.includes(normalizedName)
  })

  return nameMatch?.userId ?? ownerId
}

const buildPrompt = (transcript: string, members: ProjectMemberDto[]) => {
  const membersContext = members
    .map((member) => `- ${member.userName} <${member.userEmail}>`)
    .join('\n')

  return [
    'You extract actionable project tasks from meeting transcripts.',
    'Return ONLY valid JSON with this exact shape:',
    '{"tasks":[{"title":"string","description":"string","priority":"Low|Medium|High|Critical","dueDate":"ISO date or YYYY-MM-DD","assigneeHint":"name or email","confidence":0.0}]}',
    'Rules:',
    '- Extract multiple tasks when present.',
    '- Rewrite the transcript into task language. Do not copy transcript sentences literally.',
    '- Make the title concise, specific, and action-oriented.',
    '- Make the description a clean summary of the action to be done, not a transcript quote.',
    '- If assignee is not clearly mentioned, set assigneeHint to an empty string.',
    '- Keep confidence between 0 and 1.',
    '- No markdown and no extra text outside JSON.',
    'Project members:',
    membersContext || '- No members provided',
    'Transcript:',
    transcript,
  ].join('\n')
}

const extractJsonObject = (rawContent: string) => {
  const content = rawContent
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/```$/i, '')
    .trim()
  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('The model response did not contain a valid JSON object.')
  }

  return content.slice(start, end + 1)
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(timeoutMessage))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

const normalizeDraftText = (value: string) =>
  value
    .replace(/^[\s>*\-–—\d.]+/, '')
    .replace(/^([A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+):\s*/, '')
    .trim()

const sentenceCase = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).replace(/\s+/g, ' ').trim() : value

const stripSpeakerHints = (value: string) =>
  value
    .replace(/^([A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+)( said| says| mencionó| dijo)[:,-]?\s*/i, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .trim()

const buildReadableTaskTitle = (value: string) => {
  const cleaned = stripSpeakerHints(normalizeDraftText(value))
  const fragments = cleaned
    .replace(/^we need to\s+/i, '')
    .replace(/^hay que\s+/i, '')
    .replace(/^debe(?:mos)?\s+/i, '')
    .replace(/^please\s+/i, '')
    .replace(/^por favor\s+/i, '')
    .replace(/^(action item|follow up|follow-up|todo)[:-]*/i, '')
    .trim()

  if (!fragments) {
    return 'Follow up task'
  }

  const title = fragments.length > 90 ? `${fragments.slice(0, 87).trim()}...` : fragments
  return sentenceCase(title)
}

const buildReadableTaskDescription = (value: string) => {
  const cleaned = stripSpeakerHints(normalizeDraftText(value))
  const fragments = cleaned
    .replace(/^(task|tarea|action item|follow up|follow-up|todo)[:-]*/i, '')
    .replace(/^we should\s+/i, '')
    .replace(/^necesitamos\s+/i, '')
    .replace(/^hay que\s+/i, '')
    .replace(/^debe(?:mos)?\s+/i, '')
    .replace(/^please\s+/i, '')
    .replace(/^por favor\s+/i, '')
    .trim()

  if (!fragments) {
    return undefined
  }

  const text = fragments.length > 240 ? `${fragments.slice(0, 237).trim()}...` : fragments
  return sentenceCase(text)
}

const splitTranscriptIntoCandidates = (transcript: string) =>
  transcript
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map(normalizeDraftText)
    .filter(Boolean)

const hasActionKeywords = (value: string) =>
  /\b(todo|task|tarea|action|follow up|follow-up|send|review|check|fix|update|create|prepare|schedule|assign|implement|deliver|resolve|confirm|need to|debe|hay que|revisar|enviar|agendar|asignar)\b/i.test(
    value,
  )

const detectPriority = (value: string): TaskPriority => {
  if (
    /\b(urgent|asap|critical|blocked|bloquead|immediate|prioridad alta|high priority)\b/i.test(
      value,
    )
  ) {
    return 'High'
  }

  if (/\b(low priority|baja prioridad|nice to have)\b/i.test(value)) {
    return 'Low'
  }

  return 'Medium'
}

const extractAssigneeHint = (value: string, members: ProjectMemberDto[]) => {
  const normalizedValue = normalizeText(value)

  const emailMatch = members.find((member) =>
    normalizedValue.includes(normalizeText(member.userEmail)),
  )
  if (emailMatch) {
    return emailMatch.userEmail
  }

  const nameMatch = members.find((member) => {
    const normalizedName = normalizeText(member.userName)
    return normalizedValue.includes(normalizedName) || normalizedName.includes(normalizedValue)
  })

  return nameMatch?.userName
}

const buildFallbackDrafts = (transcript: string, members: ProjectMemberDto[], ownerId: string) => {
  const candidates = splitTranscriptIntoCandidates(transcript)
  const actionable = candidates.filter((line) => hasActionKeywords(line))
  const sourceLines = actionable.length > 0 ? actionable : candidates.slice(0, 5)

  const drafts = sourceLines.slice(0, 10).map((line) => {
    const assigneeHint = extractAssigneeHint(line, members)
    const title = buildReadableTaskTitle(line)
    const description = buildReadableTaskDescription(line)

    return {
      title,
      description,
      priority: detectPriority(line),
      assignedUserId: resolveAssigneeId(assigneeHint, members, ownerId),
      completedAt: undefined,
      assigneeHint,
      confidence: 0.35,
    }
  })

  if (drafts.length === 0) {
    return [
      {
        title: buildReadableTaskTitle(transcript),
        description: buildReadableTaskDescription(transcript),
        priority: 'Medium' as TaskPriority,
        assignedUserId: ownerId,
        completedAt: undefined,
        confidence: 0.2,
      },
    ]
  }

  return drafts
}

async function getEngine(model: string, onProgress?: (message: string) => void) {
  if (engineInstance && engineModelLoaded === model) {
    return engineInstance
  }

  onProgress?.('Loading WebLLM runtime...')
  const webllmModule = await import('@mlc-ai/web-llm')
  onProgress?.('Downloading model (first run can take a while)...')

  const createdEngine = await withTimeout(
    webllmModule.CreateMLCEngine(model, {
      initProgressCallback: (progress: { text?: string }) => {
        if (progress?.text) {
          onProgress?.(progress.text)
        }
      },
    }),
    MODEL_LOAD_TIMEOUT_MS,
    'WebLLM model loading timed out. Falling back to local transcript parsing.',
  )

  engineInstance = createdEngine as unknown as WebLlmEngine
  engineModelLoaded = model
  return engineInstance
}

export async function extractTasksFromTranscript(input: ExtractTasksFromTranscriptInput) {
  const transcript = input.transcript.trim()

  if (!transcript) {
    throw new Error('Transcript is empty. Paste or upload text before processing.')
  }

  const model = input.model ?? DEFAULT_MODEL
  input.onProgress?.(`Preparing model ${model}...`)

  try {
    const engine = await getEngine(model, input.onProgress)
    input.onProgress?.('Model ready. Building extraction prompt...')

    const prompt = buildPrompt(transcript, input.members)
    input.onProgress?.(`Prompt ready. Transcript length: ${transcript.length} characters.`)
    input.onProgress?.('Running task extraction...')

    const completion = await withTimeout(
      engine.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
      EXTRACTION_TIMEOUT_MS,
      'Task extraction timed out while waiting for the model response.',
    )

    const rawContent = completion.choices?.[0]?.message?.content
    if (!rawContent) {
      throw new Error('The model returned an empty response.')
    }

    input.onProgress?.('Response received. Parsing JSON...')

    const parsedJson = JSON.parse(extractJsonObject(rawContent))
    const parsed = llmTaskExtractionSchema.safeParse(parsedJson)

    if (!parsed.success) {
      throw new Error('The model response JSON did not match the expected task schema.')
    }

    input.onProgress?.(`JSON validated. Normalizing ${parsed.data.tasks.length} task drafts...`)

    const drafts = parsed.data.tasks.map((item) => {
      const title = buildReadableTaskTitle(item.title || 'Untitled task')
      const description = item.description
        ? buildReadableTaskDescription(item.description)
        : undefined
      const completedAt = normalizeDate(item.dueDate)

      return {
        title,
        description,
        priority: normalizePriority(item.priority),
        assignedUserId: resolveAssigneeId(item.assigneeHint, input.members, input.ownerId),
        completedAt,
        assigneeHint: item.assigneeHint,
        confidence: item.confidence,
      }
    })

    input.onProgress?.(`Extraction completed. ${drafts.length} tasks proposed.`)
    return drafts
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown model error.'
    input.onProgress?.(`Model unavailable or slow: ${message}`)
    input.onProgress?.('Switching to local fallback parser...')

    const fallbackDrafts = buildFallbackDrafts(transcript, input.members, input.ownerId)
    input.onProgress?.(`Fallback parser generated ${fallbackDrafts.length} task drafts.`)
    return fallbackDrafts
  }
}
