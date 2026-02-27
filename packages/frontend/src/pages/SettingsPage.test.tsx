import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTeacherThreshold } from '../features/settings/useTeacherThreshold'
import SettingsPage from './SettingsPage'

vi.mock('../features/settings/useTeacherThreshold', () => ({
  useTeacherThreshold: vi.fn(),
}))

type HookState = ReturnType<typeof useTeacherThreshold>

const useTeacherThresholdMock = vi.mocked(useTeacherThreshold)

function createHookState(overrides: Partial<HookState> = {}): HookState {
  return {
    loadState: 'done',
    threshold: {
      effectiveThreshold: 0.8,
      source: 'teacher_override',
      teacherThreshold: 0.8,
    },
    thresholdInput: '0.80',
    fetchError: 'Failed to load preferences. Please try again.',
    saveError: null,
    validationError: null,
    isSaving: false,
    showSavedSuccess: false,
    setThresholdInput: vi.fn(),
    retryLoad: vi.fn(async () => {}),
    save: vi.fn(async () => true),
    ...overrides,
  }
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    useTeacherThresholdMock.mockReset()
  })

  it('renders loading state while preferences are fetched', () => {
    useTeacherThresholdMock.mockReturnValue(createHookState({ loadState: 'loading' }))

    render(<SettingsPage />)

    expect(screen.getByText('Loading preferences...')).toBeInTheDocument()
  })

  it('renders fetch error and retries when requested', () => {
    const retryLoad = vi.fn(async () => {})
    useTeacherThresholdMock.mockReturnValue(
      createHookState({
        loadState: 'error',
        fetchError: 'Failed to load preferences. Please try again.',
        retryLoad,
      }),
    )

    render(<SettingsPage />)

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load preferences')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(retryLoad).toHaveBeenCalledTimes(1)
  })

  it('shows source badge for teacher override and default values', () => {
    useTeacherThresholdMock
      .mockReturnValueOnce(
        createHookState({
          threshold: {
            effectiveThreshold: 0.8,
            source: 'teacher_override',
            teacherThreshold: 0.8,
          },
        }),
      )
      .mockReturnValueOnce(
        createHookState({
          threshold: {
            effectiveThreshold: 0.8,
            source: 'default',
            teacherThreshold: null,
          },
        }),
      )

    const { rerender } = render(<SettingsPage />)
    expect(screen.getByText('Teacher Override')).toBeInTheDocument()

    rerender(<SettingsPage />)
    expect(screen.getByText('System Default')).toBeInTheDocument()
  })

  it('shows validation message state', () => {
    useTeacherThresholdMock.mockReturnValue(
      createHookState({
        thresholdInput: '2.00',
        validationError: 'Value must be a decimal between 0.00 and 1.00',
      }),
    )

    render(<SettingsPage />)
    expect(screen.getByText('Value must be a decimal between 0.00 and 1.00')).toBeInTheDocument()
  })

  it('submits successfully and shows save confirmation state', () => {
    const save = vi.fn(async () => true)
    useTeacherThresholdMock.mockReturnValue(
      createHookState({
        save,
        showSavedSuccess: true,
      }),
    )

    render(<SettingsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(save).toHaveBeenCalledTimes(1)
    expect(screen.getByText('✓ Saved successfully')).toBeInTheDocument()
  })

  it('renders save failure message and saving disabled state', () => {
    const save = vi.fn(async () => false)
    useTeacherThresholdMock.mockReturnValue(
      createHookState({
        save,
        saveError: 'Failed to save changes. Please try again.',
        isSaving: true,
      }),
    )

    render(<SettingsPage />)

    const button = screen.getByRole('button', { name: 'Saving...' })
    expect(button).toBeDisabled()
    expect(screen.getByText('Failed to save changes. Please try again.')).toBeInTheDocument()
  })
})
