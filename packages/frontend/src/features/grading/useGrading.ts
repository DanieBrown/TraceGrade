import { useCallback, useReducer } from 'react'
import { triggerGrading } from './gradingApi'
import type { GradingResultResponse, QuestionScore } from './gradingApi'

type GradingState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'success'; result: GradingResultResponse; parsedQuestions: QuestionScore[] }
  | { phase: 'error'; message: string }

type Action =
  | { type: 'TRIGGER' }
  | { type: 'SUCCESS'; result: GradingResultResponse; parsedQuestions: QuestionScore[] }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' }

function reducer(state: GradingState, action: Action): GradingState {
  switch (action.type) {
    case 'TRIGGER':
      return { phase: 'loading' }
    case 'SUCCESS':
      return { phase: 'success', result: action.result, parsedQuestions: action.parsedQuestions }
    case 'ERROR':
      return { phase: 'error', message: action.message }
    case 'RESET':
      return { phase: 'idle' }
    default:
      return state
  }
}

export function useGrading() {
  const [state, dispatch] = useReducer(reducer, { phase: 'idle' })

  const grade = useCallback(async (submissionId: string) => {
    dispatch({ type: 'TRIGGER' })
    try {
      const result = await triggerGrading(submissionId)
      let parsedQuestions: QuestionScore[] = []
      try {
        parsedQuestions = JSON.parse(result.questionScores) as QuestionScore[]
      } catch {
        // questionScores is "[]" on FAILED results — default to empty array
      }
      dispatch({ type: 'SUCCESS', result, parsedQuestions })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Grading failed. Please try again.'
      dispatch({ type: 'ERROR', message })
    }
  }, [])

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return { state, grade, reset }
}
