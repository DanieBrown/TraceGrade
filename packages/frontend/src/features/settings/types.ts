export type ThresholdSource = 'teacher_override' | 'default'

export interface TeacherThreshold {
  effectiveThreshold: number
  source: ThresholdSource
  teacherThreshold: number | null
}

export type ThresholdLoadState = 'loading' | 'error' | 'empty' | 'done'

export type GradingProviderId = 'GEMINI_FLASH' | 'OPENAI_GPT4O' | 'CLAUDE_SONNET'

export interface ProviderOption {
  id: GradingProviderId
  displayName: string
  description: string
}

export interface GradingProviderSettings {
  currentProvider: GradingProviderId
  availableProviders: ProviderOption[]
}

export type ProviderLoadState = 'loading' | 'error' | 'done'
