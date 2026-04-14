import { useCallback, useEffect, useRef, useState } from 'react'
import { getGradingProvider, updateGradingProvider } from './settingsApi'
import type { GradingProviderId, GradingProviderSettings, ProviderLoadState } from './types'

export function useGradingProvider() {
  const [loadState, setLoadState] = useState<ProviderLoadState>('loading')
  const [settings, setSettings] = useState<GradingProviderSettings | null>(null)
  const [fetchError, setFetchError] = useState('Failed to load grading provider settings.')
  const [saveError, setSaveError] = useState<string | null>(null)
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
    try {
      const data = await getGradingProvider()
      setSettings(data)
      setLoadState('done')
    } catch {
      setFetchError('Failed to load grading provider settings. Please try again.')
      setLoadState('error')
    }
  }, [])

  const selectProvider = useCallback(
    async (provider: GradingProviderId) => {
      setSaveError(null)
      setIsSaving(true)
      clearSuccessTimeout()

      try {
        const updated = await updateGradingProvider(provider)
        setSettings(updated)
        setShowSavedSuccess(true)
        successTimeoutRef.current = window.setTimeout(() => {
          setShowSavedSuccess(false)
          successTimeoutRef.current = null
        }, 2400)
      } catch (err: unknown) {
        const message =
          err instanceof Error && err.message.includes('PROVIDER_NOT_CONFIGURED')
            ? 'This provider is not configured — the API key is missing on the server.'
            : 'Failed to save grading provider. Please try again.'
        setSaveError(message)
      } finally {
        setIsSaving(false)
      }
    },
    [clearSuccessTimeout],
  )

  useEffect(() => {
    void load()
    return () => {
      clearSuccessTimeout()
    }
  }, [clearSuccessTimeout, load])

  return {
    loadState,
    settings,
    fetchError,
    saveError,
    isSaving,
    showSavedSuccess,
    retryLoad: load,
    selectProvider,
  }
}
