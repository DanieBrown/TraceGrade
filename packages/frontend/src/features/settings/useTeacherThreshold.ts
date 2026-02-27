import { useCallback, useEffect, useRef, useState } from 'react'
import { getTeacherThreshold, updateTeacherThreshold } from './settingsApi'
import type { TeacherThreshold, ThresholdLoadState } from './types'

const DECIMAL_PATTERN = /^\d*(?:\.\d{0,2})?$/

function validateThresholdInput(value: string): string | null {
  const trimmed = value.trim()

  if (!trimmed) {
    return 'Value must be a decimal between 0.00 and 1.00'
  }

  if (!DECIMAL_PATTERN.test(trimmed)) {
    return 'Value must be a decimal between 0.00 and 1.00'
  }

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return 'Value must be a decimal between 0.00 and 1.00'
  }

  return null
}

function formatThreshold(value: number): string {
  return value.toFixed(2)
}

export function useTeacherThreshold() {
  const [loadState, setLoadState] = useState<ThresholdLoadState>('loading')
  const [threshold, setThreshold] = useState<TeacherThreshold | null>(null)
  const [thresholdInput, setThresholdInput] = useState('')
  const [fetchError, setFetchError] = useState('Failed to load preferences. Please try again.')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showSavedSuccess, setShowSavedSuccess] = useState(false)
  const successTimeoutRef = useRef<number | null>(null)

  const clearSuccessTimeout = useCallback(() => {
    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = null
    }
  }, [])

  const load = useCallback(async () => {
    setLoadState('loading')
    setFetchError('Failed to load preferences. Please try again.')

    try {
      const response = await getTeacherThreshold()
      if (!response) {
        setThreshold(null)
        setThresholdInput('')
        setLoadState('empty')
        return
      }

      setThreshold(response)
      setThresholdInput(formatThreshold(response.effectiveThreshold))
      setValidationError(null)
      setSaveError(null)
      setLoadState('done')
    } catch {
      setFetchError('Failed to load preferences. Please try again.')
      setLoadState('error')
    }
  }, [])

  const onThresholdInputChange = useCallback((value: string) => {
    setThresholdInput(value)
    setShowSavedSuccess(false)
    setSaveError(null)

    const inputError = validateThresholdInput(value)
    setValidationError(inputError)
  }, [])

  const save = useCallback(async () => {
    const inputError = validateThresholdInput(thresholdInput)
    setValidationError(inputError)
    setSaveError(null)

    if (inputError) {
      return false
    }

    const nextThresholdValue = Number(thresholdInput.trim())
    setIsSaving(true)
    clearSuccessTimeout()

    try {
      const updated = await updateTeacherThreshold(nextThresholdValue)
      setThreshold(updated)
      setThresholdInput(formatThreshold(updated.effectiveThreshold))
      setShowSavedSuccess(true)

      successTimeoutRef.current = window.setTimeout(() => {
        setShowSavedSuccess(false)
        successTimeoutRef.current = null
      }, 2400)

      return true
    } catch {
      setSaveError('Failed to save changes. Please try again.')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [clearSuccessTimeout, thresholdInput])

  useEffect(() => {
    void load()

    return () => {
      clearSuccessTimeout()
    }
  }, [clearSuccessTimeout, load])

  return {
    loadState,
    threshold,
    thresholdInput,
    fetchError,
    saveError,
    validationError,
    isSaving,
    showSavedSuccess,
    setThresholdInput: onThresholdInputChange,
    retryLoad: load,
    save,
  }
}
