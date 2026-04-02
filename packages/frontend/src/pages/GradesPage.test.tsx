import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GradesPage from './GradesPage'

const fetchClassesForGradebookMock = vi.fn()
const fetchClassGradebookMock = vi.fn()
const getGradesLoadErrorDetailsMock = vi.fn((error: unknown) => ({
  message: error instanceof Error ? error.message : 'There was a problem connecting to the server.',
  retryable: true,
}))

vi.mock('../features/grades/gradesApi', () => ({
  fetchClassesForGradebook: (...args: unknown[]) => fetchClassesForGradebookMock(...args),
  fetchClassGradebook: (...args: unknown[]) => fetchClassGradebookMock(...args),
  getGradesLoadErrorDetails: (error: unknown) => getGradesLoadErrorDetailsMock(error),
  isGradebookEmpty: (viewModel: { columns: unknown[]; rows: unknown[] }) =>
    viewModel.columns.length === 0 || viewModel.rows.length === 0,
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

describe('GradesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getGradesLoadErrorDetailsMock.mockImplementation((error: unknown) => ({
      message: error instanceof Error ? error.message : 'There was a problem connecting to the server.',
      retryable: true,
    }))
  })

  afterEach(() => {
    cleanup()
  })

  it('renders loading state while gradebook data is being fetched', () => {
    const classesRequest = deferred<Array<{ id: string; label: string }>>()
    fetchClassesForGradebookMock.mockReturnValueOnce(classesRequest.promise)

    render(
      <MemoryRouter>
        <GradesPage />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Loading gradebook')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Select class' })).toBeDisabled()
  })

  it('renders empty state when no classes are returned', async () => {
    fetchClassesForGradebookMock.mockResolvedValueOnce([])

    render(
      <MemoryRouter>
        <GradesPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No classes found')).toBeInTheDocument()
    expect(screen.getByText('There are no classes available for gradebook viewing yet.')).toBeInTheDocument()
    expect(
      screen.getByText('This page summarizes published class assignments and finalized exam grades. Homework items created on the Homework page do not create gradebook columns.'),
    ).toBeInTheDocument()
    expect(fetchClassGradebookMock).not.toHaveBeenCalled()
  })

  it('renders empty state when selected class has no gradebook rows or columns', async () => {
    fetchClassesForGradebookMock.mockResolvedValueOnce([{ id: 'class-1', label: 'Math 101' }])
    fetchClassGradebookMock.mockResolvedValueOnce({
      classId: 'class-1',
      classLabel: 'Math 101',
      columns: [],
      rows: [],
    })

    render(
      <MemoryRouter>
        <GradesPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No gradebook data found')).toBeInTheDocument()
    expect(screen.getByText("This class doesn't have any students or assignments yet.")).toBeInTheDocument()
  })

  it('renders populated recorded grades and shows missing grades with fallback text', async () => {
    fetchClassesForGradebookMock.mockResolvedValueOnce([{ id: 'class-1', label: 'Math 101' }])
    fetchClassGradebookMock.mockResolvedValueOnce({
      classId: 'class-1',
      classLabel: 'Math 101',
      columns: [
        { id: 'col-1', label: 'Quiz 1', categoryLabel: null, maxPoints: 20 },
        { id: 'col-2', label: 'Homework 1', categoryLabel: null, maxPoints: 10 },
      ],
      rows: [
        {
          studentId: 'student-1',
          studentName: 'Alex Kim',
          cells: [
            { columnId: 'col-1', score: 18, displayValue: '18' },
            { columnId: 'col-2', score: null, displayValue: '—' },
          ],
        },
      ],
    })

    render(
      <MemoryRouter>
        <GradesPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Recorded grades')).toBeInTheDocument()
    expect(
      screen.getByText('Choose one student to review their full set of recorded grades.'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Alex Kim').length).toBeGreaterThan(0)
    expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    expect(screen.getByText('Homework 1')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText('No grade yet')).toBeInTheDocument()
  })

  it('renders error with retry and retries fetch for the selected class', async () => {
    fetchClassesForGradebookMock.mockResolvedValueOnce([{ id: 'class-1', label: 'Math 101' }])
    fetchClassGradebookMock.mockRejectedValueOnce(new Error('network error'))
    fetchClassGradebookMock.mockResolvedValueOnce({
      classId: 'class-1',
      classLabel: 'Math 101',
      columns: [{ id: 'col-1', label: 'Quiz 1', categoryLabel: null, maxPoints: 20 }],
      rows: [
        {
          studentId: 'student-1',
          studentName: 'Alex Kim',
          cells: [{ columnId: 'col-1', score: 19, displayValue: '19' }],
        },
      ],
    })

    render(
      <MemoryRouter>
        <GradesPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Failed to load gradebook.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry loading grades' }))

    expect((await screen.findAllByText('Alex Kim')).length).toBeGreaterThan(0)
    expect(screen.getByText('19')).toBeInTheDocument()
    expect(fetchClassGradebookMock).toHaveBeenCalledTimes(2)
  })

  it('ignores stale class-switch responses and keeps the latest selected class data', async () => {
    const classOneRequest = deferred<{
      classId: string
      classLabel: string
      columns: Array<{ id: string; label: string; categoryLabel: null; maxPoints: number }>
      rows: Array<{
        studentId: string
        studentName: string
        cells: Array<{ columnId: string; score: number; displayValue: string }>
      }>
    }>()

    fetchClassesForGradebookMock.mockResolvedValueOnce([
      { id: 'class-1', label: 'Math 101' },
      { id: 'class-2', label: 'Science 202' },
    ])

    fetchClassGradebookMock.mockImplementation((classId: string) => {
      if (classId === 'class-1') {
        return classOneRequest.promise
      }

      if (classId === 'class-2') {
        return Promise.resolve({
          classId: 'class-2',
          classLabel: 'Science 202',
          columns: [{ id: 'col-s', label: 'Lab 1', categoryLabel: null, maxPoints: 10 }],
          rows: [
            {
              studentId: 'student-s',
              studentName: 'Latest Student',
              cells: [{ columnId: 'col-s', score: 9, displayValue: '9' }],
            },
          ],
        })
      }

      return Promise.resolve({
        classId,
        classLabel: classId,
        columns: [],
        rows: [],
      })
    })

    render(
      <MemoryRouter>
        <GradesPage />
      </MemoryRouter>,
    )

    const classSelect = await screen.findByRole('combobox', { name: 'Select class' })
    fireEvent.change(classSelect, { target: { value: 'class-2' } })

    expect((await screen.findAllByText('Latest Student')).length).toBeGreaterThan(0)

    classOneRequest.resolve({
      classId: 'class-1',
      classLabel: 'Math 101',
      columns: [{ id: 'col-m', label: 'Quiz 1', categoryLabel: null, maxPoints: 20 }],
      rows: [
        {
          studentId: 'student-m',
          studentName: 'Stale Student',
          cells: [{ columnId: 'col-m', score: 20, displayValue: '20' }],
        },
      ],
    })

    await waitFor(() => {
      expect(screen.getAllByText('Latest Student').length).toBeGreaterThan(0)
      expect(screen.queryByText('Stale Student')).not.toBeInTheDocument()
    })
  })

  it('prefers the class from the URL when loading the initial gradebook', async () => {
    fetchClassesForGradebookMock.mockResolvedValueOnce([
      { id: 'class-1', label: 'Math 101' },
      { id: 'class-2', label: 'Science 202' },
    ])
    fetchClassGradebookMock.mockResolvedValueOnce({
      classId: 'class-2',
      classLabel: 'Science 202',
      columns: [{ id: 'col-1', label: 'Lab 1', categoryLabel: null, maxPoints: 10 }],
      rows: [
        {
          studentId: 'student-2',
          studentName: 'Taylor Reed',
          cells: [{ columnId: 'col-1', score: 9, displayValue: '9' }],
        },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/grades?classId=class-2']}>
        <GradesPage />
      </MemoryRouter>,
    )

    const classSelect = await screen.findByRole('combobox', { name: 'Select class' })
    expect(classSelect).toHaveValue('class-2')
    expect(fetchClassGradebookMock).toHaveBeenCalledWith('class-2')
    expect(screen.getAllByText('Taylor Reed').length).toBeGreaterThan(0)
  })
})
