import type { ProjectMemberDto } from '../../projects/types/project.types'
import type { TaskPriority } from '../types/task.types'
import {
  llmItemExtractionSchema,
  type LlmExtractedItem,
  type LlmItemExtraction,
  type SupportedLanguage,
} from './transcriptTaskSchemas'
import {
  preprocessTranscript,
  parseAnyDate,
  type PreprocessedTranscript,
} from './transcriptPreprocessor'

const DEFAULT_MODEL = 'Phi-3.5-mini-instruct-q4f16_1-MLC'
const PRIORITY_VALUES: readonly TaskPriority[] = ['Low', 'Medium', 'High', 'Critical']
const MODEL_LOAD_TIMEOUT_MS = 45000
const EXTRACTION_TIMEOUT_MS = 60000
const MAX_TRANSCRIPT_CHARS = 12000

export const AVAILABLE_MODELS = [
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Qwen 2.5 1.5B (~1.0 GB)', tier: 'small' },
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 1B (~0.8 GB)', tier: 'small' },
  { id: 'gemma-2-2b-it-q4f16_1-MLC', label: 'Gemma 2 2B (~1.6 GB)', tier: 'small' },
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', label: 'Phi-3.5 mini (~2.3 GB)', tier: 'medium' },
] as const

export type AvailableModelId = (typeof AVAILABLE_MODELS)[number]['id']

export const isGpuOutOfMemoryError = (error: unknown): boolean => {
  if (!error) return false
  const message = error instanceof Error ? error.message : String(error)
  return (
    /out of memory/i.test(message) ||
    /GPUOutOfMemory/i.test(message) ||
    /device was lost/i.test(message) ||
    /device lost/i.test(message) ||
    /insufficient memory/i.test(message)
  )
}

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
  startAt?: string
  completedAt?: string
  assigneeHint?: string
  confidence?: number
  language?: SupportedLanguage
}

export type ExtractTasksFromTranscriptInput = {
  transcript: string
  members: ProjectMemberDto[]
  ownerId: string
  model?: string
  forceFallback?: boolean
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
  if (!value) return 'Medium'
  return PRIORITY_VALUES.includes(value as TaskPriority) ? (value as TaskPriority) : 'Medium'
}

const isValidIsoDate = (value: string | undefined): value is string => {
  if (!value) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

const resolveAssigneeId = (
  assigneeHint: string | undefined,
  members: ProjectMemberDto[],
  ownerId: string,
) => {
  if (!assigneeHint) return ownerId
  const normalizedHint = normalizeText(assigneeHint)
  const emailMatch = members.find(
    (member) => normalizeText(member.userEmail) === normalizedHint,
  )
  if (emailMatch) return emailMatch.userId
  const nameMatch = members.find((member) => {
    const normalizedName = normalizeText(member.userName)
    return normalizedName.includes(normalizedHint) || normalizedHint.includes(normalizedName)
  })
  return nameMatch?.userId ?? ownerId
}

const buildSystemPrompt = (language: SupportedLanguage): string => {
  const lang = language === 'es' ? 'español' : 'English'
  return [
    `Eres un asistente experto en extraer tareas de transcripciones de reuniones. Respondes SIEMPRE en ${lang}.`,
    `Devuelves únicamente JSON válido (sin markdown, sin texto extra).`,
    `Piensas paso a paso internamente, pero tu respuesta final es solo el JSON.`,
  ].join('\n')
}

const buildFewShotExamples = (language: SupportedLanguage): string => {
  if (language === 'es') {
    return [
      '---',
      'EJEMPLO 1 (transcripción):',
      '**María:** Tarea: **Desarrollar el módulo de reportes de ventas.**',
      '**María:** Urgencia: Alta.',
      '**María:** Responsable: Juanda.',
      '**María:** Fecha inicio: 15 de julio de 2026.',
      '**María:** Fecha fin: 25 de julio de 2026.',
      '**María:** Requisitos:',
      '* Filtros por región.',
      '* Exportación a Excel.',
      '',
      'SALIDA ESPERADA:',
      JSON.stringify(
        {
          taskTitle: 'Desarrollar el módulo de reportes de ventas',
          taskAssigneeHint: 'Juanda',
          taskStartDate: '2026-07-15',
          taskDueDate: '2026-07-25',
          taskPriority: 'High',
          items: [
            { kind: 'requirement', text: 'Filtros por región', confidence: 0.9 },
            { kind: 'requirement', text: 'Exportación a Excel', confidence: 0.9 },
          ],
        },
        null,
        2,
      ),
      '',
      '---',
      'EJEMPLO 2 (transcripción mixta):',
      'Speaker A: Maria will handle the password recovery feature. She starts on the 10th and the deadline is June 20.',
      'Speaker B: Sounds good, please use a 30-minute token expiration.',
      '',
      'SALIDA ESPERADA:',
      JSON.stringify(
        {
          taskTitle: 'Implement the password recovery feature',
          taskAssigneeHint: 'Maria',
          taskStartDate: '2026-06-10',
          taskDueDate: '2026-06-20',
          taskPriority: 'Medium',
          items: [
            {
              kind: 'spec',
              text: 'Use a 30-minute token expiration',
              confidence: 0.8,
            },
          ],
        },
        null,
        2,
      ),
    ].join('\n')
  }

  return [
    '---',
    'EXAMPLE 1 (transcript):',
    '**Maria:** Task: **Develop the sales reports module.**',
    '**Maria:** Priority: High.',
    '**Maria:** Assignee: John.',
    '**Maria:** Start date: July 15, 2026.',
    '**Maria:** End date: July 25, 2026.',
    '**Maria:** Requirements:',
    '* Region filters.',
    '* Excel export.',
    '',
    'EXPECTED OUTPUT:',
    JSON.stringify(
      {
        taskTitle: 'Develop the sales reports module',
        taskAssigneeHint: 'John',
        taskStartDate: '2026-07-15',
        taskDueDate: '2026-07-25',
        taskPriority: 'High',
        items: [
          { kind: 'requirement', text: 'Region filters', confidence: 0.9 },
          { kind: 'requirement', text: 'Excel export', confidence: 0.9 },
        ],
      },
      null,
      2,
    ),
    '',
    '---',
    'EXAMPLE 2 (mixed transcript):',
    'Speaker A: Maria will handle the password recovery feature. She starts on the 10th and the deadline is June 20.',
    'Speaker B: Sounds good, please use a 30-minute token expiration.',
    '',
    'EXPECTED OUTPUT:',
    JSON.stringify(
      {
        taskTitle: 'Implement the password recovery feature',
        taskAssigneeHint: 'Maria',
        taskStartDate: '2026-06-10',
        taskDueDate: '2026-06-20',
        taskPriority: 'Medium',
        items: [
          {
            kind: 'spec',
            text: 'Use a 30-minute token expiration',
            confidence: 0.8,
          },
        ],
      },
      null,
      2,
    ),
  ].join('\n')
}

const buildUserPrompt = (
  transcript: string,
  preprocessed: PreprocessedTranscript,
  members: ProjectMemberDto[],
) => {
  const language = preprocessed.language
  const membersContext = members
    .map((member) => `- ${member.userName} <${member.userEmail}>`)
    .join('\n')

  const rules = language === 'es'
    ? [
        '- Extraes UN objeto JSON por transcripción. NO decides cuántas tareas crear (otra capa las divide si ves `>>> TASK START >>>`).',
        '- Tu salida SIEMPRE en español, mismo idioma que la transcripción.',
        '- Detecta "Fecha inicio" (start) y "Fecha fin" / "Fecha límite" (end) por separado cuando aparezcan.',
        '- taskStartDate: solo si hay fecha explícita de inicio. Si no, cadena vacía.',
        '- taskDueDate: solo la fecha final / deadline. NO fechas intermedias.',
        '- taskTitle: empieza con verbo en infinitivo (Desarrollar, Implementar, Crear, Migrar, Configurar, etc.). Sin nombre de persona, sin fecha.',
        '- taskAssigneeHint: solo quien aceptó explícitamente ("me encargo", "yo lo hago", "lo haré", "asignada a X"). Vacío si no está claro.',
        '- taskPriority: "High" si hay deadline duro, "Medium" por defecto, "Low" si es nice-to-have, "Critical" solo si bloquea / ASAP.',
        '- kinds de items:',
        '  - "requirement" = requisito funcional',
        '  - "spec" = detalle técnico (endpoint, frecuencia, framework)',
        '  - "decision" = decisión de diseño',
        '  - "date" = fecha con etiqueta, pon la etiqueta en text y la ISO en date',
        '  - "start_date" = fecha de inicio explícita separada de la fecha fin',
        '  - "assignee" = asignación explícita',
        '  - "context" = contexto de fondo',
        '  - "block_start" = inicio de una nueva tarea (cuando hay `>>> TASK START >>>`)',
        '- Si la transcripción tiene varias tareas delimitadas por `>>> TASK START >>>`, emite un `block_start` por cada una con su `taskTitle`, `assigneeHint`, `date`, `priority`.',
        '- Un item por pieza de información. NO fusiones, NO resumas.',
        '- Salta saludos, small talk y recapitulaciones finales que repiten info.',
        '- assigneeHint en un item: solo si ese item tiene un dueño distinto al de la tarea principal.',
        '- startDate en un item: solo para fechas de inicio separadas. date en un item: para deadlines intermedios / hitos.',
        '- Si hay pistas tipo [DATE#N=YYYY-MM-DD] en la transcripción preprocesada, USA ESA ISO directamente.',
        '- project members abajo; usa esos nombres exactos para assigneeHint.',
        '',
        'FORMATO (no copies literalmente, solo respeta la forma):',
        '{',
        '  "taskTitle": "Desarrollar el módulo X",',
        '  "taskAssigneeHint": "Juanda",',
        '  "taskStartDate": "2026-07-15",',
        '  "taskDueDate": "2026-07-25",',
        '  "taskPriority": "High",',
        '  "language": "es",',
        '  "items": [',
        '    { "kind": "requirement", "text": "Filtros por región", "confidence": 0.9 }',
        '  ]',
        '}',
      ]
    : [
        '- Extract ONE JSON object per transcript. Do NOT decide how many tasks to create (another layer splits on `>>> TASK START >>>`).',
        '- Output ALWAYS in English, same language as the transcript.',
        '- Detect "Start date" and "End date" / "Due date" / "Deadline" separately when both appear.',
        '- taskStartDate: only if an explicit start date is mentioned. Empty string otherwise.',
        '- taskDueDate: only the final deadline. NOT intermediate dates.',
        '- taskTitle: start with a base verb (Develop, Implement, Create, Migrate, Configure, etc.). No person name, no date.',
        '- taskAssigneeHint: only the person who explicitly accepted ("I will do it", "I take it", "assigned to X"). Empty if unclear.',
        '- taskPriority: "High" if there is a hard deadline, "Medium" by default, "Low" for nice-to-have, "Critical" only if blocked/ASAP.',
        '- item kinds:',
        '  - "requirement" = functional requirement',
        '  - "spec" = technical detail (endpoint, frequency, framework)',
        '  - "decision" = design decision',
        '  - "date" = date with label, put label in text and ISO in date',
        '  - "start_date" = explicit start date separated from end date',
        '  - "assignee" = explicit assignment statement',
        '  - "context" = background context',
        '  - "block_start" = start of a new task (when `>>> TASK START >>>` appears)',
        '- If the transcript has multiple tasks delimited by `>>> TASK START >>>`, emit a `block_start` per task with its own `taskTitle`, `assigneeHint`, `date`, `priority`.',
        '- One item per piece of information. Do NOT merge, do NOT summarize across items.',
        '- Skip greetings, small talk and final recaps that repeat information.',
        '- assigneeHint on an item: only if that item has a different owner than the main task.',
        '- startDate on an item: only for separated start dates. date on an item: for intermediate deadlines / milestones.',
        '- If you see [DATE#N=YYYY-MM-DD] hints in the preprocessed transcript, USE THAT ISO directly.',
        '- Project members below; use those exact names for assigneeHint.',
        '',
        'FORMAT (do not copy literally, just respect the shape):',
        '{',
        '  "taskTitle": "Develop the X module",',
        '  "taskAssigneeHint": "John",',
        '  "taskStartDate": "2026-07-15",',
        '  "taskDueDate": "2026-07-25",',
        '  "taskPriority": "High",',
        '  "language": "en",',
        '  "items": [',
        '    { "kind": "requirement", "text": "Region filters", "confidence": 0.9 }',
        '  ]',
        '}',
      ]

  return [
    rules.join('\n'),
    '',
    'FEW-SHOT EXAMPLES:',
    buildFewShotExamples(language),
    '',
    'PROJECT MEMBERS (use these exact names for assigneeHint):',
    membersContext || '- No members provided',
    '',
    'PREPROCESSED TRANSCRIPT:',
    transcript,
  ].join('\n')
}

const truncateTranscript = (text: string): string => {
  if (text.length <= MAX_TRANSCRIPT_CHARS) return text
  const head = text.slice(0, MAX_TRANSCRIPT_CHARS * 0.7)
  const tail = text.slice(text.length - MAX_TRANSCRIPT_CHARS * 0.2)
  return `${head}\n\n[...transcript truncated for length...]\n\n${tail}`
}

const extractJsonObject = (rawContent: string): string => {
  const content = rawContent
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
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
        timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

const MONTHS_ES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9,
  noviembre: 10, diciembre: 11,
}

const MONTHS_EN: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
  april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
  august: 7, aug: 7, september: 8, sept: 8, sep: 8,
  october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
}

const looksLikeDate = (value: string): boolean =>
  /\b\d{1,2}\s+de\s+\w+/i.test(value) ||
  /\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/.test(value) ||
  /\b[A-Z][a-z]+\s+\d{1,2}/i.test(value) ||
  /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?[A-Z][a-z]+/i.test(value) ||
  /\b(ma[ñn]ana|tomorrow|hoy|today|day\s+after\s+tomorrow|pasado\s+ma[ñn]ana)\b/i.test(value)

const parseSpanishDate = (value: string, referenceYear?: number): string | undefined => {
  const m = value.match(/\b(\d{1,2})\s+de\s+([a-záéíóú]+)\b/i)
  if (!m) return undefined
  const day = Number(m[1])
  const month = MONTHS_ES[m[2].toLowerCase()]
  if (!Number.isFinite(day) || month === undefined) return undefined
  const year = referenceYear ?? new Date().getUTCFullYear()
  const date = new Date(Date.UTC(year, month, day))
  if (Number.isNaN(date.getTime())) return undefined
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

const parseEnglishDate = (value: string, referenceYear?: number): string | undefined => {
  const monthFirst = value.match(/\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{2,4}))?\b/)
  if (monthFirst) {
    const month = MONTHS_EN[monthFirst[1].toLowerCase()]
    const day = Number(monthFirst[2])
    if (month !== undefined && Number.isFinite(day)) {
      const year = monthFirst[3] ? Number(monthFirst[3]) : referenceYear ?? new Date().getUTCFullYear()
      const fullYear = year < 100 ? year + 2000 : year
      const date = new Date(Date.UTC(fullYear, month, day))
      if (!Number.isNaN(date.getTime())) {
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
      }
    }
  }
  const dayFirst = value.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]+)(?:,?\s+(\d{2,4}))?\b/)
  if (dayFirst) {
    const day = Number(dayFirst[1])
    const month = MONTHS_EN[dayFirst[2].toLowerCase()]
    if (month !== undefined && Number.isFinite(day)) {
      const year = dayFirst[3] ? Number(dayFirst[3]) : referenceYear ?? new Date().getUTCFullYear()
      const fullYear = year < 100 ? year + 2000 : year
      const date = new Date(Date.UTC(fullYear, month, day))
      if (!Number.isNaN(date.getTime())) {
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
      }
    }
  }
  return undefined
}

const parseAnyDateInText = (
  value: string,
  language: SupportedLanguage,
  referenceYear?: number,
): string | undefined => {
  const absolute =
    language === 'es'
      ? parseSpanishDate(value, referenceYear)
      : parseEnglishDate(value, referenceYear)
  if (absolute) return absolute

  const numeric = value.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-]\d{2,4})?\b/)
  if (numeric) {
    const a = Number(numeric[1])
    const b = Number(numeric[2])
    const yearRaw = numeric[3] ? Number(numeric[3]) : referenceYear ?? new Date().getUTCFullYear()
    const year = yearRaw < 100 ? yearRaw + 2000 : yearRaw
    const dayFirst = a > 12 ? a : b > 12 ? b : a
    const month = a > 12 ? b : b > 12 ? a : a
    const date = new Date(Date.UTC(year, month - 1, dayFirst))
    if (!Number.isNaN(date.getTime())) {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
    }
  }

  const relative = parseAnyDate(value, language)
  if (relative) {
    return `${relative.date.getUTCFullYear()}-${String(relative.date.getUTCMonth() + 1).padStart(2, '0')}-${String(relative.date.getUTCDate()).padStart(2, '0')}`
  }
  return undefined
}

const findMemberInText = (value: string, members: ProjectMemberDto[]): string | undefined => {
  const normalizedValue = normalizeText(value)
  const emailMatch = members.find((member) =>
    normalizedValue.includes(normalizeText(member.userEmail)),
  )
  if (emailMatch) return emailMatch.userName
  const nameMatch = members.find((member) => {
    const normalizedName = normalizeText(member.userName)
    return normalizedValue.includes(normalizedName) || normalizedName.includes(normalizedValue)
  })
  return nameMatch?.userName
}

const extractTaskTitleFromLine = (line: string, language: SupportedLanguage): string | undefined => {
  const headerPattern = language === 'es' ? /\bTarea\s*:/i : /\bTask\s*:/i
  if (!headerPattern.test(line)) return undefined
  const excludePattern = language === 'es'
    ? /\b(prioridad|asignad[oa]|responsable|fecha\s+l[ií]mite|requisitos?|especificaciones?|urgencia|fecha\s+inicio|fecha\s+fin)\b/i
    : /\b(priority|assignee|responsible|deadline|due\s+date|requirements?|specifications?|start\s+date|end\s+date)\b/i
  if (excludePattern.test(line)) return undefined

  const boldMatch = line.match(/(?:Tarea|Task)\s*:\s*\*+([^*\n]+?)\*+\.?/i)
  if (boldMatch) {
    return boldMatch[1].replace(/^[""*\s]+|[""*\s]+$/g, '').trim()
  }
  const plainMatch = line.match(/(?:Tarea|Task)\s*:\s+([^*\n][^\n]+?)\.?$/i)
  if (plainMatch) {
    return plainMatch[1].replace(/^[""*\s]+|[""*\s]+$/g, '').trim()
  }
  return undefined
}

const extractPriorityFromLine = (
  line: string,
  language: SupportedLanguage,
): 'Low' | 'Medium' | 'High' | 'Critical' | undefined => {
  const normalized = line.toLowerCase()
  if (language === 'es') {
    if (/\b(cr[ií]tica|critical)\b/.test(normalized)) return 'Critical'
    if (/\b(alta|high)\b/.test(normalized)) return 'High'
    if (/\b(media|medium)\b/.test(normalized)) return 'Medium'
    if (/\b(baja|low)\b/.test(normalized)) return 'Low'
  } else {
    if (/\bcritical\b/.test(normalized)) return 'Critical'
    if (/\bhigh\b/.test(normalized)) return 'High'
    if (/\bmedium\b/.test(normalized)) return 'Medium'
    if (/\blow\b/.test(normalized)) return 'Low'
  }
  return undefined
}

const extractAssigneeFromAssigneeLine = (
  line: string,
  members: ProjectMemberDto[],
  language: SupportedLanguage,
): string | undefined => {
  const boldPattern = language === 'es'
    ? /(?:asignad[oa]s?\s+a|responsable\s*:?|esta\s+tarea\s+(?:ser[áa]|queda)\s+(?:para|asignad[oa]\s+a))\s*\*+([^*\n,.]+?)\*+/i
    : /(?:assigned\s+to|assignee\s*:?|responsible\s*:?|this\s+task\s+(?:will\s+be|goes\s+to))\s*\*+([^*\n,.]+?)\*+/i
  const boldMatch = line.match(boldPattern)
  if (boldMatch) {
    const candidate = findMemberInText(boldMatch[1], members)
    if (candidate) return candidate
  }

  const plainPattern = language === 'es'
    ? /(?:asignad[oa]s?\s+a|responsable\s*:?|esta\s+tarea\s+(?:ser[áa]|queda)\s+(?:para|asignad[oa]\s+a))\s*:?\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ'.-]*)/i
    : /(?:assigned\s+to|assignee\s*:?|responsible\s*:?|this\s+task\s+(?:will\s+be|goes\s+to))\s*:?\s*([A-Za-z][A-Za-z'.-]*)/i
  const plainMatch = line.match(plainPattern)
  if (plainMatch) {
    const candidate = findMemberInText(plainMatch[1].trim(), members)
    if (candidate) return candidate
  }

  return undefined
}

const extractDatesFromLine = (
  line: string,
  language: SupportedLanguage,
  referenceYear: number | undefined,
): { start?: string; end?: string } => {
  if (!looksLikeDate(line)) return {}

  const startLabelPattern = language === 'es'
    ? /\b(?:fecha\s+de?\s*inicio|inicio|empieza(?:r)?|arranca(?:r)?|start)\b/i
    : /\b(?:start\s+date|start|begin(?:s)?)\b/i
  const endLabelPattern = language === 'es'
    ? /\b(?:fecha\s+(?:l[ií]mite|fin|de\s+entrega|final)|entrega\s+final|deadline|fin|termina(?:r)?)\b/i
    : /\b(?:end\s+date|due\s+date|deadline|delivery|finish(?:es)?)\b/i

  const iso = parseAnyDateInText(line, language, referenceYear)
  if (!iso) return {}

  if (startLabelPattern.test(line) && !endLabelPattern.test(line)) {
    return { start: iso }
  }
  if (endLabelPattern.test(line) && !startLabelPattern.test(line)) {
    return { end: iso }
  }
  return { end: iso }
}

const extractUrgencyAsPriority = (
  line: string,
  language: SupportedLanguage,
): 'Low' | 'Medium' | 'High' | 'Critical' | undefined => {
  if (language === 'es' && /\burgencia\s*:/i.test(line)) {
    return extractPriorityFromLine(line, language)
  }
  if (language === 'en' && /\burgency\s*:/i.test(line)) {
    return extractPriorityFromLine(line, language)
  }
  return undefined
}

type RawTaskBlock = {
  title: string
  priority?: 'Low' | 'Medium' | 'High' | 'Critical'
  assigneeHint?: string
  startDate?: string
  dueDate?: string
  requirements: string[]
  context: string[]
  spec: string[]
  preamble: string[]
}

const ACKNOWLEDGMENT_PATTERN_ES =
  /^(de acuerdo|entendido|entendid[oa]|perfecto|correcto|anotado|adelante|contin[uú]a|sin problema|vale|s[ií]\s*[,.]?|ok|gracias|nota|sip|claro|sin m[áa]s|procedemos)\.?$/i
const ACKNOWLEDGMENT_PATTERN_EN =
  /^(ok|sure|got it|understood|agreed|noted|will do|sounds good|alright|continue|go ahead|thanks|thank you|yes|yeah|yep|no problem)\.?$/i

const isAcknowledgment = (text: string, language: SupportedLanguage): boolean => {
  const cleaned = text.replace(/^[\s*\-–—]+/, '').trim()
  if (!cleaned) return true
  const pattern = language === 'es' ? ACKNOWLEDGMENT_PATTERN_ES : ACKNOWLEDGMENT_PATTERN_EN
  return pattern.test(cleaned)
}

const sliceTranscriptIntoTaskBlocks = (
  transcript: string,
  members: ProjectMemberDto[],
  language: SupportedLanguage,
  referenceYear: number | undefined,
): RawTaskBlock[] => {
  const lines = transcript
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  const blocks: RawTaskBlock[] = []
  let current: RawTaskBlock | null = null
  let preambleBuffer: string[] = []

  const pushBlock = (block: RawTaskBlock) => {
    if (
      block.title ||
      block.requirements.length > 0 ||
      block.context.length > 0 ||
      block.spec.length > 0 ||
      block.preamble.length > 0
    ) {
      blocks.push(block)
    }
  }

  const isSpeakerLine = (text: string): boolean => {
    return /^\*\*[^*]+:\*\*/.test(text) || /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+:\s/.test(text)
  }

  for (const line of lines) {
    const speakerMatch = line.match(/^\*\*[^*]+:\*\*\s*(.*)$/)
    const cleaned = (speakerMatch ? speakerMatch[1] : line)
      .replace(/^\*\*[^*]+:\*\*\s*/, '')
      .replace(/^Speaker\s+[A-Z]:\s*/i, '')
      .replace(/^\*\*|\*\*$/g, '')
      .trim()
    if (!cleaned) continue

    const titleCandidate = extractTaskTitleFromLine(cleaned, language)
    if (titleCandidate) {
      if (current) {
        current.preamble = preambleBuffer.slice(-3)
        pushBlock(current)
      }
      current = {
        title: titleCandidate,
        requirements: [],
        context: [],
        spec: [],
        preamble: [],
      }
      preambleBuffer = []
      continue
    }

    if (!current) {
      if (isSpeakerLine(line)) {
        if (!isAcknowledgment(cleaned, language)) {
          preambleBuffer.push(cleaned)
        }
      }
      continue
    }

    const urgency = extractUrgencyAsPriority(cleaned, language)
    if (urgency && !current.priority) {
      current.priority = urgency
      continue
    }
    const priority = extractPriorityFromLine(cleaned, language)
    if (priority && !current.priority) {
      current.priority = priority
      continue
    }

    const assignee = extractAssigneeFromAssigneeLine(cleaned, members, language)
    if (assignee && !current.assigneeHint) {
      current.assigneeHint = assignee
      continue
    }

    const dates = extractDatesFromLine(cleaned, language, referenceYear)
    if (dates.start && !current.startDate) {
      current.startDate = dates.start
    }
    if (dates.end && !current.dueDate) {
      current.dueDate = dates.end
    }
    if (dates.start || dates.end) continue

    const sectionHeaderPattern = language === 'es'
      ? /^\s*(Requisitos?|Especificaciones?|Debe incluir:?|Specifications?):?\s*$/i
      : /^\s*(Requirements?|Specifications?|Must include:?|Details?):?\s*$/i
    if (sectionHeaderPattern.test(cleaned)) continue

    if (
      /^\s*\*\s+/.test(cleaned) ||
      /^\s*-\s+/.test(cleaned) ||
      /^\s*\d+\.\s+/.test(cleaned)
    ) {
      const bulletText = cleaned
        .replace(/^\s*[*\-–—]\s+/, '')
        .replace(/^\s*\d+\.\s+/, '')
        .replace(/\*+/g, '')
        .trim()
      if (!bulletText) continue
      if (/→/.test(bulletText) && /\b(prioridad|responsable|asignad[oa]|priority|assignee)\b/i.test(bulletText)) {
        continue
      }
      if (/^\s*(?:resumen\s+final|final\s+summary)\b/i.test(bulletText)) continue
      current.requirements.push(bulletText)
      continue
    }

    if (isSpeakerLine(line) && !isAcknowledgment(cleaned, language)) {
      if (preambleBuffer.length < 3) {
        preambleBuffer.push(cleaned)
      }
    }
  }

  if (current) {
    current.preamble = preambleBuffer.slice(-3)
    pushBlock(current)
  }
  return blocks
}

const scanNaturalTranscript = (
  transcript: string,
  members: ProjectMemberDto[],
  language: SupportedLanguage,
  referenceYear: number | undefined,
): RawTaskBlock[] => {
  const lines = transcript
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  const blocks: RawTaskBlock[] = []
  let current: RawTaskBlock | null = null
  let preambleBuffer: string[] = []

  const pushBlock = (block: RawTaskBlock) => {
    if (
      block.title ||
      block.requirements.length > 0 ||
      block.spec.length > 0 ||
      block.preamble.length > 0
    ) {
      blocks.push(block)
    }
  }

  const ordinalPattern = language === 'es'
    ? /^\s*(?:Primera|Segunda|Tercera|Cuarta|Quinta|Sexta|S[eé]ptima|Octava|Novena|D[eé]cima|[\d]+(?:ª|a|º)?)\s+tarea\.?\s*$/i
    : /^\s*(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|[\d]+(?:st|nd|rd|th)?)\s+task\.?\s*$/i

  const isSpeakerLine = (text: string): boolean =>
    /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?:\s/.test(text) ||
    /^\*\*[^*]+:\*\*/.test(text)

  for (const line of lines) {
    const cleaned = line.replace(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+:\s*/, '').trim()
    if (!cleaned) continue

    if (ordinalPattern.test(cleaned)) {
      if (current) {
        current.preamble = preambleBuffer.slice(-3)
        pushBlock(current)
      }
      current = { title: '', requirements: [], context: [], spec: [], preamble: [] }
      preambleBuffer = []
      continue
    }

    const namedMatch = language === 'es'
      ? cleaned.match(/(?:funcionalidad|m[oó]dulo|sistema|p[aá]gina)\s+(?:llamad[oa]|denominad[oa]|nombrad[oa])\s+["""]?([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][^.,!\n]*?)["""]?(?:\.|$)/i)
      : cleaned.match(/(?:feature|module|system|page)\s+(?:called|named)\s+["""]?([A-Za-z][^.,!\n]*?)["""]?(?:\.|$)/i)
    if (namedMatch) {
      if (current) {
        current.preamble = preambleBuffer.slice(-3)
        pushBlock(current)
      }
      current = { title: namedMatch[1].trim(), requirements: [], context: [], spec: [], preamble: [] }
      preambleBuffer = []
      continue
    }

    const verbs = language === 'es'
      ? '(?:Desarrollar|Actualizar|Mejorar|Crear|Revisar|Implementar|Construir|Optimizar|Migrar|Dise[ñn]ar|Configurar)'
      : '(?:Develop|Update|Improve|Create|Review|Implement|Build|Optimize|Migrate|Design|Configure)'
    const imperativeTitleMatch = cleaned.match(
      new RegExp(`^\\s*${verbs}\\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ].{4,})$`, 'i'),
    )
    if (imperativeTitleMatch) {
      if (current) {
        current.preamble = preambleBuffer.slice(-3)
        pushBlock(current)
      }
      const verb = imperativeTitleMatch[1]
      const rest = imperativeTitleMatch[2].replace(/\.+$/, '').trim()
      current = {
        title: `${verb} ${rest}`.trim(),
        requirements: [],
        context: [],
        spec: [],
        preamble: [],
      }
      preambleBuffer = []
      continue
    }

    const taskConsistMatch = language === 'es'
      ? cleaned.match(/[Ll]a\s+tarea\s+consiste\s+en\s+(.+)/i)
      : cleaned.match(/[Tt]he\s+task\s+(?:is\s+to|consists?\s+of)\s+(.+)/i)
    if (taskConsistMatch && current) {
      current.requirements.push(taskConsistMatch[1].trim())
      continue
    }

    if (!current) {
      const triggerPattern = language === 'es'
        ? /\b(mejora|optimizar|desarrollar|crear|implementar|m[oó]dulo|funcionalidad|sistema)\b/i
        : /\b(improve|optimize|develop|create|implement|module|feature|system)\b/i
      if (triggerPattern.test(cleaned)) {
        current = { title: '', requirements: [], context: [], spec: [], preamble: [] }
      } else {
        if (isSpeakerLine(line) && !isAcknowledgment(cleaned, language)) {
          if (preambleBuffer.length < 3) preambleBuffer.push(cleaned)
        }
        continue
      }
    }

    const assigneePattern = language === 'es'
      ? /(?:voy a asignar|asigno|asigna[rmos]?|esta\s+tarea\s+(?:queda\s+)?asignad[oa]\s+a|ser[áa]\s+para|responsable\s*:?)\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)/i
      : /(?:i(?:'ll|\s+will)\s+assign|assigning|this\s+task\s+(?:is\s+)?assigned\s+to|will\s+be\s+for|responsible\s*:?)\s*([A-Za-z]+)/i
    const assigneeMatch = cleaned.match(assigneePattern)
    if (assigneeMatch) {
      const assigned = findMemberInText(assigneeMatch[1], members)
      if (assigned) current.assigneeHint = assigned
      continue
    }
    const takesPattern = language === 'es'
      ? /(me\s+encargo|de\s+acuerdo,\s*me\s+encargo)/i
      : /(i(?:'ll|\s+will)\s+(?:do|take|handle)\s+it|i\s+take\s+it|sure,?\s+i(?:'ll|\s+will))/i
    const takesMatch = cleaned.match(takesPattern)
    if (takesMatch && !current.assigneeHint && members.length > 0) {
      const speaker = line.match(/^([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+):/)?.[1]
      if (speaker) {
        const assigned = findMemberInText(speaker, members)
        if (assigned) current.assigneeHint = assigned
      }
    }

    const dates = extractDatesFromLine(cleaned, language, referenceYear)
    if (dates.start && !current.startDate) current.startDate = dates.start
    if (dates.end && !current.dueDate) current.dueDate = dates.end

    const specPattern = language === 'es'
      ? /\b(endpoint|api|actualice|cada\s+\d+\s+minutos?|autom[aá]ticamente)\b/i
      : /\b(endpoint|api|update|every\s+\d+\s+minutes?|automatically)\b/i
    if (specPattern.test(cleaned)) {
      current.spec.push(cleaned)
      continue
    }

    const requirementStartVerbs = language === 'es'
      ? '(?:Crear|Mostrar|Permitir|A[ñn]adir|Implementar|Garantizar|Identificar|Actualizar|Ejecutar|Verificar|Generar|Incorporar|Registrar|Adaptar|Informar)'
      : '(?:Create|Show|Allow|Add|Implement|Ensure|Identify|Update|Execute|Verify|Generate|Incorporate|Record|Adapt|Report)'
    const requirementStartPattern = new RegExp(
      `^\\s*\\d+\\.\\s|^\\s*[*\\-–—]\\s+|^(?:${requirementStartVerbs})`,
      'i',
    )
    if (requirementStartPattern.test(cleaned)) {
      const bulletText = cleaned
        .replace(/^\s*[*\-–—]\s+/, '')
        .replace(/^\s*\d+\.\s+/, '')
        .replace(/\*+/g, '')
        .trim()
      if (!bulletText) continue
      if (/→/.test(bulletText) && /\b(prioridad|responsable|asignad[oa]|priority|assignee)\b/i.test(bulletText)) {
        continue
      }
      if (/^\s*(?:resumen\s+final|final\s+summary)\b/i.test(bulletText)) continue
      current.requirements.push(bulletText)
      continue
    }
  }

  if (current) {
    current.preamble = preambleBuffer.slice(-3)
    pushBlock(current)
  }
  return blocks
}

const emitBlockItems = (block: RawTaskBlock, items: LlmExtractedItem[]): void => {
  for (const ctx of block.preamble) {
    items.push({ kind: 'context', text: ctx, confidence: 0.3 })
  }
  for (const ctx of block.context) {
    items.push({ kind: 'context', text: ctx, confidence: 0.3 })
  }
  for (const req of block.requirements) {
    items.push({ kind: 'requirement', text: req, confidence: 0.4 })
  }
  for (const spec of block.spec) {
    items.push({ kind: 'spec', text: spec, confidence: 0.4 })
  }
}

const buildFallbackItemExtraction = (
  transcript: string,
  members: ProjectMemberDto[],
  language: SupportedLanguage,
  referenceYear: number | undefined,
): LlmItemExtraction => {
  const blocks = sliceTranscriptIntoTaskBlocks(transcript, members, language, referenceYear)

  if (blocks.length === 0) {
    const naturalBlocks = scanNaturalTranscript(transcript, members, language, referenceYear)
    if (naturalBlocks.length === 0) {
      return {
        items: [],
        taskTitle: '',
        taskAssigneeHint: '',
        taskStartDate: '',
        taskDueDate: '',
        taskPriority: 'Medium',
        language,
        confidence: 0.2,
      }
    }

    if (naturalBlocks.length === 1) {
      const block = naturalBlocks[0]
      const items: LlmExtractedItem[] = []
      emitBlockItems(block, items)
      return {
        items,
        taskTitle: block.title,
        taskAssigneeHint: block.assigneeHint ?? '',
        taskStartDate: block.startDate ?? '',
        taskDueDate: block.dueDate ?? '',
        taskPriority: 'Medium',
        language,
        confidence: 0.4,
      }
    }

    const items: LlmExtractedItem[] = []
    for (const block of naturalBlocks) {
      items.push({
        kind: 'block_start',
        text: block.title,
        taskTitle: block.title,
        assigneeHint: block.assigneeHint,
        date: block.dueDate,
        startDate: block.startDate,
        priority: block.priority,
        confidence: 0.5,
      })
      emitBlockItems(block, items)
    }
    const first = naturalBlocks[0]
    return {
      items,
      taskTitle: first.title,
      taskAssigneeHint: first.assigneeHint ?? '',
      taskStartDate: first.startDate ?? '',
      taskDueDate: first.dueDate ?? '',
      taskPriority: first.priority ?? 'Medium',
      language,
      confidence: 0.4,
    }
  }

  if (blocks.length === 1) {
    const block = blocks[0]
    const items: LlmExtractedItem[] = []
    emitBlockItems(block, items)
    return {
      items,
      taskTitle: block.title,
      taskAssigneeHint: block.assigneeHint ?? '',
      taskStartDate: block.startDate ?? '',
      taskDueDate: block.dueDate ?? '',
      taskPriority: block.priority ?? 'Medium',
      language,
      confidence: 0.4,
    }
  }

  const items: LlmExtractedItem[] = []
  for (const block of blocks) {
    items.push({
      kind: 'block_start',
      text: block.title,
      taskTitle: block.title,
      assigneeHint: block.assigneeHint,
      date: block.dueDate,
      startDate: block.startDate,
      priority: block.priority,
      confidence: 0.5,
    })
    emitBlockItems(block, items)
  }

  const first = blocks[0]
  return {
    items,
    taskTitle: first.title,
    taskAssigneeHint: first.assigneeHint ?? '',
    taskStartDate: first.startDate ?? '',
    taskDueDate: first.dueDate ?? '',
    taskPriority: first.priority ?? 'Medium',
    language,
    confidence: 0.4,
  }
}

const finalizeText = (value: string): string => {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (!trimmed) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

const cleanupItemText = (value: string): string =>
  value
    .replace(/^([A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+):\s*/, '')
    .replace(/^we need to\s+/i, '')
    .replace(/^hay que\s+/i, '')
    .replace(/^debe(?:mos)?\s+/i, '')
    .replace(/^please\s+/i, '')
    .replace(/^por favor\s+/i, '')
    .replace(/^(action item|follow up|follow-up|todo)[:-]*/i, '')
    .replace(/\s+/g, ' ')
    .trim()

const buildDraftForBlock = ({
  headerItem,
  items,
  members,
  ownerId,
  language,
}: {
  headerItem: LlmExtractedItem
  items: LlmExtractedItem[]
  members: ProjectMemberDto[]
  ownerId: string
  language: SupportedLanguage
}): TaskDraftForCreation | null => {
  const context = items.filter((i) => i.kind === 'context')
  const requirements = items.filter(
    (i) => i.kind === 'requirement' || i.kind === 'decision',
  )
  const specs = items.filter((i) => i.kind === 'spec')

  const sections: string[] = []
  const contextSentence = context.map((i) => finalizeText(i.text).replace(/\.$/, '')).join(' ')
  if (contextSentence) sections.push(`${contextSentence}.`)

  if (requirements.length > 0) {
    const bullets = requirements
      .map((i) => `- ${finalizeText(i.text).replace(/\.$/, '')}`)
      .join('\n')
    const label = language === 'es' ? 'Requisitos' : 'Requirements'
    sections.push(`${label}:\n${bullets}`)
  }

  if (specs.length > 0) {
    const bullets = specs.map((i) => `- ${finalizeText(i.text).replace(/\.$/, '')}`).join('\n')
    const label = language === 'es' ? 'Detalles técnicos' : 'Technical details'
    sections.push(`${label}:\n${bullets}`)
  }

  let description = sections.join('\n\n')
  if (description.length > 8000) {
    description = `${description.slice(0, 7997).trim()}...`
  }

  const titleBase =
    headerItem.taskTitle?.trim() || headerItem.text.trim() ||
    (language === 'es' ? 'Tarea extraída de la reunión' : 'Task extracted from meeting')
  const title = finalizeText(titleBase)

  const assigneeHint = headerItem.assigneeHint?.trim() || ''
  const dueDate = headerItem.date?.trim() || ''
  const startDate = headerItem.startDate?.trim() || ''
  const priority = headerItem.priority

  return {
    title,
    description: description || undefined,
    priority: priority ?? 'Medium',
    assignedUserId: resolveAssigneeId(assigneeHint, members, ownerId),
    startAt: isValidIsoDate(startDate) ? startDate : undefined,
    completedAt: isValidIsoDate(dueDate) ? dueDate : undefined,
    assigneeHint: assigneeHint || undefined,
    confidence: headerItem.confidence ?? 0.5,
    language,
  }
}

const consolidateAsSingleTask = (
  extraction: LlmItemExtraction,
  deduped: LlmExtractedItem[],
  members: ProjectMemberDto[],
  ownerId: string,
): TaskDraftForCreation[] => {
  const language: SupportedLanguage = extraction.language ?? 'es'
  const grouped = new Map<string, LlmExtractedItem[]>()
  for (const item of deduped) {
    const owner = item.assigneeHint?.trim() || '__main__'
    if (!grouped.has(owner)) grouped.set(owner, [])
    grouped.get(owner)!.push(item)
  }

  const mainGroup: LlmExtractedItem[] = []
  const sideGroups: Array<[string, LlmExtractedItem[]]> = []
  for (const [owner, items] of grouped.entries()) {
    if (owner === '__main__' || items.length < 2) {
      mainGroup.push(...items)
    } else {
      sideGroups.push([owner, items])
    }
  }

  const mainKeys = new Set<string>()
  const mainDeduped = mainGroup.filter((item) => {
    const key = `${item.kind}::${normalizeText(item.text)}`
    if (mainKeys.has(key)) return false
    mainKeys.add(key)
    return true
  })

  const drafts: TaskDraftForCreation[] = []

  const buildDraftForGroup = (
    groupOwnerHint: string,
    items: LlmExtractedItem[],
    isMain: boolean,
  ): TaskDraftForCreation | null => {
    if (items.length === 0) return null

    const context = items.filter((i) => i.kind === 'context')
    const requirements = items.filter(
      (i) => i.kind === 'requirement' || i.kind === 'decision',
    )
    const specs = items.filter((i) => i.kind === 'spec')
    const dates = items.filter((i) => i.kind === 'date' && i.date)
    const startDates = items.filter((i) => i.kind === 'start_date' && i.startDate)
    const assignees = items.filter((i) => i.kind === 'assignee')

    const sections: string[] = []
    if (isMain) {
      const contextSentence = context
        .map((i) => finalizeText(i.text).replace(/\.$/, ''))
        .join(' ')
      if (contextSentence) sections.push(`${contextSentence}.`)
      else {
        sections.push(
          language === 'es'
            ? 'Tarea extraída de la reunión del proyecto.'
            : 'Task extracted from the project meeting.',
        )
      }
    } else {
      const firstContext = context[0]
      if (firstContext) sections.push(`${finalizeText(firstContext.text).replace(/\.$/, '')}.`)
      else {
        sections.push(
          language === 'es'
            ? 'Tarea adicional detectada en la reunión.'
            : 'Additional task detected in the meeting.',
        )
      }
    }

    if (requirements.length > 0) {
      const bullets = requirements
        .map((i) => `- ${finalizeText(i.text).replace(/\.$/, '')}`)
        .join('\n')
      const label = language === 'es' ? 'Requisitos' : 'Requirements'
      sections.push(`${label}:\n${bullets}`)
    }
    if (specs.length > 0) {
      const bullets = specs
        .map((i) => `- ${finalizeText(i.text).replace(/\.$/, '')}`)
        .join('\n')
      const label = language === 'es' ? 'Detalles técnicos' : 'Technical details'
      sections.push(`${label}:\n${bullets}`)
    }
    if (startDates.length > 0) {
      const bullets = startDates
        .map((i) => `- ${finalizeText(i.text).replace(/\.$/, '')} (${i.startDate})`)
        .join('\n')
      const label = language === 'es' ? 'Fechas de inicio' : 'Start dates'
      sections.push(`${label}:\n${bullets}`)
    }
    if (dates.length > 0) {
      const bullets = dates
        .map((i) => `- ${finalizeText(i.text).replace(/\.$/, '')} (${i.date})`)
        .join('\n')
      const label = language === 'es' ? 'Hitos' : 'Milestones'
      sections.push(`${label}:\n${bullets}`)
    }
    if (assignees.length > 0) {
      const bullets = assignees
        .map((i) => `- ${finalizeText(i.text).replace(/\.$/, '')}`)
        .join('\n')
      const label = language === 'es' ? 'Asignaciones' : 'Assignments'
      sections.push(`${label}:\n${bullets}`)
    }

    let description = sections.join('\n\n')
    if (description.length > 8000) {
      description = `${description.slice(0, 7997).trim()}...`
    }

    let titleBase = isMain ? extraction.taskTitle?.trim() || '' : ''
    if (isMain && !titleBase) {
      const decisionItem = items.find(
        (i) => i.kind === 'decision' &&
          (language === 'es'
            ? /\b(m[oó]dulo|funcionalidad|p[aá]gina)\b/i.test(i.text)
            : /\b(module|feature|page)\b/i.test(i.text)),
      )
      if (decisionItem) {
        const namedMatch = decisionItem.text.match(/\*\*?[""]?([A-ZÁÉÍÓÚÑ][\wÀ-ſ\s]+?)[""]?\*\*/u)
        if (namedMatch) {
          titleBase =
            language === 'es'
              ? `Desarrollar el módulo ${namedMatch[1].trim()}`
              : `Develop the ${namedMatch[1].trim()} module`
        } else {
          titleBase =
            language === 'es'
              ? 'Desarrollar la funcionalidad definida en la reunión'
              : 'Develop the feature defined in the meeting'
        }
      } else {
        titleBase =
          language === 'es' ? 'Tarea extraída de la reunión' : 'Task extracted from the meeting'
      }
    } else if (!isMain) {
      titleBase = language === 'es' ? `Tarea para ${groupOwnerHint}` : `Task for ${groupOwnerHint}`
    }

    const title = finalizeText(titleBase)
    const assigneeHint = isMain
      ? extraction.taskAssigneeHint?.trim() || groupOwnerHint || ''
      : groupOwnerHint

    return {
      title,
      description,
      priority: normalizePriority(extraction.taskPriority),
      assignedUserId: resolveAssigneeId(assigneeHint, members, ownerId),
      startAt: isValidIsoDate(extraction.taskStartDate) ? extraction.taskStartDate : undefined,
      completedAt: isValidIsoDate(extraction.taskDueDate) ? extraction.taskDueDate : undefined,
      assigneeHint: assigneeHint || undefined,
      confidence: extraction.confidence ?? 0.5,
      language,
    }
  }

  const mainDraft = buildDraftForGroup(
    extraction.taskAssigneeHint?.trim() ?? '',
    mainDeduped,
    true,
  )
  if (mainDraft) drafts.push(mainDraft)

  for (const [ownerHint, groupItems] of sideGroups) {
    const sideDraft = buildDraftForGroup(ownerHint, groupItems, false)
    if (sideDraft) drafts.push(sideDraft)
  }

  if (drafts.length === 0) {
    drafts.push({
      title: language === 'es' ? 'Tarea extraída de la reunión' : 'Task extracted from the meeting',
      description:
        language === 'es'
          ? 'No se pudo extraer información estructurada. Revisa la transcripción.'
          : 'Could not extract structured information. Review the transcript.',
      priority: 'Medium',
      assignedUserId: ownerId,
      confidence: 0.2,
      language,
    })
  }

  return drafts
}

const consolidateItems = (
  extraction: LlmItemExtraction,
  members: ProjectMemberDto[],
  ownerId: string,
): TaskDraftForCreation[] => {
  const language: SupportedLanguage = extraction.language ?? 'es'
  const cleanedItems: LlmExtractedItem[] = extraction.items
    .map((item) => ({ ...item, text: cleanupItemText(item.text) }))
    .filter((item) => item.text.length > 0)

  const seen = new Set<string>()
  const deduped: LlmExtractedItem[] = []
  for (const item of cleanedItems) {
    const key = `${item.kind}::${normalizeText(item.text)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }

  const blockStarts = deduped.filter((i) => i.kind === 'block_start')
  if (blockStarts.length > 1) {
    const blockDrafts: TaskDraftForCreation[] = []
    for (let idx = 0; idx < blockStarts.length; idx += 1) {
      const start = blockStarts[idx]
      const end = blockStarts[idx + 1]
      const blockItems = deduped.slice(
        deduped.indexOf(start) + 1,
        end ? deduped.indexOf(end) : deduped.length,
      )
      const draft = buildDraftForBlock({
        headerItem: start,
        items: blockItems,
        members,
        ownerId,
        language,
      })
      if (draft) blockDrafts.push(draft)
    }
    return blockDrafts
  }

  return consolidateAsSingleTask(extraction, deduped, members, ownerId)
}

async function getEngine(model: string, onProgress?: (message: string) => void) {
  if (engineInstance && engineModelLoaded === model) return engineInstance

  onProgress?.('Loading WebLLM runtime...')
  const webllmModule = await import('@mlc-ai/web-llm')
  onProgress?.('Downloading model (first run can take a while)...')

  const createdEngine = await withTimeout(
    webllmModule.CreateMLCEngine(model, {
      initProgressCallback: (progress: { text?: string }) => {
        if (progress?.text) onProgress?.(progress.text)
      },
    }),
    MODEL_LOAD_TIMEOUT_MS,
    'WebLLM model loading timed out. Falling back to local transcript parsing.',
  )

  engineInstance = createdEngine as unknown as WebLlmEngine
  engineModelLoaded = model
  return engineInstance
}

const parseLlmResponse = (
  rawContent: string | null | undefined,
): LlmItemExtraction => {
  if (!rawContent) {
    throw new Error('The model returned an empty response.')
  }
  const json = extractJsonObject(rawContent)
  const parsed = llmItemExtractionSchema.safeParse(JSON.parse(json))
  if (!parsed.success) {
    const issueMessages = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .slice(0, 3)
      .join('; ')
    throw new Error(`Schema validation failed: ${issueMessages}`)
  }
  return parsed.data
}

const runLlmPass = async (
  engine: WebLlmEngine,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
): Promise<LlmItemExtraction> => {
  const completion = await withTimeout(
    engine.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: 3000,
    }),
    EXTRACTION_TIMEOUT_MS,
    'Task extraction timed out while waiting for the model response.',
  )
  const rawContent = completion.choices?.[0]?.message?.content
  return parseLlmResponse(rawContent)
}

const buildCorrectionPrompt = (language: SupportedLanguage, errorMessage: string): string => {
  if (language === 'es') {
    return [
      'Tu respuesta anterior NO fue válida. Error:',
      errorMessage,
      '',
      'Devuelve SOLO el JSON corregido, sin texto adicional, sin markdown.',
      'Asegúrate de:',
      '- Responder en el mismo idioma que la transcripción.',
      '- Devolver un objeto JSON con la forma exacta indicada.',
      '- Cumplir el esquema (tipos, campos requeridos).',
    ].join('\n')
  }
  return [
    'Your previous response was INVALID. Error:',
    errorMessage,
    '',
    'Return ONLY the corrected JSON, no additional text, no markdown.',
    'Make sure to:',
    '- Reply in the same language as the transcript.',
    '- Return a JSON object with the exact shape indicated.',
    '- Match the schema (types, required fields).',
  ].join('\n')
}

const runLlmExtraction = async (
  engine: WebLlmEngine,
  systemPrompt: string,
  userPrompt: string,
  language: SupportedLanguage,
): Promise<LlmItemExtraction> => {
  try {
    return await runLlmPass(engine, systemPrompt, userPrompt, 0.1)
  } catch (firstError) {
    const firstMessage = firstError instanceof Error ? firstError.message : 'Unknown error'
    const correction = buildCorrectionPrompt(language, firstMessage)
    return await runLlmPass(engine, systemPrompt, correction, 0.05)
  }
}

export async function extractTasksFromTranscript(input: ExtractTasksFromTranscriptInput) {
  const rawTranscript = input.transcript.trim()
  if (!rawTranscript) {
    throw new Error('Transcript is empty. Paste or upload text before processing.')
  }

  const preprocessed = preprocessTranscript(rawTranscript, input.members)
  const transcript = truncateTranscript(preprocessed.preprocessed)
  const language = preprocessed.language
  const referenceYear = preprocessed.meetingDate
    ? Number(preprocessed.meetingDate.split('-')[0])
    : undefined

  input.onProgress?.(
    `Detected language: ${language === 'es' ? 'español' : 'English'}. Meeting date: ${
      preprocessed.meetingDate ?? 'unknown'
    }.`,
  )
  input.onProgress?.(`Preprocessor found ${preprocessed.detectedDates.length} date hints.`)

  const model = input.model ?? DEFAULT_MODEL
  input.onProgress?.(`Preparing model ${model}...`)

  const systemPrompt = buildSystemPrompt(language)
  const userPrompt = buildUserPrompt(transcript, preprocessed, input.members)

  let extraction: LlmItemExtraction | null = null
  let usedFallback = false

  if (input.forceFallback) {
    input.onProgress?.('Skipping LLM (forceFallback). Using local parser...')
    extraction = buildFallbackItemExtraction(
      rawTranscript,
      input.members,
      language,
      referenceYear,
    )
    usedFallback = true
    input.onProgress?.(`Fallback parser produced ${extraction.items.length} raw items.`)
  } else {
    try {
      const engine = await getEngine(model, input.onProgress)
      input.onProgress?.('Model ready. Running task extraction...')
      extraction = await runLlmExtraction(engine, systemPrompt, userPrompt, language)
      input.onProgress?.(`JSON validated. ${extraction.items.length} raw items received.`)
      console.log('[AI DEBUG] Raw LLM extraction:', JSON.stringify(extraction, null, 2))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown model error.'
      if (isGpuOutOfMemoryError(error)) {
        input.onProgress?.(
          `GPU out of memory running model "${model}". Try a smaller model (Qwen 1.5B or Llama 1B) from the selector.`,
        )
      } else {
        input.onProgress?.(`Model unavailable or slow: ${message}`)
      }
      input.onProgress?.('Switching to local fallback parser...')
      extraction = buildFallbackItemExtraction(
        rawTranscript,
        input.members,
        language,
        referenceYear,
      )
      usedFallback = true
      input.onProgress?.(`Fallback parser produced ${extraction.items.length} raw items.`)
    }
  }

  if (!extraction) {
    extraction = buildFallbackItemExtraction(
      rawTranscript,
      input.members,
      language,
      referenceYear,
    )
    usedFallback = true
  }

  input.onProgress?.('Consolidating items into tasks...')
  const drafts = consolidateItems(extraction, input.members, input.ownerId)

  console.log(
    '[AI DEBUG] Consolidated drafts:',
    drafts.map((d) => ({
      title: d.title,
      priority: d.priority,
      assignedUserId: d.assignedUserId,
      assigneeHint: d.assigneeHint,
      startAt: d.startAt,
      completedAt: d.completedAt,
      language: d.language,
      description: d.description,
      descriptionLength: d.description?.length ?? 0,
      confidence: d.confidence,
    })),
  )
  input.onProgress?.(
    `${drafts.length} task${drafts.length === 1 ? '' : 's'} consolidated${
      usedFallback ? ' (fallback parser)' : ''
    }.`,
  )

  return drafts
}
