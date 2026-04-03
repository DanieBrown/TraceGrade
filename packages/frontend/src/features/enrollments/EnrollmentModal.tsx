import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import type { ClassListItem } from '../classes/classesTypes'
import type { EnrollmentListItem } from './enrollmentTypes'
import type { StudentListItem } from '../students/studentsTypes'
import {
  fetchEnrollments,
  enrollStudent,
  dropStudent,
  getEnrollmentsErrorDetails,
} from './enrollmentApi'
import { fetchStudents, getStudentsLoadErrorDetails } from '../students/studentsApi'
import EnrollmentRosterList from './EnrollmentRosterList'
import EnrollmentStudentSearch from './EnrollmentStudentSearch'

type LoadState = 'loading' | 'error' | 'done'

interface EnrollmentModalProps {
  item: ClassListItem
  onClose: () => void
}

export default function EnrollmentModal({ item, onClose }: EnrollmentModalProps) {
  // ── Roster state ────────────────────────────────────────────────────────────
  const [enrollRosterLoadState, setEnrollRosterLoadState] = useState<LoadState>('loading')
  const [enrollRosterErrorMessage, setEnrollRosterErrorMessage] = useState('')
  const [enrollRosterCanRetry, setEnrollRosterCanRetry] = useState(true)
  const [enrollments, setEnrollments] = useState<EnrollmentListItem[]>([])

  // ── Student list state ───────────────────────────────────────────────────────
  const [studentListLoadState, setStudentListLoadState] = useState<LoadState>('loading')
  const [studentListErrorMessage, setStudentListErrorMessage] = useState('')
  const [studentListCanRetry, setStudentListCanRetry] = useState(true)
  const [allStudents, setAllStudents] = useState<StudentListItem[]>([])

  // ── Search state ────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Operation state ──────────────────────────────────────────────────────────
  const [enrollingStudentId, setEnrollingStudentId] = useState<string | null>(null)
  const [droppingEnrollmentId, setDroppingEnrollmentId] = useState<string | null>(null)
  const [dropErrorEnrollmentId, setDropErrorEnrollmentId] = useState<string | null>(null)
  const [dropError, setDropError] = useState('')
  const [enrollError, setEnrollError] = useState('')

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const isMountedRef = useRef(true)
  const backdropRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Mark unmounted on cleanup (isMountedRef.current = true re-set here for React 18 Strict Mode
  // double-fire: mount → cleanup → remount; without this the ref stays false after remount)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // ── Derived state ────────────────────────────────────────────────────────────
  const activeEnrollmentStudentIds = useMemo(
    () => new Set(enrollments.map((e) => e.studentId)),
    [enrollments],
  )

  const filteredStudents = useMemo(() => {
    if (!debouncedSearch) return allStudents
    const lower = debouncedSearch.toLowerCase()
    return allStudents.filter((s) => {
      const fullName = `${s.firstName ?? ''} ${s.lastName ?? ''}`.toLowerCase()
      const email = (s.email ?? '').toLowerCase()
      return fullName.includes(lower) || email.includes(lower)
    })
  }, [allStudents, debouncedSearch])

  const studentMap = useMemo(() => {
    const map = new Map<string, StudentListItem>()
    for (const s of allStudents) {
      map.set(s.id, s)
    }
    return map
  }, [allStudents])

  // ── Fetch callbacks ──────────────────────────────────────────────────────────
  const loadEnrollments = useCallback(async () => {
    setEnrollRosterLoadState('loading')
    setEnrollRosterErrorMessage('')
    try {
      const data = await fetchEnrollments(item.id)
      if (!isMountedRef.current) return
      // fetchEnrollments already returns only active enrollments
      setEnrollments(data)
      setEnrollRosterLoadState('done')
    } catch (err) {
      if (!isMountedRef.current) return
      const { message, retryable } = getEnrollmentsErrorDetails(err)
      setEnrollRosterErrorMessage(message)
      setEnrollRosterCanRetry(retryable)
      setEnrollRosterLoadState('error')
    }
  }, [item.id])

  const loadStudents = useCallback(async () => {
    setStudentListLoadState('loading')
    setStudentListErrorMessage('')
    try {
      const data = await fetchStudents()
      if (!isMountedRef.current) return
      setAllStudents(data)
      setStudentListLoadState('done')
    } catch (err) {
      if (!isMountedRef.current) return
      const { message, retryable } = getStudentsLoadErrorDetails(err)
      setStudentListErrorMessage(message)
      setStudentListCanRetry(retryable)
      setStudentListLoadState('error')
    }
  }, [])

  // ── Mount effect: two concurrent fetches ────────────────────────────────────
  useEffect(() => {
    void loadEnrollments()
    void loadStudents()
  }, [loadEnrollments, loadStudents])

  // ── Escape key handler ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // ── Backdrop click ───────────────────────────────────────────────────────────
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (
        e.target === backdropRef.current &&
        enrollingStudentId === null &&
        droppingEnrollmentId === null
      ) {
        onClose()
      }
    },
    [onClose, enrollingStudentId, droppingEnrollmentId],
  )

  // ── Search debounce ──────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value)
    }, 300)
  }, [])

  // ── Focus search input (called by roster empty-state CTA) ───────────────────
  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus()
  }, [])

  // ── Enroll handler ───────────────────────────────────────────────────────────
  const handleAdd = useCallback(
    async (studentId: string) => {
      if (droppingEnrollmentId !== null) return
      // FR-009: client-side duplicate guard
      if (activeEnrollmentStudentIds.has(studentId)) {
        setEnrollError('Student is already enrolled in this class.')
        return
      }

      setEnrollError('')
      setEnrollingStudentId(studentId)

      try {
        const newEnrollment = await enrollStudent(item.id, studentId)
        if (!isMountedRef.current) return
        setEnrollments((prev) => [...prev, newEnrollment])
        setEnrollingStudentId(null)
      } catch (err) {
        if (!isMountedRef.current) return
        setEnrollingStudentId(null)
        // On 409: show error and refresh roster to sync state
        const is409 = axios.isAxiosError(err) && err.response?.status === 409
        if (is409) {
          setEnrollError('Student is already enrolled in this class.')
          void loadEnrollments()
        } else {
          setEnrollError('Failed to enroll student. Please try again.')
        }
      }
    },
    [item.id, activeEnrollmentStudentIds, loadEnrollments, droppingEnrollmentId],
  )

  // ── Drop handler ─────────────────────────────────────────────────────────────
  const handleDrop = useCallback(
    async (enrollmentId: string) => {
      if (enrollingStudentId !== null) return
      setDropErrorEnrollmentId(null)
      setDropError('')
      setDroppingEnrollmentId(enrollmentId)

      try {
        await dropStudent(item.id, enrollmentId)
        if (!isMountedRef.current) return
        // Optimistic removal: remove row immediately on success
        setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId))
        setDroppingEnrollmentId(null)
      } catch (err) {
        if (!isMountedRef.current) return
        setDroppingEnrollmentId(null)
        setDropErrorEnrollmentId(enrollmentId)
        setDropError('Drop failed. Please try again.')
        const isStale =
          axios.isAxiosError(err) &&
          (err.response?.status === 404 || err.response?.status === 409)
        if (isStale) {
          void loadEnrollments()
        }
      }
    },
    [item.id, loadEnrollments, enrollingStudentId],
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(6, 16, 30, 0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="mx-4 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enrollment-modal-title"
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {/* Left: title + count badge */}
          <div className="flex items-center gap-2 min-w-0">
            <h2
              id="enrollment-modal-title"
              className="truncate font-display text-lg font-bold"
              style={{ color: 'var(--text-primary)' }}
              title={item.name}
            >
              {item.name}
            </h2>

            {/* Student count badge — only when roster is loaded */}
            {enrollRosterLoadState === 'done' && (
              <span
                className="flex-shrink-0 rounded-full px-2 py-0.5 font-body text-xs font-medium"
                style={{
                  background: 'rgba(232, 164, 40, 0.12)',
                  border: '1px solid rgba(232, 164, 40, 0.25)',
                  color: 'var(--accent-gold)',
                }}
                aria-live="polite"
                aria-label={`${enrollments.length} ${enrollments.length === 1 ? 'student' : 'students'} enrolled`}
              >
                {enrollments.length} {enrollments.length === 1 ? 'student' : 'students'}
              </span>
            )}
          </div>

          {/* Right: Close button */}
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1.5 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            aria-label="Close enrollment modal"
          >
            ✕
          </button>
        </div>

        {/* ── Body (two-panel layout) ─────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
          {/* Roster Panel */}
          <section
            className="flex flex-col gap-4 p-6 md:flex-1 md:overflow-y-auto border-b md:border-b-0 md:border-r"
            style={{ borderColor: 'var(--border)' }}
            aria-label="Enrolled students"
          >
            <EnrollmentRosterList
              enrollments={enrollments}
              loadState={enrollRosterLoadState}
              errorMessage={enrollRosterErrorMessage}
              canRetry={enrollRosterCanRetry}
              onRetry={() => void loadEnrollments()}
              droppingEnrollmentId={droppingEnrollmentId}
              dropErrorEnrollmentId={dropErrorEnrollmentId}
              dropError={dropError}
              onDrop={(enrollmentId) => void handleDrop(enrollmentId)}
              onFocusSearch={handleFocusSearch}
              studentMap={studentMap}
            />
          </section>

          {/* Search Panel */}
          <section
            className="flex flex-col gap-4 p-6 md:w-72 md:flex-shrink-0 md:overflow-y-auto"
            aria-label="Add students"
          >
            <EnrollmentStudentSearch
              ref={searchInputRef}
              studentListLoadState={studentListLoadState}
              studentListErrorMessage={studentListErrorMessage}
              studentListCanRetry={studentListCanRetry}
              onRetryStudents={() => void loadStudents()}
              allStudents={allStudents}
              filteredStudents={filteredStudents}
              activeEnrollmentStudentIds={activeEnrollmentStudentIds}
              debouncedSearch={debouncedSearch}
              enrollingStudentId={enrollingStudentId}
              enrollError={enrollError}
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              onAdd={(studentId) => void handleAdd(studentId)}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
