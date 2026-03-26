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