import type { ProjectMemberDto } from '../../projects/types/project.types'

export type SupportedLanguage = 'es' | 'en'

const SPANISH_STOPWORDS = new Set([
  'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber',
  'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'todo',
  'pero', 'más', 'hacer', 'o', 'poder', 'decir', 'este', 'ir', 'otro', 'ese',
  'si', 'me', 'ya', 'ver', 'porque', 'dar', 'cuando', 'él', 'muy', 'sin',
  'vez', 'mucho', 'saber', 'qué', 'sobre', 'mi', 'alguno', 'mismo', 'yo',
  'también', 'hasta', 'año', 'dos', 'querer', 'entre', 'así', 'primera',
  'desde', 'nos', 'tarea', 'tareas', 'fecha', 'inicio', 'fin', 'urgencia',
  'responsable', 'requisitos', 'especificaciones',
])

const ENGLISH_STOPWORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
  'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his',
  'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
  'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
  'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like',
  'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year',
  'your', 'good', 'some', 'task', 'tasks', 'date', 'start', 'end', 'due',
  'priority', 'assignee', 'requirements', 'specifications',
])

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

const MONTHS_EN: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sept: 8,
  sep: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
}

const WEEKDAYS_EN: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
}

const WEEKDAYS_ES: Record<string, number> = {
  domingo: 0, dom: 0,
  lunes: 1, lun: 1,
  martes: 2, mar: 2,
  miércoles: 3, miercoles: 3, mié: 3, mie: 3,
  jueves: 4, jue: 4,
  viernes: 5, vie: 5,
  sábado: 6, sabado: 6, sáb: 6, sab: 6,
}

const TASK_HEADER_KEYWORDS_ES = [
  'tarea', 'tarea:', 'primera tarea', 'segunda tarea', 'tercera tarea',
  'cuarta tarea', 'quinta tarea', 'sexta tarea', 'siguiente tarea',
  'nueva tarea', 'próxima tarea', 'ultima tarea', 'última tarea',
]

const TASK_HEADER_KEYWORDS_EN = [
  'task', 'task:', 'first task', 'second task', 'third task', 'fourth task',
  'fifth task', 'next task', 'new task', 'last task', 'final task',
]

export type PreprocessedTranscript = {
  language: SupportedLanguage
  preprocessed: string
  detectedDates: Array<{ original: string; iso: string; label: string }>
  detectedSpeakers: string[]
  meetingDate?: string
}

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)

const detectLanguage = (text: string): SupportedLanguage => {
  const tokens = tokenize(text)
  if (tokens.length === 0) {
    return 'es'
  }

  let es = 0
  let en = 0
  for (const token of tokens) {
    if (SPANISH_STOPWORDS.has(token)) es += 1
    if (ENGLISH_STOPWORDS.has(token)) en += 1
  }

  if (en > es * 1.2) return 'en'
  if (es > en * 1.2) return 'es'
  return es >= en ? 'es' : 'en'
}

const pad2 = (n: number) => String(n).padStart(2, '0')

const toIso = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`

const parseMonthName = (token: string, language: SupportedLanguage): number | undefined => {
  const normalized = token.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  if (language === 'es') return MONTHS_ES[normalized]
  return MONTHS_EN[normalized] ?? MONTHS_ES[normalized]
}

const parseWeekdayOffset = (token: string, language: SupportedLanguage): number | undefined => {
  const normalized = token.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  if (language === 'es') return WEEKDAYS_ES[normalized]
  return WEEKDAYS_EN[normalized]
}

const buildDate = (year: number, month: number, day: number): Date | undefined => {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return undefined
  }
  const date = new Date(Date.UTC(year, month, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return undefined
  }
  return date
}

const resolveYear = (year: number | undefined, referenceYear: number): number => {
  if (!year) return referenceYear
  if (year < 100) return year + 2000
  return year
}

const nextWeekday = (ref: Date, targetWeekday: number, direction: 'next' | 'this'): Date => {
  const refDay = ref.getUTCDay()
  let delta = (targetWeekday - refDay + 7) % 7
  if (direction === 'next' && delta === 0) delta = 7
  return new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate() + delta))
}

type ParsedDate = { date: Date; matched: string; label: string }

const tryParseAbsoluteDate = (
  text: string,
  language: SupportedLanguage,
  referenceYear: number,
): ParsedDate | undefined => {
  const esPattern = text.match(
    /\b(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+de\s+(\d{2,4}))?\b/i,
  )
  if (esPattern && language === 'es') {
    const day = Number(esPattern[1])
    const month = parseMonthName(esPattern[2], 'es')
    if (month !== undefined) {
      const year = resolveYear(esPattern[3] ? Number(esPattern[3]) : undefined, referenceYear)
      const date = buildDate(year, month, day)
      if (date) {
        return { date, matched: esPattern[0], label: 'absolute' }
      }
    }
  }

  const enMonthFirst = text.match(
    /\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{2,4}))?\b/,
  )
  if (enMonthFirst) {
    const month = parseMonthName(enMonthFirst[1], 'en')
    if (month !== undefined) {
      const day = Number(enMonthFirst[2])
      const year = resolveYear(
        enMonthFirst[3] ? Number(enMonthFirst[3]) : undefined,
        referenceYear,
      )
      const date = buildDate(year, month, day)
      if (date) {
        return { date, matched: enMonthFirst[0], label: 'absolute' }
      }
    }
  }

  const enDayFirst = text.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]+)(?:,?\s+(\d{2,4}))?\b/,
  )
  if (enDayFirst && language === 'en') {
    const day = Number(enDayFirst[1])
    const month = parseMonthName(enDayFirst[2], 'en')
    if (month !== undefined) {
      const year = resolveYear(
        enDayFirst[3] ? Number(enDayFirst[3]) : undefined,
        referenceYear,
      )
      const date = buildDate(year, month, day)
      if (date) {
        return { date, matched: enDayFirst[0], label: 'absolute' }
      }
    }
  }

  const numeric = text.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/)
  if (numeric) {
    const a = Number(numeric[1])
    const b = Number(numeric[2])
    const year = resolveYear(numeric[3] ? Number(numeric[3]) : undefined, referenceYear)
    const dayFirst = a > 12 ? a : b > 12 ? b : a
    const month = a > 12 ? b : b > 12 ? a : a
    const date = buildDate(year, month - 1, dayFirst)
    if (date) {
      return { date, matched: numeric[0], label: 'absolute' }
    }
  }

  return undefined
}

const tryParseRelativeDate = (
  text: string,
  language: SupportedLanguage,
  reference: Date,
): ParsedDate | undefined => {
  const normalized = text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

  if (language === 'es') {
    if (/\bpasado\s+ma[ñn]ana\b/.test(normalized)) {
      return {
        date: new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate() + 2)),
        matched: 'pasado mañana',
        label: 'relative',
      }
    }
    if (/\bma[ñn]ana\b/.test(normalized)) {
      return {
        date: new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate() + 1)),
        matched: 'mañana',
        label: 'relative',
      }
    }
    if (/\bhoy\b/.test(normalized)) {
      return { date: reference, matched: 'hoy', label: 'relative' }
    }
  } else {
    if (/\bday\s+after\s+tomorrow\b/.test(normalized)) {
      return {
        date: new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate() + 2)),
        matched: 'day after tomorrow',
        label: 'relative',
      }
    }
    if (/\btomorrow\b/.test(normalized)) {
      return {
        date: new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate() + 1)),
        matched: 'tomorrow',
        label: 'relative',
      }
    }
    if (/\btoday\b/.test(normalized)) {
      return { date: reference, matched: 'today', label: 'relative' }
    }
  }

  const nextWeekdayMatch = text.match(/\b(?:next|este|el)\s+([A-Za-záéíóú]+)\b/i)
  if (nextWeekdayMatch) {
    const weekday = parseWeekdayOffset(nextWeekdayMatch[1], language)
    if (weekday !== undefined) {
      const direction = /\bnext\b/i.test(nextWeekdayMatch[0]) ? 'next' : 'this'
      return {
        date: nextWeekday(reference, weekday, direction),
        matched: nextWeekdayMatch[0],
        label: 'relative',
      }
    }
  }

  return undefined
}

export const parseAnyDate = (
  text: string,
  language: SupportedLanguage,
  reference: Date = new Date(),
): ParsedDate | undefined => {
  const referenceYear = reference.getUTCFullYear()
  return (
    tryParseAbsoluteDate(text, language, referenceYear) ??
    tryParseRelativeDate(text, language, reference)
  )
}

const extractMeetingDate = (text: string, language: SupportedLanguage): string | undefined => {
  const lines = text.split(/\n+/).slice(0, 8)
  for (const line of lines) {
    const dateMatch = line.match(
      /(?:fecha\s*(?:de\s*la\s*)?reuni[oó]n|meeting\s*date|reuni[oó]n)\s*[:-]?\s*(.+)/i,
    )
    if (dateMatch) {
      const parsed = parseAnyDate(dateMatch[1], language)
      if (parsed) return toIso(parsed.date)
    }
  }
  return undefined
}

const extractSpeakers = (text: string): string[] => {
  const speakers = new Set<string>()
  const patterns = [
    /^\*?\*?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)\*?\*?:\s/gm,
    /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+):\s/gm,
  ]
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim()
      if (
        name.length > 1 &&
        name.length < 50 &&
        !/^(tarea|urgencia|responsable|requisitos?|especificaciones?|fecha|task|priority|assignee|requirements?|specifications?|due|start|end)$/i.test(
          name,
        )
      ) {
        speakers.add(name)
      }
    }
  }
  return Array.from(speakers)
}

const stripMarkdownNoise = (text: string): string =>
  text
    .replace(/^---\s*$/gm, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*\*/g, '**')
    .replace(/\*\*/g, '')
    .trim()

const tagDatesInline = (
  text: string,
  language: SupportedLanguage,
  reference: Date,
): { text: string; detected: Array<{ original: string; iso: string; label: string }> } => {
  const detected: Array<{ original: string; iso: string; label: string }> = []
  let counter = 0

  const tagged = text.replace(
    /(\b\d{1,2}\s+de\s+[a-záéíóúñ]+(?:\s+de\s+\d{2,4})?\b|\b(?:[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{2,4})?|\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?[A-Za-z]+(?:,?\s+\d{2,4})?)\b|\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b|\b(?:ma[ñn]ana|pasado\s+ma[ñn]ana|hoy|tomorrow|today|day\s+after\s+tomorrow)\b|\b(?:next|este|el)\s+[A-Za-záéíóú]+\b)/gi,
    (match) => {
      const parsed = parseAnyDate(match, language, reference)
      if (!parsed) return match
      const iso = toIso(parsed.date)
      counter += 1
      detected.push({ original: match, iso, label: parsed.label })
      return `${match} [DATE#${counter}=${iso}]`
    },
  )

  return { text: tagged, detected }
}

const tagMembers = (
  text: string,
  members: ProjectMemberDto[],
): { text: string; resolved: string[] } => {
  if (members.length === 0) return { text, resolved: [] }
  const resolved = new Set<string>()
  let tagged = text
  for (const member of members) {
    const safeName = member.userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const nameRegex = new RegExp(`\\b${safeName}\\b`, 'g')
    if (nameRegex.test(tagged)) {
      resolved.add(member.userName)
      tagged = tagged.replace(nameRegex, `${member.userName}<<${member.userId}>>`)
    }
    if (member.userEmail) {
      const safeEmail = member.userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const emailRegex = new RegExp(`\\b${safeEmail}\\b`, 'g')
      if (emailRegex.test(tagged)) {
        tagged = tagged.replace(emailRegex, member.userEmail)
      }
    }
  }
  return { text: tagged, resolved: Array.from(resolved) }
}

const isTaskHeaderLine = (line: string, language: SupportedLanguage): boolean => {
  const lower = line.toLowerCase().trim()
  if (language === 'es') {
    return TASK_HEADER_KEYWORDS_ES.some((kw) => lower.startsWith(kw) || lower.includes(kw + ':'))
  }
  return TASK_HEADER_KEYWORDS_EN.some((kw) => lower.startsWith(kw) || lower.includes(kw + ':'))
}

const markTaskBoundaries = (text: string, language: SupportedLanguage): string => {
  const lines = text.split('\n')
  const marked: string[] = []
  let inTask = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (isTaskHeaderLine(trimmed, language)) {
      marked.push(`>>> TASK START >>> ${line}`)
      inTask = true
    } else if (
      inTask &&
      trimmed.length > 0 &&
      /^(?:speaker|hablante|---)/i.test(trimmed) &&
      !/tarea|task/i.test(trimmed)
    ) {
      inTask = false
      marked.push(line)
    } else {
      marked.push(line)
    }
  }
  return marked.join('\n')
}

export const preprocessTranscript = (
  transcript: string,
  members: ProjectMemberDto[],
  referenceDate: Date = new Date(),
): PreprocessedTranscript => {
  const language = detectLanguage(transcript)
  const cleaned = stripMarkdownNoise(transcript)
  const meetingDate = extractMeetingDate(cleaned, language)
  const reference = meetingDate ? new Date(`${meetingDate}T00:00:00.000Z`) : referenceDate

  const { text: dateTagged, detected: detectedDates } = tagDatesInline(cleaned, language, reference)
  const { text: memberTagged, resolved: detectedSpeakers } = tagMembers(dateTagged, members)
  const withBoundaries = markTaskBoundaries(memberTagged, language)

  const languageHeader =
    language === 'es'
      ? '[IDIOMA: español] [INSTRUCCIÓN: responde en español]'
      : '[LANGUAGE: English] [INSTRUCTION: reply in English]'

  const meetingHeader = meetingDate
    ? `[FECHA REUNIÓN: ${meetingDate}${language === 'es' ? ' (referencia para fechas relativas)' : ' (reference for relative dates)'}]`
    : ''

  const speakerList = extractSpeakers(transcript)
  const speakerHint =
    speakerList.length > 0
      ? `[HABLANTES DETECTADOS: ${speakerList.join(', ')}]`
      : ''

  const preprocessed = [languageHeader, meetingHeader, speakerHint, withBoundaries]
    .filter(Boolean)
    .join('\n')

  return {
    language,
    preprocessed,
    detectedDates,
    detectedSpeakers,
    meetingDate,
  }
}

export const _internal = {
  detectLanguage,
  parseAnyDate,
  toIso,
}
