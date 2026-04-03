import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHomework } from '../features/homework/homeworkApi'
import CreateHomeworkPage from './CreateHomeworkPage'

const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../features/homework/homeworkApi', async () => {
  const actual = await vi.importActual('../features/homework/homeworkApi')
  return {
    ...actual,
    createHomework: vi.fn(),
  }
})

const createHomeworkMock = vi.mocked(createHomework)

describe('CreateHomeworkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('guides teachers through a two-step homework flow before materials are saved', async () => {
    render(
      <MemoryRouter>
        <CreateHomeworkPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Create homework' })).toBeInTheDocument()
    expect(screen.getAllByText('Basic information')).toHaveLength(2)
    expect(screen.getByText('Materials')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Homework title'), {
      target: { value: 'Chapter 5 Review' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Continue to materials' }))

    expect(await screen.findByRole('heading', { name: 'Materials and answer key' })).toBeInTheDocument()
    expect(
      screen.getByText(/Define the assignment questions and their expected answers before you save this homework record./i),
    ).toBeInTheDocument()
  })

  it('creates homework with structured materials and the live total point value', async () => {
    createHomeworkMock.mockResolvedValue({
      id: 'homework-1',
      title: 'Chapter 5 Review',
      dueDate: '2026-04-10',
      statusLabel: 'Draft',
      classId: '',
      className: 'Algebra II — Period 3',
    })

    render(
      <MemoryRouter>
        <CreateHomeworkPage />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Create homework' })

    fireEvent.change(screen.getByLabelText('Homework title'), {
      target: { value: 'Chapter 5 Review' },
    })
    fireEvent.change(screen.getByLabelText(/Class Label/i), {
      target: { value: 'Algebra II — Period 3' },
    })
    fireEvent.change(screen.getByLabelText(/Due date/i), {
      target: { value: '2026-04-10' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue to materials' }))

    fireEvent.change(await screen.findByPlaceholderText('Enter the question text...'), {
      target: { value: 'What is 8 x 7?' },
    })
    fireEvent.change(screen.getByPlaceholderText('Type the expected answer...'), {
      target: { value: '56' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create homework' }))

    await waitFor(() => {
      expect(createHomeworkMock).toHaveBeenCalledTimes(1)
      expect(mockNavigate).toHaveBeenCalledWith('/homework')
    })

    const payload = createHomeworkMock.mock.calls[0]?.[0]
    expect(payload).toMatchObject({
      title: 'Chapter 5 Review',
      className: 'Algebra II — Period 3',
      dueDate: '2026-04-10',
      maxPoints: 10,
      materialsJson: expect.any(String),
    })
    expect(JSON.parse(payload?.materialsJson ?? '[]')).toEqual([
      {
        questionNumber: 1,
        type: 'open-ended',
        prompt: 'What is 8 x 7?',
        pointsAvailable: 10,
        answerText: '56',
      },
    ])
  })
})