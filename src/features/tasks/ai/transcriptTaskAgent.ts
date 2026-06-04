import type { ProjectMemberDto } from '../../projects/types/project.types'
import type { TaskPriority } from '../types/task.types'
import {
  llmItemExtractionSchema,
  type LlmExtractedItem,
  type LlmItemExtraction,
} from './transcriptTaskSchemas'

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
  startAt?: string
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
    'You extract RAW INFORMATION from a meeting transcript.',
    'You do NOT decide how many tasks to create. Another system will consolidate your output.',
    '',
    'Return ONLY valid JSON, no markdown, no extra text:',
    '{',
    '  "taskTitle": "short action-oriented title in Spanish, or empty string",',
    '  "taskAssigneeHint": "name of the person who accepted the work, or empty string",',
    '  "taskDueDate": "YYYY-MM-DD of the OFFICIAL final deadline (not intermediate), or empty string",',
    '  "taskPriority": "Low | Medium | High | Critical",',
    '  "items": [',
    '    { "kind": "requirement|spec|decision|date|assignee|context", "text": "...", "assigneeHint": "...", "date": "YYYY-MM-DD" }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- Extract one item per piece of information. Do NOT merge. Do NOT summarize across items.',
    '- kind:',
    '  - "requirement" = a functional requirement (e.g. "Permitir marcar notificaciones como leídas")',
    '  - "spec" = a technical detail (endpoint, frequency, framework, library)',
    '  - "decision" = a design decision taken in the meeting',
    '  - "date" = any explicit date with a label. Put label in text, date in "date" field.',
    '  - "assignee" = an explicit assignment statement ("María asigna a Juanda")',
    '  - "context" = background information explaining the why (only if useful for the task)',
    '- For requirements and specs, rewrite in clean Spanish infinitivo, no transcript quote, no "María dijo".',
    '- taskTitle: starts with a verb (Desarrollar, Implementar, Crear, Migrar...). Include the module/feature name. Do NOT include the assignee name. Do NOT include the date.',
    '- taskAssigneeHint: only the person who explicitly accepted ("me encargo", "yo lo hago", "lo haré"). Empty if unclear.',
    '- taskDueDate: ONLY the final deadline (fecha límite, fecha oficial, entrega final). Intermediate dates (e.g. "primera versión el 13 de junio") go in items of kind "date", not here.',
    '- taskPriority: High if there is a hard deadline, Medium by default, Low for nice-to-have, Critical only if blocked/ASAP.',
    '- assigneeHint on an item: only if that specific item has a different owner than the main task.',
    '- date on an item: only for intermediate dates, milestones, and the final deadline as a separate item.',
    '- Skip greetings, small talk, agenda items that are not work.',
    '- Skip duplicate items: if the same requirement is said twice, include it once.',
    '',
    'Output format example (do NOT copy literally, this is just shape):',
    '{',
    '  "taskTitle": "Desarrollar el módulo Centro de Notificaciones",',
    '  "taskAssigneeHint": "Juanda",',
    '  "taskDueDate": "2026-06-20",',
    '  "taskPriority": "High",',
    '  "items": [',
    '    { "kind": "context", "text": "Los usuarios reciben las notificaciones por correo con retraso y no tienen historial centralizado." },',
    '    { "kind": "requirement", "text": "Crear la página Centro de Notificaciones accesible desde el menú principal." },',
    '    { "kind": "requirement", "text": "Mostrar una lista cronológica de notificaciones ordenadas por fecha descendente." },',
    '    { "kind": "requirement", "text": "Permitir marcar cada notificación como leída." },',
    '    { "kind": "requirement", "text": "Permitir archivar notificaciones." },',
    '    { "kind": "requirement", "text": "Añadir un contador de notificaciones no leídas en la barra superior." },',
    '    { "kind": "requirement", "text": "Implementar paginación a partir de 50 notificaciones." },',
    '    { "kind": "requirement", "text": "Garantizar compatibilidad con dispositivos móviles." },',
    '    { "kind": "spec", "text": "Obtener la información desde el endpoint /api/notifications." },',
    '    { "kind": "spec", "text": "Actualizar los datos automáticamente cada 5 minutos." },',
    '    { "kind": "date", "text": "Primera versión funcional para revisión interna", "date": "2026-06-13" },',
    '    { "kind": "context", "text": "Coordinar las pruebas con QA al finalizar el desarrollo." }',
    '  ]',
    '}',
    '',
    'Project members (use these exact names for assigneeHint):',
    membersContext || '- No members provided',
    '',
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

const looksLikeDate = (value: string) =>
  /\b\d{1,2}\s+de\s+\w+/i.test(value) || /\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/.test(value)

const MONTHS_ES: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
}

const parseSpanishDate = (value: string, referenceYear?: number): string | undefined => {
  const m = value.match(/\b(\d{1,2})\s+de\s+([a-záéíóú]+)\b/i)
  if (!m) {
    return undefined
  }
  const day = Number(m[1])
  const month = MONTHS_ES[m[2].toLowerCase()]
  if (!Number.isFinite(day) || month === undefined) {
    return undefined
  }
  const year = referenceYear ?? new Date().getUTCFullYear()
  const date = new Date(Date.UTC(year, month, day))
  if (Number.isNaN(date.getTime())) {
    return undefined
  }
  const y = date.getUTCFullYear()
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

const findMemberInText = (value: string, members: ProjectMemberDto[]): string | undefined => {
  const normalizedValue = normalizeText(value)
  const emailMatch = members.find((member) =>
    normalizedValue.includes(normalizeText(member.userEmail)),
  )
  if (emailMatch) {
    return emailMatch.userName
  }
  const nameMatch = members.find((member) => {
    const normalizedName = normalizeText(member.userName)
    return normalizedValue.includes(normalizedName) || normalizedName.includes(normalizedValue)
  })
  return nameMatch?.userName
}

const extractTaskTitleFromLine = (line: string): string | undefined => {
  // Must contain the literal "Tarea:" (with colon) as a title marker.
  if (!/\bTarea\s*:/i.test(line)) {
    return undefined
  }
  // Exclude lines that are actually metadata (priority, assignee, date).
  if (
    /\b(prioridad|asignad[oa]|Responsable|Fecha\s+l[ií]mite|requisitos?|especificaciones?)\b/i.test(
      line,
    )
  ) {
    return undefined
  }
  // "Tarea: **<title>**." (bold form)
  const m1 = line.match(/Tarea\s*:\s*\*\*+([^*\n]+?)\*+\.?/i)
  if (m1) {
    return m1[1].replace(/^[""*\s]+|[""*\s]+$/g, '').trim()
  }
  // "Tarea: <title>" without bold
  const m2 = line.match(/Tarea\s*:\s+([^*\n][^\n]+?)\.?$/i)
  if (m2) {
    return m2[1].replace(/^[""*\s]+|[""*\s]+$/g, '').trim()
  }
  return undefined
}

const extractPriorityFromLine = (
  line: string,
): 'Low' | 'Medium' | 'High' | 'Critical' | undefined => {
  const normalized = line.toLowerCase()
  if (/\b(cr[ií]tica|critical)\b/.test(normalized)) {
    return 'Critical'
  }
  if (/\b(alta|high)\b/.test(normalized)) {
    return 'High'
  }
  if (/\b(media|medium)\b/.test(normalized)) {
    return 'Medium'
  }
  if (/\b(baja|low)\b/.test(normalized)) {
    return 'Low'
  }
  return undefined
}

const extractAssigneeFromAssigneeLine = (
  line: string,
  members: ProjectMemberDto[],
): string | undefined => {
  // Patterns:
  //   "asignada a **Juanda**"
  //   "asignado a **Juanda**"
  //   "Responsable: **Juanda**"
  //   "Esta tarea será para **Laura**"
  //   "esta tarea queda asignada a **Juanda**"
  const m = line.match(
    /(?:asignad[oa]s?\s+a|Responsable\s*:?|esta\s+tarea\s+(?:ser[áa]|queda)\s+(?:para|asignad[oa]\s+a))\s*\*+([^*\n,.]+?)\*+/i,
  )
  if (m) {
    const candidate = findMemberInText(m[1], members)
    if (candidate) {
      return candidate
    }
  }
  return undefined
}

const extractDateFromLine = (
  line: string,
  referenceYear: number | undefined,
): { label: string; iso: string } | undefined => {
  if (!looksLikeDate(line)) {
    return undefined
  }
  const iso = parseSpanishDate(line, referenceYear)
  if (!iso) {
    return undefined
  }
  const labelMatch = line.match(
    /(fecha\s+l[ií]mite|entrega\s+final|primera\s+versi[oó]n|revisi[oó]n|hito|deadline)[^:]*:?\s*[^*\n]*\*+([^*\n]+?)\*+/i,
  )
  const label = labelMatch ? labelMatch[1].trim() : 'Fecha'
  return { label, iso }
}

type RawTaskBlock = {
  title: string
  priority?: 'Low' | 'Medium' | 'High' | 'Critical'
  assigneeHint?: string
  dueDate?: string
  requirements: string[]
  context: string[]
  spec: string[]
}

const sliceTranscriptIntoTaskBlocks = (
  transcript: string,
  members: ProjectMemberDto[],
): RawTaskBlock[] => {
  const lines = transcript
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  const blocks: RawTaskBlock[] = []
  let current: RawTaskBlock | null = null

  const pushBlock = (block: RawTaskBlock) => {
    if (block.title || block.requirements.length > 0 || block.context.length > 0) {
      blocks.push(block)
    }
  }

  for (const line of lines) {
    // Strip the speaker prefix safely: "**Nombre:** cuerpo" -> "cuerpo".
    // We only remove the leading "**Name:**" marker; we never touch any
    // bold markers ("**...**") inside the body.
    const speakerMatch = line.match(/^\*\*[^*]+:\*\*\s*(.*)$/)
    const cleaned = (speakerMatch ? speakerMatch[1] : line).trim()
    if (!cleaned) {
      continue
    }

    // Title delimiter: "Tarea: **<title>**." or "Tarea **<title>**."
    const titleCandidate = extractTaskTitleFromLine(cleaned)
    if (titleCandidate) {
      if (current) {
        pushBlock(current)
      }
      current = { title: titleCandidate, requirements: [], context: [], spec: [] }
      continue
    }

    if (!current) {
      continue
    }

    // Priority line
    const priority = extractPriorityFromLine(cleaned)
    if (priority && !current.priority) {
      current.priority = priority
      continue
    }

    // Assignee line
    const assignee = extractAssigneeFromAssigneeLine(cleaned, members)
    if (assignee && !current.assigneeHint) {
      current.assigneeHint = assignee
      continue
    }

    // Date line
    const date = extractDateFromLine(cleaned, undefined)
    if (date) {
      if (!current.dueDate) {
        current.dueDate = date.iso
      }
      continue
    }

    // Start of a list (Requisitos / Especificaciones / Debe incluir)
    if (/^\s*(Requisitos?|Especificaciones?|Debe incluir:?|Specifications?):?\s*$/i.test(cleaned)) {
      continue
    }
    if (/^\s*\*\s+/.test(cleaned) || /^\s*-\s+/.test(cleaned) || /^\s*\d+\.\s+/.test(cleaned)) {
      const bulletText = cleaned
        .replace(/^\s*[*\-–—]\s+/, '')
        .replace(/^\s*\d+\.\s+/, '')
        .replace(/\*+/g, '')
        .trim()
      if (!bulletText) {
        continue
      }
      // Skip summary / recap lines: "<Task name> → <Priority> → <Assignee>"
      if (/→/.test(bulletText) && /\b(prioridad|Responsable|asignad[oa])\b/i.test(bulletText)) {
        continue
      }
      // Skip recap section header lines
      if (/^\s*Resumen\s+final/i.test(bulletText)) {
        continue
      }
      current.requirements.push(bulletText)
      continue
    }
  }

  if (current) {
    pushBlock(current)
  }

  return blocks
}

const scanNaturalTranscript = (transcript: string, members: ProjectMemberDto[]): RawTaskBlock[] => {
  // For transcripts without "Tarea:" markers or bold formatting.
  // Looks for natural language patterns to extract a task.
  const lines = transcript
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  const blocks: RawTaskBlock[] = []
  let current: RawTaskBlock | null = null

  const pushBlock = (block: RawTaskBlock) => {
    if (block.title || block.requirements.length > 0 || block.spec.length > 0) {
      blocks.push(block)
    }
  }

  for (const line of lines) {
    const cleaned = line.replace(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+:\s*/, '').trim()
    if (!cleaned) {
      continue
    }

    // Explicit task marker: "Primera tarea." / "Segunda tarea." / "Tercera tarea." / etc.
    const ordinalTaskMatch = cleaned.match(
      /^\s*(?:Primera|Segunda|Tercera|Cuarta|Quinta|Sexta|S[eé]ptima|Octava|Novena|D[eé]cima|[\d]+(?:ª|a|º)?)\s+tarea\.?\s*$/i,
    )
    if (ordinalTaskMatch) {
      if (current) {
        pushBlock(current)
      }
      current = { title: '', requirements: [], context: [], spec: [] }
      continue
    }

    // Detect title in natural language: "funcionalidad/módulo/sistema/página llamada X"
    const titleMatch = cleaned.match(
      /(?:funcionalidad|m[oó]dulo|sistema|p[aá]gina)\s+(?:llamad[oa]|denominad[oa])\s+["""]?([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][^.,!\n]*?)["""]?(?:\.|$)/i,
    )
    if (titleMatch) {
      if (current) {
        pushBlock(current)
      }
      current = { title: titleMatch[1].trim(), requirements: [], context: [], spec: [] }
      continue
    }

    // Detect imperative title: "Desarrollar/Actualizar/Mejorar/Crear/Revisar/Implementar X."
    // The verb must be at the start of the line, followed by a meaningful title.
    const imperativeTitleMatch = cleaned.match(
      /^\s*(Desarrollar|Actualizar|Mejorar|Crear|Revisar|Implementar|Construir|Optimizar|Migrar|Dise[ñn]ar)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ].{4,})$/i,
    )
    if (imperativeTitleMatch) {
      if (current) {
        pushBlock(current)
      }
      const verb = imperativeTitleMatch[1]
      const rest = imperativeTitleMatch[2].replace(/\.+$/, '').trim()
      current = { title: `${verb} ${rest}`.trim(), requirements: [], context: [], spec: [] }
      continue
    }

    // Also detect: functional description line like "La tarea consiste en..."
    const taskConsistMatch = cleaned.match(/[Ll]a\s+tarea\s+consiste\s+en\s+(.+)/i)
    if (taskConsistMatch && current) {
      current.requirements.push(taskConsistMatch[1].trim())
      continue
    }

    if (!current) {
      // Start a block anyway if we see clear task language
      if (
        /\b(mejora|optimizar|desarrollar|crear|implementar|m[oó]dulo|funcionalidad|sistema)\b/i.test(
          cleaned,
        )
      ) {
        current = { title: '', requirements: [], context: [], spec: [] }
      } else {
        continue
      }
    }

    // Assignee detection
    const assigneeMatch = cleaned.match(
      /(?:voy a asignar|asigno|asigna[rmos]?|esta\s+tarea\s+(?:queda\s+)?asignad[oa]\s+a|ser[áa]\s+para|responsable\s*:?)\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)/i,
    )
    if (assigneeMatch) {
      const assigned = findMemberInText(assigneeMatch[1], members)
      if (assigned) {
        current.assigneeHint = assigned
      }
      continue
    }
    const takesMatch = cleaned.match(/(me\s+encargo|de\s+acuerdo,\s*me\s+encargo)/i)
    if (takesMatch && !current.assigneeHint && members.length > 0) {
      const speaker = line.match(/^([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+):/)?.[1]
      if (speaker) {
        const assigned = findMemberInText(speaker, members)
        if (assigned) {
          current.assigneeHint = assigned
        }
      }
    }

    // Date detection
    const parsedDate = parseSpanishDate(cleaned, undefined)
    if (
      parsedDate &&
      /\b(fecha\s+l[ií]mite|deadline|entrega|completar|finalizaci[oó]n)\b/i.test(cleaned)
    ) {
      current.dueDate = parsedDate
      continue
    }

    // Spec detection
    if (/\b(endpoint|api|actualice|cada\s+\d+\s+minutos?|autom[aá]ticamente)\b/i.test(cleaned)) {
      current.spec.push(cleaned)
      continue
    }

    // Requirement detection: lines with action verbs, numbered items, or standalone items
    // (with optional "*", "-" or digit prefixes as bullet markers)
    if (
      /^\s*\d+\.\s/.test(cleaned) ||
      /^\s*[*\-–—]\s+/.test(cleaned) ||
      /^(Crear|Mostrar|Permitir|A[ñn]adir|Implementar|Garantizar|Añadir|Identificar|Actualizar|Ejecutar|Verificar|Generar|Incorporar|Registrar|Adaptar|Informar|Procedimientos|Gesti[oó]n|Configuraci[oó]n|Protocolos|Procedimiento)/i.test(
        cleaned,
      )
    ) {
      const bulletText = cleaned
        .replace(/^\s*[*\-–—]\s+/, '')
        .replace(/^\s*\d+\.\s+/, '')
        .replace(/\*+/g, '')
        .trim()
      if (!bulletText) {
        continue
      }
      if (/→/.test(bulletText) && /\b(prioridad|Responsable|asignad[oa])\b/i.test(bulletText)) {
        continue
      }
      if (/^\s*Resumen\s+final/i.test(bulletText)) {
        continue
      }
      current.requirements.push(bulletText)
      continue
    }
  }

  if (current) {
    pushBlock(current)
  }

  return blocks
}

const buildFallbackItemExtraction = (
  transcript: string,
  members: ProjectMemberDto[],
): LlmItemExtraction => {
  const blocks = sliceTranscriptIntoTaskBlocks(transcript, members)

  if (blocks.length === 0) {
    // No "Tarea:" markers found; try natural-language scanning.
    const naturalBlocks = scanNaturalTranscript(transcript, members)
    if (naturalBlocks.length === 0) {
      return {
        items: [],
        taskTitle: '',
        taskAssigneeHint: '',
        taskDueDate: '',
        taskPriority: 'Medium',
        confidence: 0.2,
      }
    }

    if (naturalBlocks.length === 1) {
      const block = naturalBlocks[0]
      const items: LlmExtractedItem[] = []
      for (const req of block.requirements) {
        items.push({ kind: 'requirement', text: req, confidence: 0.5 })
      }
      for (const spec of block.spec) {
        items.push({ kind: 'spec', text: spec, confidence: 0.5 })
      }
      return {
        items,
        taskTitle: block.title,
        taskAssigneeHint: block.assigneeHint ?? '',
        taskDueDate: block.dueDate ?? '',
        taskPriority: 'Medium',
        confidence: 0.4,
      }
    }

    // Multiple natural blocks: encode as block_start items (same as sliceTranscriptIntoTaskBlocks path).
    const items: LlmExtractedItem[] = []
    for (const block of naturalBlocks) {
      items.push({
        kind: 'block_start',
        text: block.title,
        taskTitle: block.title,
        assigneeHint: block.assigneeHint,
        date: block.dueDate,
        confidence: 0.5,
      })
      for (const req of block.requirements) {
        items.push({ kind: 'requirement', text: req, confidence: 0.4 })
      }
      for (const spec of block.spec) {
        items.push({ kind: 'spec', text: spec, confidence: 0.4 })
      }
      for (const ctx of block.context) {
        items.push({ kind: 'context', text: ctx, confidence: 0.3 })
      }
    }
    const first = naturalBlocks[0]
    return {
      items,
      taskTitle: first.title,
      taskAssigneeHint: first.assigneeHint ?? '',
      taskDueDate: first.dueDate ?? '',
      taskPriority: first.priority ?? 'Medium',
      confidence: 0.4,
    }
  }

  // If only one block, fall back to the original single-task shape.
  if (blocks.length === 1) {
    const block = blocks[0]
    const items: LlmExtractedItem[] = []
    for (const req of block.requirements) {
      items.push({ kind: 'requirement', text: req, confidence: 0.4 })
    }
    for (const spec of block.spec) {
      items.push({ kind: 'spec', text: spec, confidence: 0.4 })
    }
    for (const ctx of block.context) {
      items.push({ kind: 'context', text: ctx, confidence: 0.3 })
    }
    return {
      items,
      taskTitle: block.title,
      taskAssigneeHint: block.assigneeHint ?? '',
      taskDueDate: block.dueDate ?? '',
      taskPriority: block.priority ?? 'Medium',
      confidence: 0.4,
    }
  }

  // Multiple blocks: emit a synthetic extraction per block, but the API only
  // returns one. Encode multiple blocks by emitting block_start items that the
  // consolidator will use to split into separate tasks.
  const items: LlmExtractedItem[] = []
  for (const block of blocks) {
    items.push({
      kind: 'block_start',
      text: block.title,
      taskTitle: block.title,
      assigneeHint: block.assigneeHint,
      date: block.dueDate,
      priority: block.priority,
      confidence: 0.5,
    })
    for (const req of block.requirements) {
      items.push({ kind: 'requirement', text: req, confidence: 0.4 })
    }
    for (const spec of block.spec) {
      items.push({ kind: 'spec', text: spec, confidence: 0.4 })
    }
    for (const ctx of block.context) {
      items.push({ kind: 'context', text: ctx, confidence: 0.3 })
    }
  }

  // Use the first block as the "main" task header for backwards compatibility
  const first = blocks[0]
  return {
    items,
    taskTitle: first.title,
    taskAssigneeHint: first.assigneeHint ?? '',
    taskDueDate: first.dueDate ?? '',
    taskPriority: first.priority ?? 'Medium',
    confidence: 0.4,
  }
}

const finalizeText = (value: string) => {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (!trimmed) {
    return trimmed
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

const cleanupItemText = (value: string) =>
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

const consolidateItems = (
  extraction: LlmItemExtraction,
  members: ProjectMemberDto[],
  ownerId: string,
): TaskDraftForCreation[] => {
  const cleanedItems: LlmExtractedItem[] = extraction.items
    .map((item) => ({ ...item, text: cleanupItemText(item.text) }))
    .filter((item) => item.text.length > 0)

  const seen = new Set<string>()
  const deduped: LlmExtractedItem[] = []
  for (const item of cleanedItems) {
    const key = `${item.kind}::${normalizeText(item.text)}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    deduped.push(item)
  }

  // If the extraction contains explicit block_start items (multi-task transcripts),
  // split the items into per-block groups and produce one draft per block.
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
      })
      if (draft) {
        blockDrafts.push(draft)
      }
    }
    return blockDrafts
  }

  // Single-block path (legacy behavior)
  return consolidateAsSingleTask(extraction, deduped, members, ownerId)
}

const buildDraftForBlock = ({
  headerItem,
  items,
  members,
  ownerId,
}: {
  headerItem: LlmExtractedItem
  items: LlmExtractedItem[]
  members: ProjectMemberDto[]
  ownerId: string
}): TaskDraftForCreation | null => {
  const context = items.filter((i) => i.kind === 'context')
  const requirements = items.filter((i) => i.kind === 'requirement' || i.kind === 'decision')
  const specs = items.filter((i) => i.kind === 'spec')

  const sections: string[] = []
  const contextSentence = context.map((i) => finalizeText(i.text).replace(/\.$/, '')).join(' ')
  if (contextSentence) {
    sections.push(`${contextSentence}.`)
  }

  if (requirements.length > 0) {
    const bullets = requirements
      .map((i) => `- ${finalizeText(i.text).replace(/\.$/, '')}`)
      .join('\n')
    sections.push(`Requisitos:\n${bullets}`)
  }

  if (specs.length > 0) {
    const bullets = specs.map((i) => `- ${finalizeText(i.text).replace(/\.$/, '')}`).join('\n')
    sections.push(`Detalles técnicos:\n${bullets}`)
  }

  let description = sections.join('\n\n')
  if (description.length > 8000) {
    description = `${description.slice(0, 7997).trim()}...`
  }

  const titleBase =
    headerItem.taskTitle?.trim() || headerItem.text.trim() || 'Tarea extraída de la reunión'
  const title = finalizeText(titleBase)

  const assigneeHint = headerItem.assigneeHint?.trim() || ''
  const dueDate = headerItem.date?.trim() || ''
  const priority = headerItem.priority

  return {
    title,
    description: description || undefined,
    priority: priority ? priority : 'Medium',
    assignedUserId: resolveAssigneeId(assigneeHint, members, ownerId),
    completedAt: dueDate || undefined,
    assigneeHint: assigneeHint || undefined,
    confidence: headerItem.confidence ?? 0.5,
  }
}

const consolidateAsSingleTask = (
  extraction: LlmItemExtraction,
  deduped: LlmExtractedItem[],
  members: ProjectMemberDto[],
  ownerId: string,
): TaskDraftForCreation[] => {
  const grouped = new Map<string, LlmExtractedItem[]>()
  for (const item of deduped) {
    const owner = item.assigneeHint?.trim() || '__main__'
    if (!grouped.has(owner)) {
      grouped.set(owner, [])
    }
    grouped.get(owner)!.push(item)
  }

  // Only split a side group into its own task if it has at least 2 items.
  // Single-mention side groups are treated as noise and merged into the main group.
  const mainGroup: LlmExtractedItem[] = []
  const sideGroups: Array<[string, LlmExtractedItem[]]> = []
  for (const [owner, items] of grouped.entries()) {
    if (owner === '__main__' || items.length < 2) {
      mainGroup.push(...items)
    } else {
      sideGroups.push([owner, items])
    }
  }

  // Dedupe mainGroup again (in case side items with length<2 were merged)
  const mainKeys = new Set<string>()
  const mainDeduped = mainGroup.filter((item) => {
    const key = `${item.kind}::${normalizeText(item.text)}`
    if (mainKeys.has(key)) {
      return false
    }
    mainKeys.add(key)
    return true
  })
  void extraction

  const drafts: TaskDraftForCreation[] = []

  const buildDraftForGroup = (
    groupOwnerHint: string,
    items: LlmExtractedItem[],
    isMain: boolean,
  ): TaskDraftForCreation | null => {
    if (items.length === 0) {
      return null
    }

    const context = items.filter((i) => i.kind === 'context')
    const requirements = items.filter((i) => i.kind === 'requirement' || i.kind === 'decision')
    const specs = items.filter((i) => i.kind === 'spec')
    const dates = items.filter((i) => i.kind === 'date' && i.date)
    const assignees = items.filter((i) => i.kind === 'assignee')

    const sections: string[] = []

    if (isMain) {
      const contextSentence = context.map((i) => finalizeText(i.text).replace(/\.$/, '')).join(' ')
      if (contextSentence) {
        sections.push(`${contextSentence}.`)
      } else {
        sections.push('Tarea extraída de la reunión del proyecto.')
      }
    } else {
      const firstContext = context[0]
      if (firstContext) {
        sections.push(`${finalizeText(firstContext.text).replace(/\.$/, '')}.`)
      } else {
        sections.push('Tarea adicional detectada en la reunión.')
      }
    }

    if (requirements.length > 0) {
      const bullets = requirements
        .map((i) => `- ${finalizeText(i.text).replace(/\.$/, '')}`)
        .join('\n')
      sections.push(`Requisitos:\n${bullets}`)
    }

    if (specs.length > 0) {
      const bullets = specs.map((i) => `- ${finalizeText(i.text).replace(/\.$/, '')}`).join('\n')
      sections.push(`Detalles técnicos:\n${bullets}`)
    }

    if (dates.length > 0) {
      const bullets = dates
        .map((i) => `- ${finalizeText(i.text).replace(/\.$/, '')} (${i.date})`)
        .join('\n')
      sections.push(`Hitos:\n${bullets}`)
    }

    if (assignees.length > 0) {
      const bullets = assignees
        .map((i) => `- ${finalizeText(i.text).replace(/\.$/, '')}`)
        .join('\n')
      sections.push(`Asignaciones:\n${bullets}`)
    }

    let description = sections.join('\n\n')
    if (description.length > 8000) {
      description = `${description.slice(0, 7997).trim()}...`
    }

    let titleBase = isMain ? extraction.taskTitle?.trim() || '' : ''
    if (isMain && !titleBase) {
      // Try to infer a title from a decision item that names a module/feature
      const decisionItem = items.find(
        (i) => i.kind === 'decision' && /\b(m[oó]dulo|funcionalidad|p[aá]gina)\b/i.test(i.text),
      )
      if (decisionItem) {
        const namedMatch = decisionItem.text.match(/\*\*?[""]?([A-ZÁÉÍÓÚÑ][\wÀ-ſ\s]+?)[""]?\*\*/u)
        if (namedMatch) {
          titleBase = `Desarrollar el módulo ${namedMatch[1].trim()}`
        } else {
          titleBase = 'Desarrollar la funcionalidad definida en la reunión'
        }
      } else {
        titleBase = 'Tarea extraída de la reunión'
      }
    } else if (!isMain) {
      titleBase = `Tarea para ${groupOwnerHint}`
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
      completedAt: isMain ? normalizeDate(extraction.taskDueDate) : undefined,
      assigneeHint: assigneeHint || undefined,
      confidence: extraction.confidence ?? 0.5,
    }
  }

  const mainDraft = buildDraftForGroup(extraction.taskAssigneeHint?.trim() ?? '', mainDeduped, true)
  if (mainDraft) {
    drafts.push(mainDraft)
  }

  for (const [ownerHint, groupItems] of sideGroups) {
    const sideDraft = buildDraftForGroup(ownerHint, groupItems, false)
    if (sideDraft) {
      drafts.push(sideDraft)
    }
  }

  if (drafts.length === 0) {
    drafts.push({
      title: 'Tarea extraída de la reunión',
      description: 'No se pudo extraer información estructurada. Revisa la transcripción.',
      priority: 'Medium',
      assignedUserId: ownerId,
      confidence: 0.2,
    })
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

  let extraction: LlmItemExtraction | null = null
  let usedFallback = false

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
        max_tokens: 2500,
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
    const parsed = llmItemExtractionSchema.safeParse(parsedJson)

    if (!parsed.success) {
      throw new Error('The model response JSON did not match the expected item schema.')
    }

    extraction = parsed.data
    input.onProgress?.(`JSON validated. ${extraction.items.length} raw items received.`)

    // DEBUG: log raw LLM response

    console.log('[AI DEBUG] Raw LLM extraction:', JSON.stringify(extraction, null, 2))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown model error.'
    input.onProgress?.(`Model unavailable or slow: ${message}`)
    input.onProgress?.('Switching to local fallback parser...')
    extraction = buildFallbackItemExtraction(transcript, input.members)
    usedFallback = true
    input.onProgress?.(`Fallback parser produced ${extraction.items.length} raw items.`)
  }

  if (!extraction) {
    extraction = buildFallbackItemExtraction(transcript, input.members)
    usedFallback = true
  }

  input.onProgress?.('Consolidating items into tasks...')
  const drafts = consolidateItems(extraction, input.members, input.ownerId)

  console.log(
    '[AI DEBUG] Consolidated drafts:',
    drafts.map((d) => ({
      title: d.title,
      assigneeHint: d.assigneeHint,
      description: d.description,
    })),
  )
  input.onProgress?.(
    `${drafts.length} task${drafts.length === 1 ? '' : 's'} consolidated${
      usedFallback ? ' (fallback parser)' : ''
    }.`,
  )

  return drafts
}
