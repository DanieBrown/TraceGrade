export type ThresholdSource = 'teacher_override' | 'default'

export interface TeacherThreshold {
  effectiveThreshold: number
  source: ThresholdSource
  teacherThreshold: number | null
}

export type ThresholdLoadState = 'loading' | 'error' | 'empty' | 'done'
