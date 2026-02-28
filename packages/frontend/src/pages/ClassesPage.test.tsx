import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClassListItem } from '../features/classes/classesTypes'
import ClassesPage from './ClassesPage'

const fetchClassesMock = vi.fn()
const createClassMock = vi.fn()
const updateClassMock = vi.fn()
const archiveClassMock = vi.fn()
const getClassesLoadErrorDetailsMock = vi.fn((error: unknown) => ({
  message: error instanceof Error ? error.message : 'There was a problem loading classes.',
  retryable: true,
}))

vi.mock('../features/classes/classesApi', () => ({
  fetchClasses: (...args: unknown[]) => fetchClassesMock(...args),
  createClass: (...args: unknown[]) => createClassMock(...args),
  updateClass: (...args: unknown[]) => updateClassMock(...args),
  archiveClass: (...args: unknown[]) => archiveClassMock(...args),
  getClassesLoadErrorDetails: (...args: unknown[]) => getClassesLoadErrorDetailsMock(...args),
  isClassListEmpty: (items: unknown[]) => items.length === 0,
}))

const BASE_CLASS: ClassListItem = {
  id: 'class-1',
  name: 'Biology 101',
  subject: 'Science',
  period: '2',
  schoolYear: '2026-2027',
  isActive: true,
}

describe('ClassesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getClassesLoadErrorDetailsMock.mockImplementation((error: unknown) => ({
      message: error instanceof Error ? error.message : 'There was a problem loading classes.',
      retryable: true,
    }))
  })

  afterEach(() => {
    cleanup()
  })

  it('renders loading state while classes are being fetched', () => {
    fetchClassesMock.mockReturnValueOnce(new Promise(() => {}))

    render(<ClassesPage />)

    expect(screen.getByLabelText('Loading classes')).toBeInTheDocument()
  })

  it('renders retryable error state and retries loading', async () => {
    fetchClassesMock.mockRejectedValueOnce(new Error('network error'))
    fetchClassesMock.mockResolvedValueOnce([])
    getClassesLoadErrorDetailsMock.mockReturnValueOnce({
      message: 'Could not connect to the server. Check your connection.',
      retryable: true,
    })

    render(<ClassesPage />)

    expect(await screen.findByText('Failed to load classes.')).toBeInTheDocument()
    const retryButton = screen.getByRole('button', { name: 'Retry loading classes' })

    fireEvent.click(retryButton)

    expect(await screen.findByText('No classes found')).toBeInTheDocument()
    expect(fetchClassesMock).toHaveBeenCalledTimes(2)
  })

  it('renders non-retryable error state and disables New Class action', async () => {
    fetchClassesMock.mockRejectedValueOnce(new Error('invalid config'))
    getClassesLoadErrorDetailsMock.mockReturnValueOnce({
      message:
        'Classes cannot be loaded because school configuration is invalid. Set VITE_SCHOOL_ID to a valid school UUID and reload the page.',
      retryable: false,
    })

    render(<ClassesPage />)

    expect(
      await screen.findByText(
        'Classes cannot be loaded because school configuration is invalid. Set VITE_SCHOOL_ID to a valid school UUID and reload the page.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry loading classes' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create class' })).toBeDisabled()
  })

  it('renders populated list with required class fields', async () => {
    fetchClassesMock.mockResolvedValueOnce([
      BASE_CLASS,
      {
        ...BASE_CLASS,
        id: 'class-2',
        name: 'Chemistry A',
        period: '3',
      },
    ])

    render(<ClassesPage />)

    expect(await screen.findByText('Biology 101')).toBeInTheDocument()
    expect(screen.getAllByText('Science')).toHaveLength(2)
    expect(screen.getByText('Period: 2')).toBeInTheDocument()
    expect(screen.getAllByText('Year: 2026-2027')).toHaveLength(2)
    expect(screen.getByText('Chemistry A')).toBeInTheDocument()
    expect(screen.getByText('Period: 3')).toBeInTheDocument()
  })

  it('creates a class from New Class flow and prepends it to list', async () => {
    fetchClassesMock.mockResolvedValueOnce([])
    createClassMock.mockResolvedValueOnce({
      id: 'class-3',
      name: 'Chemistry 101',
      subject: 'Science',
      period: '4',
      schoolYear: '2026-2027',
      isActive: true,
    })

    render(<ClassesPage />)

    const emptyStateHeading = await screen.findByText('No classes found')
    const emptyStateSection = emptyStateHeading.closest('section')
    expect(emptyStateSection).not.toBeNull()

    const emptyStateCreateCta = within(emptyStateSection as HTMLElement).getByRole('button', {
      name: 'Create class',
    })
    expect(within(emptyStateSection as HTMLElement).getByText('Get started by creating your first class.')).toBeInTheDocument()
    expect(emptyStateCreateCta).toBeVisible()

    fireEvent.click(emptyStateCreateCta)

    fireEvent.change(screen.getByLabelText(/Class Name/i), { target: { value: 'Chemistry 101' } })
    fireEvent.change(screen.getByLabelText(/Subject/i), { target: { value: 'Science' } })
    fireEvent.change(screen.getByLabelText(/Period/i), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText(/School Year/i), { target: { value: '2026-2027' } })

    fireEvent.click(screen.getByRole('button', { name: '+ Create Class' }))

    await waitFor(() => {
      expect(createClassMock).toHaveBeenCalledWith({
        name: 'Chemistry 101',
        subject: 'Science',
        period: '4',
        schoolYear: '2026-2027',
      })
    })

    expect(await screen.findByText('Chemistry 101')).toBeInTheDocument()
  })

  it('prevents duplicate in-flight create submissions from the class form handler', async () => {
    fetchClassesMock.mockResolvedValueOnce([])

    let resolveCreateRequest: ((value: ClassListItem) => void) | null = null
    createClassMock.mockReturnValueOnce(
      new Promise<ClassListItem>((resolve) => {
        resolveCreateRequest = resolve
      }),
    )

    render(<ClassesPage />)

    const emptyStateHeading = await screen.findByText('No classes found')
    const emptyStateSection = emptyStateHeading.closest('section')
    expect(emptyStateSection).not.toBeNull()

    fireEvent.click(
      within(emptyStateSection as HTMLElement).getByRole('button', { name: 'Create class' }),
    )

    fireEvent.change(screen.getByLabelText(/Class Name/i), { target: { value: 'Chemistry 101' } })
    fireEvent.change(screen.getByLabelText(/Subject/i), { target: { value: 'Science' } })
    fireEvent.change(screen.getByLabelText(/Period/i), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText(/School Year/i), { target: { value: '2026-2027' } })

    const createDialog = screen.getByRole('dialog', { name: 'Create class' })
    const createForm = within(createDialog).getByRole('button', { name: '+ Create Class' }).closest('form')

    expect(createForm).not.toBeNull()

    fireEvent.submit(createForm as HTMLFormElement)
    fireEvent.submit(createForm as HTMLFormElement)

    await waitFor(() => {
      expect(createClassMock).toHaveBeenCalledTimes(1)
    })

    expect(resolveCreateRequest).not.toBeNull()
    resolveCreateRequest?.({
      id: 'class-3',
      name: 'Chemistry 101',
      subject: 'Science',
      period: '4',
      schoolYear: '2026-2027',
      isActive: true,
    })

    expect(await screen.findByText('Chemistry 101')).toBeInTheDocument()
  })

  it('shows actionable mutation error when creating a class fails', async () => {
    fetchClassesMock.mockResolvedValueOnce([])
    createClassMock.mockRejectedValueOnce(new Error('Create failed upstream'))

    render(<ClassesPage />)

    const emptyStateHeading = await screen.findByText('No classes found')
    const emptyStateSection = emptyStateHeading.closest('section')
    expect(emptyStateSection).not.toBeNull()

    fireEvent.click(
      within(emptyStateSection as HTMLElement).getByRole('button', { name: 'Create class' }),
    )

    fireEvent.change(screen.getByLabelText(/Class Name/i), { target: { value: 'Chemistry 101' } })
    fireEvent.change(screen.getByLabelText(/Subject/i), { target: { value: 'Science' } })
    fireEvent.change(screen.getByLabelText(/Period/i), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText(/School Year/i), { target: { value: '2026-2027' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Create Class' }))

    await waitFor(() => {
      expect(createClassMock).toHaveBeenCalledWith({
        name: 'Chemistry 101',
        subject: 'Science',
        period: '4',
        schoolYear: '2026-2027',
      })
    })

    const createDialog = screen.getByRole('dialog', { name: 'Create class' })
    expect(createDialog).toBeInTheDocument()
    expect(await within(createDialog).findByText('Create failed upstream')).toBeInTheDocument()
    expect(screen.queryByText('Chemistry 101')).not.toBeInTheDocument()
  })

  it('prefills edit form and updates class via PUT contract', async () => {
    fetchClassesMock.mockResolvedValueOnce([BASE_CLASS])
    updateClassMock.mockResolvedValueOnce({
      ...BASE_CLASS,
      name: 'Biology Honors',
      period: '5',
    })

    render(<ClassesPage />)

    expect(await screen.findByText('Biology 101')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Biology 101' }))

    expect(screen.getByDisplayValue('Biology 101')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Science')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-2027')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Class Name/i), { target: { value: 'Biology Honors' } })
    fireEvent.change(screen.getByLabelText(/Period/i), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(updateClassMock).toHaveBeenCalledWith('class-1', {
        name: 'Biology Honors',
        subject: 'Science',
        period: '5',
        schoolYear: '2026-2027',
      })
    })

    expect(await screen.findByText('Biology Honors')).toBeInTheDocument()
  })

  it('shows actionable mutation error when updating a class fails', async () => {
    fetchClassesMock.mockResolvedValueOnce([BASE_CLASS])
    updateClassMock.mockRejectedValueOnce(new Error('Update failed upstream'))

    render(<ClassesPage />)

    expect(await screen.findByText('Biology 101')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Biology 101' }))
    fireEvent.change(screen.getByLabelText(/Class Name/i), { target: { value: 'Biology Honors' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(updateClassMock).toHaveBeenCalledWith('class-1', {
        name: 'Biology Honors',
        subject: 'Science',
        period: '2',
        schoolYear: '2026-2027',
      })
    })

    const editDialog = screen.getByRole('dialog', { name: 'Edit class' })
    expect(editDialog).toBeInTheDocument()
    expect(await within(editDialog).findByText('Update failed upstream')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Biology 101' })).toBeInTheDocument()
  })

  it('archives class after confirmation and removes it from active list', async () => {
    fetchClassesMock.mockResolvedValueOnce([BASE_CLASS])
    archiveClassMock.mockResolvedValueOnce(undefined)

    render(<ClassesPage />)

    expect(await screen.findByText('Biology 101')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Archive Biology 101' }))
    expect(screen.getByRole('dialog', { name: 'Archive class' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))

    await waitFor(() => {
      expect(archiveClassMock).toHaveBeenCalledWith('class-1')
    })

    await waitFor(() => {
      expect(screen.queryByText('Biology 101')).not.toBeInTheDocument()
    })
  })

  it('prevents duplicate in-flight archive confirmations from the archive modal handler', async () => {
    fetchClassesMock.mockResolvedValueOnce([BASE_CLASS])

    let resolveArchiveRequest: (() => void) | null = null
    archiveClassMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveArchiveRequest = resolve
      }),
    )

    render(<ClassesPage />)

    expect(await screen.findByText('Biology 101')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Archive Biology 101' }))

    const archiveDialog = screen.getByRole('dialog', { name: 'Archive class' })
    const archiveButton = within(archiveDialog).getByRole('button', { name: 'Archive' })

    fireEvent.click(archiveButton)
    fireEvent.click(archiveButton)

    await waitFor(() => {
      expect(archiveClassMock).toHaveBeenCalledTimes(1)
    })

    expect(resolveArchiveRequest).not.toBeNull()
    resolveArchiveRequest?.()

    await waitFor(() => {
      expect(screen.queryByText('Biology 101')).not.toBeInTheDocument()
    })
  })

  it('shows actionable mutation error when archiving a class fails', async () => {
    fetchClassesMock.mockResolvedValueOnce([BASE_CLASS])
    archiveClassMock.mockRejectedValueOnce(new Error('Archive failed upstream'))

    render(<ClassesPage />)

    expect(await screen.findByText('Biology 101')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Archive Biology 101' }))
    expect(screen.getByRole('dialog', { name: 'Archive class' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))

    await waitFor(() => {
      expect(archiveClassMock).toHaveBeenCalledWith('class-1')
    })

    const archiveDialog = screen.getByRole('dialog', { name: 'Archive class' })
    expect(archiveDialog).toBeInTheDocument()
    expect(await within(archiveDialog).findByText('Archive failed upstream')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Biology 101' })).toBeInTheDocument()
  })
})