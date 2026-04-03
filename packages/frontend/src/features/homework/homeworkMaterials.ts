import {
  calculateTotalPoints,
  createEmptyQuestion,
  createEmptyRubric,
  type BuilderQuestion,
} from '../exams/examQuestions'

export function createEmptyHomeworkQuestion(questionNumber: number): BuilderQuestion {
  const question = createEmptyQuestion(questionNumber)

  return {
    ...question,
    type: 'open-ended',
    options: [],
    correctOptionIndex: null,
    subQuestions: [],
    rubric: {
      ...createEmptyRubric(),
      pointsAvailable: question.pointsAvailable,
    },
  }
}

export function calculateHomeworkTotalPoints(questions: BuilderQuestion[]): number {
  return calculateTotalPoints(questions)
}

function hasAnswer(answerText: string, answerImageUrl: string): boolean {
  return answerText.trim().length > 0 || answerImageUrl.trim().length > 0
}

export function getHomeworkMaterialValidationError(questions: BuilderQuestion[]): string | null {
  if (questions.length === 0) {
    return 'Add at least one homework question before you save.'
  }

  for (const question of questions) {
    if (!question.prompt.trim()) {
      return `Question ${question.questionNumber}: add the question prompt.`
    }

    if (question.type === 'multiple-choice') {
      const blankOption = question.options.find((option) => !option.text.trim())
      if (blankOption) {
        return `Question ${question.questionNumber}: fill in every answer option.`
      }

      if (question.correctOptionIndex === null) {
        return `Question ${question.questionNumber}: select the correct answer.`
      }

      continue
    }

    if (question.type === 'open-ended') {
      if (!hasAnswer(question.rubric.answerText, question.rubric.answerImageUrl)) {
        return `Question ${question.questionNumber}: add the expected answer.`
      }

      continue
    }

    if (question.subQuestions.length === 0) {
      return `Question ${question.questionNumber}: add at least one sub-question.`
    }

    for (let index = 0; index < question.subQuestions.length; index += 1) {
      const subQuestion = question.subQuestions[index]
      const partLabel = String.fromCharCode(97 + index)

      if (!subQuestion.prompt.trim()) {
        return `Question ${question.questionNumber}${partLabel}: add the sub-question prompt.`
      }

      if (!hasAnswer(subQuestion.rubric.answerText, subQuestion.rubric.answerImageUrl)) {
        return `Question ${question.questionNumber}${partLabel}: add the expected answer.`
      }
    }
  }

  return null
}

export function serializeHomeworkMaterials(questions: BuilderQuestion[]): string {
  const materials = questions.map((question) => {
    if (question.type === 'multiple-choice') {
      const correctOption = question.correctOptionIndex !== null ? question.options[question.correctOptionIndex] : null

      return {
        questionNumber: question.questionNumber,
        type: question.type,
        prompt: question.prompt.trim(),
        pointsAvailable: question.pointsAvailable,
        options: question.options.map((option) => ({
          label: option.label,
          text: option.text.trim(),
        })),
        correctOptionIndex: question.correctOptionIndex,
        answerText: correctOption ? correctOption.text.trim() : '',
      }
    }

    if (question.type === 'multi-part') {
      return {
        questionNumber: question.questionNumber,
        type: question.type,
        prompt: question.prompt.trim(),
        pointsAvailable: question.subQuestions.reduce(
          (total, subQuestion) => total + subQuestion.pointsAvailable,
          0,
        ),
        subQuestions: question.subQuestions.map((subQuestion, index) => ({
          subQuestionNumber: index + 1,
          prompt: subQuestion.prompt.trim(),
          pointsAvailable: subQuestion.pointsAvailable,
          answerText: subQuestion.rubric.answerText.trim(),
        })),
      }
    }

    return {
      questionNumber: question.questionNumber,
      type: question.type,
      prompt: question.prompt.trim(),
      pointsAvailable: question.pointsAvailable,
      answerText: question.rubric.answerText.trim(),
    }
  })

  return JSON.stringify(materials)
}