import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchClasses } from '../features/classes/classesApi'
import { ensureExamAssignmentForClass } from '../features/exams/examCreationApi'
import {
  createExamTemplate,
  fetchExamTemplateById,
  updateExamTemplate,
} from '../features/exams/examsApi'
import {
  createAnswerRubric,
  fetchAnswerRubrics,
  updateAnswerRubric,
} from '../features/rubrics/rubricsApi'
import CreateExamPage from './CreateExamPage'

const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../features/classes/classesApi', () => ({
  fetchClasses: vi.fn(),
}))

vi.mock('../features/exams/examCreationApi', () => ({
  ensureExamAssignmentForClass: vi.fn(),
}))

vi.mock('../features/exams/examsApi', async () => {
  const actual = await vi.importActual('../features/exams/examsApi')
  return {
    ...actual,
    createExamTemplate: vi.fn(),
    fetchExamTemplateById: vi.fn(),
    updateExamTemplate: vi.fn(),
  }
})

vi.mock('../features/rubrics/rubricsApi', async () => {
  const actual = await vi.importActual('../features/rubrics/rubricsApi')
  return {
    ...actual,
    createAnswerRubric: vi.fn(),
    fetchAnswerRubrics: vi.fn(),
    updateAnswerRubric: vi.fn(),
  }
})

const fetchClassesMock = vi.mocked(fetchClasses)
const ensureExamAssignmentForClassMock = vi.mocked(ensureExamAssignmentForClass)
const createExamTemplateMock = vi.mocked(createExamTemplate)
const fetchExamTemplateByIdMock = vi.mocked(fetchExamTemplateById)
const updateExamTemplateMock = vi.mocked(updateExamTemplate)
const createAnswerRubricMock = vi.mocked(createAnswerRubric)
const fetchAnswerRubricsMock = vi.mocked(fetchAnswerRubrics)
const updateAnswerRubricMock = vi.mocked(updateAnswerRubric)

describe('CreateExamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchClassesMock.mockResolvedValue([
      {
        id: 'class-1',
        name: 'Algebra I',
        subject: 'Mathematics',
        period: 'Period 1',
        schoolYear: '2025-2026',
        isActive: true,
      },
      {
        id: 'class-2',
        name: 'Biology',
        subject: 'Science',
        period: 'Period 3',
        schoolYear: '2025-2026',
        isActive: true,
      },
    ])
    fetchAnswerRubricsMock.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it('guides teachers through a two-step exam flow with class search before rubric design', async () => {
    render(
      <MemoryRouter>
        <CreateExamPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Create exam' })).toBeInTheDocument()
    expect(screen.getAllByText('Basic information')).toHaveLength(2)
    expect(screen.getByText('Rubrics')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Exam name'), {
      target: { value: 'Algebra Midterm' },
    })
    fireEvent.change(screen.getByLabelText('Class'), {
      target: { value: 'alg' },
    })

    fireEvent.click(await screen.findByRole('button', { name: /Use Algebra I/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue to rubrics' }))

    expect(await screen.findByRole('heading', { name: 'Rubrics and answer key' })).toBeInTheDocument()
    expect(screen.getByText(/Build the answer key and scoring rules for each question before you publish the exam./i)).toBeInTheDocument()
  })

  it('creates a class-linked assignment before saving the exam template and rubrics', async () => {
    ensureExamAssignmentForClassMock.mockResolvedValue({
      assignmentId: 'assignment-1',
      categoryId: 'category-1',
    })
    createExamTemplateMock.mockResolvedValue({
      id: 'exam-1',
      assignmentId: 'assignment-1',
      title: 'Algebra Midterm',
      questionCount: 1,
      totalPoints: 10,
      statusLabel: 'Draft',
    })
    createAnswerRubricMock.mockResolvedValue({
      id: 'rubric-1',
      examTemplateId: 'exam-1',
      questionNumber: 1,
      answerText: 'A: ',
      answerImageUrl: null,
      pointsAvailable: 10,
      acceptableVariations: null,
      gradingNotes: null,
      createdAt: '2026-04-02T00:00:00Z',
      updatedAt: '2026-04-02T00:00:00Z',
    })

    render(
      <MemoryRouter>
        <CreateExamPage />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Create exam' })

    fireEvent.change(screen.getByLabelText('Exam name'), {
      target: { value: 'Algebra Midterm' },
    })
    fireEvent.change(screen.getByLabelText('Class'), {
      target: { value: 'algebra' },
    })
    fireEvent.click(await screen.findByRole('button', { name: /Use Algebra I/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue to rubrics' }))

    fireEvent.change(await screen.findByPlaceholderText('Enter the question text...'), {
      target: { value: 'What is 2 + 2?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Mark option A as correct' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create exam' }))

    await waitFor(() => {
      expect(ensureExamAssignmentForClassMock).toHaveBeenCalledWith({
        classId: 'class-1',
        examName: 'Algebra Midterm',
        topic: '',
        totalPoints: 10,
      })
      expect(createExamTemplateMock).toHaveBeenCalledWith({
        assignmentId: 'assignment-1',
        name: 'Algebra Midterm',
        topic: undefined,
        totalPoints: 10,
        questionsJson: expect.any(String),
      })
      expect(createAnswerRubricMock).toHaveBeenCalledTimes(1)
      expect(mockNavigate).toHaveBeenCalledWith('/exams')
    })
  })

  it('loads an existing exam into the shared editor and updates it instead of creating a new template', async () => {
    fetchExamTemplateByIdMock.mockResolvedValue({
      id: 'exam-1',
      assignmentId: 'assignment-1',
      title: 'Algebra Midterm',
      topic: 'Linear Equations',
      questionCount: 1,
      totalPoints: 10,
      statusLabel: 'Draft',
      questionsJson: JSON.stringify([
        {
          questionNumber: 1,
          type: 'multiple-choice',
          prompt: 'What is 2 + 2?',
          pointsAvailable: 10,
          options: [
            { label: 'A', text: '4' },
            { label: 'B', text: '5' },
          ],
          correctOptionIndex: 0,
        },
      ]),
    } as never)
    fetchAnswerRubricsMock.mockResolvedValueOnce([
      {
        id: 'rubric-1',
        examTemplateId: 'exam-1',
        questionNumber: 1,
        answerText: 'A: 4',
        answerImageUrl: null,
        pointsAvailable: 10,
        acceptableVariations: null,
        gradingNotes: 'Multiple choice - exact match expected.',
        createdAt: '2026-04-02T00:00:00Z',
        updatedAt: '2026-04-02T00:00:00Z',
      },
    ])
    updateExamTemplateMock.mockResolvedValue({
      id: 'exam-1',
      assignmentId: 'assignment-1',
      title: 'Algebra Midterm',
      topic: 'Linear Equations',
      questionCount: 1,
      totalPoints: 10,
      statusLabel: 'Draft',
      questionsJson: '[]',
    } as never)
    updateAnswerRubricMock.mockResolvedValue({
      id: 'rubric-1',
      examTemplateId: 'exam-1',
      questionNumber: 1,
      answerText: 'A: 4',
      answerImageUrl: null,
      pointsAvailable: 10,
      acceptableVariations: null,
      gradingNotes: 'Multiple choice - exact match expected.',
      createdAt: '2026-04-02T00:00:00Z',
      updatedAt: '2026-04-02T00:00:00Z',
    })

    render(
      <MemoryRouter initialEntries={['/exams/new?examId=exam-1']}>
        <CreateExamPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Edit exam' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Algebra Midterm')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Linear Equations')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Continue to rubrics' }))

    expect(await screen.findByDisplayValue('What is 2 + 2?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save exam changes' }))

    await waitFor(() => {
      expect(fetchExamTemplateByIdMock).toHaveBeenCalledWith('exam-1')
      expect(fetchAnswerRubricsMock).toHaveBeenCalledWith('exam-1')
      expect(updateExamTemplateMock).toHaveBeenCalledWith('exam-1', {
        name: 'Algebra Midterm',
        topic: 'Linear Equations',
        totalPoints: 10,
        questionsJson: expect.any(String),
      })
      expect(updateAnswerRubricMock).toHaveBeenCalledTimes(1)
      expect(createExamTemplateMock).not.toHaveBeenCalled()
      expect(createAnswerRubricMock).not.toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/exams')
    })
  })
})