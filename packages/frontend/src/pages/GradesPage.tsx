import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ClassContextHeader from '../features/grades/ClassContextHeader'
import GradebookTable from '../features/grades/GradebookTable'
import { EmptyGradesState, ErrorGradesState, LoadingGradesState } from '../features/grades/GradesStates'
import {
  fetchClassGradebook,
  fetchClassesForGradebook,
  getGradesLoadErrorDetails,
  isGradebookEmpty,
} from '../features/grades/gradesApi'
import type { GradebookClassOption, GradebookViewModel } from '../features/grades/gradesTypes'

type LoadState = 'loading' | 'error' | 'done'

const EMPTY_VIEW_MODEL: GradebookViewModel = {
  classId: '',
  classLabel: 'Untitled Class',
  columns: [],
  rows: [],
}

export default function GradesPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [classOptions, setClassOptions] = useState<GradebookClassOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [gradebook, setGradebook] = useState<GradebookViewModel>(EMPTY_VIEW_MODEL)
  const [errorMessage, setErrorMessage] = useState('There was a problem connecting to the server.')
  const [canRetry, setCanRetry] = useState(true)
  const latestRequestIdRef = useRef(0)
  const isMountedRef = useRef(true)

  const loadInitialState = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current
    setLoadState('loading')

    try {
      const classes = await fetchClassesForGradebook()
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      setClassOptions(classes)

      if (classes.length === 0) {
        setSelectedClassId('')
        setGradebook(EMPTY_VIEW_MODEL)
        setErrorMessage('There was a problem connecting to the server.')
        setCanRetry(true)
        setLoadState('done')
        return
      }

      const initialClassId = classes[0].id
      setSelectedClassId(initialClassId)

      const viewModel = await fetchClassGradebook(initialClassId)
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      setGradebook(viewModel)
      setErrorMessage('There was a problem connecting to the server.')
      setCanRetry(true)
      setLoadState('done')
    } catch (error) {
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      const details = getGradesLoadErrorDetails(error)
      setErrorMessage(details.message)
      setCanRetry(details.retryable)
      setLoadState('error')
    }
  }, [])

  const loadGradebookForClass = useCallback(async (classId: string) => {
    const requestId = ++latestRequestIdRef.current
    setLoadState('loading')

    try {
      const viewModel = await fetchClassGradebook(classId)
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      setGradebook(viewModel)
      setErrorMessage('There was a problem connecting to the server.')
      setCanRetry(true)
      setLoadState('done')
    } catch (error) {
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      const details = getGradesLoadErrorDetails(error)
      setErrorMessage(details.message)
      setCanRetry(details.retryable)
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    void loadInitialState()

    return () => {
      isMountedRef.current = false
    }
  }, [loadInitialState])

  const handleClassChange = useCallback(
    (nextClassId: string) => {
      if (!nextClassId || nextClassId === selectedClassId) {
        return
      }

      setSelectedClassId(nextClassId)
      void loadGradebookForClass(nextClassId)
    },
    [loadGradebookForClass, selectedClassId],
  )

  const handleRetry = useCallback(() => {
    if (classOptions.length === 0 || !selectedClassId) {
      void loadInitialState()
      return
    }

    void loadGradebookForClass(selectedClassId)
  }, [classOptions.length, loadGradebookForClass, loadInitialState, selectedClassId])

  const selectedClassLabel = useMemo(
    () => classOptions.find((option) => option.id === selectedClassId)?.label ?? '',
    [classOptions, selectedClassId],
  )

  const emptyStateContent = useMemo(() => {
    if (classOptions.length === 0) {
      return {
        title: 'No classes found',
        description: 'There are no classes available for gradebook viewing yet.',
      }
    }

    return {
      title: 'No gradebook data found',
      description: "This class doesn't have any students or assignments yet.",
    }
  }, [classOptions.length])

  return (
    <main className="flex-1 overflow-y-auto bg-base" style={{ padding: '40px', maxWidth: '1200px' }}>
      <ClassContextHeader
        classOptions={classOptions}
        selectedClassId={selectedClassId}
        onClassChange={handleClassChange}
        disabled={loadState === 'loading'}
      />

      {loadState === 'loading' && <LoadingGradesState />}

      {loadState === 'error' && (
        <ErrorGradesState
          message={errorMessage}
          canRetry={canRetry}
          onRetry={handleRetry}
        />
      )}

      {loadState === 'done' && classOptions.length > 0 && selectedClassLabel && (
        <p className="mb-4 font-body text-sm text-sec" aria-live="polite">
          Class: <span className="font-semibold text-pri">{selectedClassLabel}</span>
        </p>
      )}

      {loadState === 'done' && (classOptions.length === 0 || isGradebookEmpty(gradebook)) && (
        <EmptyGradesState title={emptyStateContent.title} description={emptyStateContent.description} />
      )}

      {loadState === 'done' && classOptions.length > 0 && !isGradebookEmpty(gradebook) && (
        <GradebookTable viewModel={gradebook} />
      )}
    </main>
  )
}
