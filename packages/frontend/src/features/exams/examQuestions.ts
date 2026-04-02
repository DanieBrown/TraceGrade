// ── Question types for the structured exam builder ────────────────────────────

export type QuestionType = 'multiple-choice' | 'multi-part' | 'open-ended'

export interface InlineRubric {
  answerText: string
  answerImageUrl: string
  pointsAvailable: number
  acceptableVariations: string
  gradingNotes: string
}

export interface MultipleChoiceOption {
  label: string
  text: string
}

export interface BuilderQuestion {
  id: string
  questionNumber: number
  type: QuestionType
  prompt: string
  pointsAvailable: number
  /** Multiple choice fields */
  options: MultipleChoiceOption[]
  correctOptionIndex: number | null
  /** Multi-part fields */
  subQuestions: BuilderSubQuestion[]
  /** Inline rubric for open-ended / single question */
  rubric: InlineRubric
}

export interface BuilderSubQuestion {
  id: string
  prompt: string
  pointsAvailable: number
  rubric: InlineRubric
}

export function createEmptyRubric(): InlineRubric {
  return {
    answerText: '',
    answerImageUrl: '',
    pointsAvailable: 0,
    acceptableVariations: '',
    gradingNotes: '',
  }
}

let _nextId = 1
export function generateId(): string {
  return `q-${Date.now()}-${_nextId++}`
}

export function createEmptyQuestion(questionNumber: number): BuilderQuestion {
  return {
    id: generateId(),
    questionNumber,
    type: 'multiple-choice',
    prompt: '',
    pointsAvailable: 10,
    options: [
      { label: 'A', text: '' },
      { label: 'B', text: '' },
      { label: 'C', text: '' },
      { label: 'D', text: '' },
    ],
    correctOptionIndex: null,
    subQuestions: [],
    rubric: createEmptyRubric(),
  }
}

export function createEmptySubQuestion(): BuilderSubQuestion {
  return {
    id: generateId(),
    prompt: '',
    pointsAvailable: 5,
    rubric: createEmptyRubric(),
  }
}

export function calculateTotalPoints(questions: BuilderQuestion[]): number {
  return questions.reduce((total, q) => {
    if (q.type === 'multi-part') {
      return total + q.subQuestions.reduce((sub, s) => sub + s.pointsAvailable, 0)
    }
    return total + q.pointsAvailable
  }, 0)
}

/**
 * Serialize builder questions to the JSON format expected by the backend.
 * The backend stores questionsJson as a flexible TEXT field.
 */
export function serializeQuestionsToJson(questions: BuilderQuestion[]): string {
  const serialized = questions.map((q) => ({
    questionNumber: q.questionNumber,
    type: q.type,
    prompt: q.prompt,
    pointsAvailable: q.type === 'multi-part'
      ? q.subQuestions.reduce((sum, s) => sum + s.pointsAvailable, 0)
      : q.pointsAvailable,
    ...(q.type === 'multiple-choice' && {
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
    }),
    ...(q.type === 'multi-part' && {
      subQuestions: q.subQuestions.map((s, i) => ({
        subQuestionNumber: i + 1,
        prompt: s.prompt,
        pointsAvailable: s.pointsAvailable,
      })),
    }),
  }))
  return JSON.stringify(serialized)
}

/**
 * Build rubric payloads from builder questions for creating answer rubrics.
 */
export function buildRubricPayloads(questions: BuilderQuestion[]) {
  const payloads: Array<{
    questionNumber: number
    answerText?: string
    answerImageUrl?: string
    pointsAvailable: number
    acceptableVariations?: string
    gradingNotes?: string
  }> = []

  for (const q of questions) {
    if (q.type === 'multiple-choice') {
      const correctOption = q.correctOptionIndex !== null ? q.options[q.correctOptionIndex] : null
      payloads.push({
        questionNumber: q.questionNumber,
        answerText: correctOption ? `${correctOption.label}: ${correctOption.text}` : '',
        pointsAvailable: q.pointsAvailable,
        gradingNotes: 'Multiple choice — exact match expected.',
      })
    } else if (q.type === 'open-ended') {
      payloads.push({
        questionNumber: q.questionNumber,
        answerText: q.rubric.answerText || undefined,
        answerImageUrl: q.rubric.answerImageUrl || undefined,
        pointsAvailable: q.pointsAvailable,
        acceptableVariations: q.rubric.acceptableVariations || undefined,
        gradingNotes: q.rubric.gradingNotes || undefined,
      })
    } else if (q.type === 'multi-part') {
      for (let i = 0; i < q.subQuestions.length; i++) {
        const sub = q.subQuestions[i]
        payloads.push({
          questionNumber: q.questionNumber * 100 + (i + 1),
          answerText: sub.rubric.answerText || undefined,
          answerImageUrl: sub.rubric.answerImageUrl || undefined,
          pointsAvailable: sub.pointsAvailable,
          acceptableVariations: sub.rubric.acceptableVariations || undefined,
          gradingNotes: sub.rubric.gradingNotes || `Part ${String.fromCharCode(97 + i)} of question ${q.questionNumber}`,
        })
      }
    }
  }

  return payloads
}

// ── Legacy parser (kept for backward compatibility with existing exams) ───────

interface ExamQuestionRecord {
  questionNumber: number
  prompt: string
  pointsAvailable: number | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toQuestionArray(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) {
    return parsed
  }

  if (!isRecord(parsed)) {
    return []
  }

  const nestedQuestions = parsed.questions
  return Array.isArray(nestedQuestions) ? nestedQuestions : []
}

function toQuestionNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10)
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed
    }
  }

  return fallback
}

function toPrompt(value: unknown, questionNumber: number): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return `Question ${questionNumber}`
}

function toPointsAvailable(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return null
}

export function parseExamQuestions(questionsJson?: string | null): ExamQuestionRecord[] {
  if (!questionsJson || !questionsJson.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(questionsJson) as unknown
    const items = toQuestionArray(parsed)
    const seenNumbers = new Set<number>()

    return items.flatMap((item, index) => {
      if (!isRecord(item)) {
        return []
      }

      const fallbackQuestionNumber = index + 1
      const questionNumber = toQuestionNumber(
        item.number ?? item.questionNumber,
        fallbackQuestionNumber,
      )

      if (seenNumbers.has(questionNumber)) {
        return []
      }

      seenNumbers.add(questionNumber)

      return [{
        questionNumber,
        prompt: toPrompt(item.question ?? item.prompt ?? item.text, questionNumber),
        pointsAvailable: toPointsAvailable(item.points ?? item.pointsAvailable),
      }]
    })
  } catch {
    return []
  }
}