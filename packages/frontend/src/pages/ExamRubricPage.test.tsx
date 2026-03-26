import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExamRubricPage from './ExamRubricPage'

const fetchExamTemplateByIdMock = vi.fn()
const fetchAnswerRubricsMock = vi.fn()
const createAnswerRubricMock = vi.fn()
const updateAnswerRubricMock = vi.fn()
const uploadAnswerRubricImageMock = vi.fn()

vi.mock('../features/exams/examsApi', () => ({
  fetchExamTemplateById: (...args: unknown[]) => fetchExamTemplateByIdMock(...args),
}))

vi.mock('../features/rubrics/rubricsApi', () => ({
  fetchAnswerRubrics: (...args: unknown[]) => fetchAnswerRubricsMock(...args),
  createAnswerRubric: (...args: unknown[]) => createAnswerRubricMock(...args),
  updateAnswerRubric: (...args: unknown[]) => updateAnswerRubricMock(...args),
  uploadAnswerRubricImage: (...args: unknown[]) => uploadAnswerRubricImageMock(...args),
}))

describe('ExamRubricPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('saves a new rubric for a parsed exam question', async () => {
    fetchExamTemplateByIdMock.mockResolvedValueOnce({
      id: 'template-1',
      assignmentId: 'assignment-1',
      title: 'Algebra Midterm',
      questionCount: 1,
      totalPoints: 10,
      statusLabel: 'Draft',
      questionsJson: '[{"number":1,"question":"Solve for x","points":10}]',
    })
    fetchAnswerRubricsMock.mockResolvedValueOnce([])
    createAnswerRubricMock.mockResolvedValueOnce({
      id: 'rubric-1',
      examTemplateId: 'template-1',
      questionNumber: 1,
      answerText: 'x = 2',
      answerImageUrl: null,
      pointsAvailable: 10,
      acceptableVariations: '2',
      gradingNotes: 'Accept equivalent simplifications.',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    render(
      <MemoryRouter initialEntries={['/exams/template-1/rubrics']}>
        <Routes>
          <Route path="/exams/:examId/rubrics" element={<ExamRubricPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Solve for x')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Expected answer'), {
      target: { value: 'x = 2' },
    })
    fireEvent.change(screen.getByLabelText('Acceptable variations'), {
      target: { value: '2' },
    })
    fireEvent.change(screen.getByLabelText('Grading notes'), {
      target: { value: 'Accept equivalent simplifications.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Question 1 Rubric' }))

    await waitFor(() => {
      expect(createAnswerRubricMock).toHaveBeenCalledWith(
        'template-1',
        expect.objectContaining({
          questionNumber: 1,
          answerText: 'x = 2',
          pointsAvailable: 10,
          acceptableVariations: '2',
          gradingNotes: 'Accept equivalent simplifications.',
        }),
      )
    })

    expect(updateAnswerRubricMock).not.toHaveBeenCalled()
    expect(await screen.findByText('Rubric saved.')).toBeInTheDocument()
  })

  it('uploads a teacher answer image and saves an image-only rubric', async () => {
    fetchExamTemplateByIdMock.mockResolvedValueOnce({
      id: 'template-1',
      assignmentId: 'assignment-1',
      title: 'Algebra Midterm',
      questionCount: 1,
      totalPoints: 10,
      statusLabel: 'Draft',
      questionsJson: '[{"number":1,"question":"Solve for x","points":10}]',
    })
    fetchAnswerRubricsMock.mockResolvedValueOnce([])
    uploadAnswerRubricImageMock.mockResolvedValueOnce({
      fileUrl: 'https://cdn.test/rubrics/q1-answer.png',
      fileName: 'q1-answer.png',
      uploadedAt: '2026-01-01T00:00:00Z',
    })
    createAnswerRubricMock.mockResolvedValueOnce({
      id: 'rubric-1',
      examTemplateId: 'template-1',
      questionNumber: 1,
      answerText: null,
      answerImageUrl: 'https://cdn.test/rubrics/q1-answer.png',
      pointsAvailable: 10,
      acceptableVariations: null,
      gradingNotes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    render(
      <MemoryRouter initialEntries={['/exams/template-1/rubrics']}>
        <Routes>
          <Route path="/exams/:examId/rubrics" element={<ExamRubricPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Solve for x')).toBeInTheDocument()

    const file = new File(['image-bytes'], 'q1-answer.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Upload or replace teacher answer image'), {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(uploadAnswerRubricImageMock).toHaveBeenCalledWith('template-1', file)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save Question 1 Rubric' }))

    await waitFor(() => {
      expect(createAnswerRubricMock).toHaveBeenCalledWith(
        'template-1',
        expect.objectContaining({
          questionNumber: 1,
          answerText: undefined,
          answerImageUrl: 'https://cdn.test/rubrics/q1-answer.png',
          pointsAvailable: 10,
        }),
      )
    })

    expect(await screen.findByText('Rubric saved.')).toBeInTheDocument()
  })

  it('removes an existing teacher answer image and persists the cleared state', async () => {
    fetchExamTemplateByIdMock.mockResolvedValueOnce({
      id: 'template-1',
      assignmentId: 'assignment-1',
      title: 'Algebra Midterm',
      questionCount: 1,
      totalPoints: 10,
      statusLabel: 'Draft',
      questionsJson: '[{"number":1,"question":"Solve for x","points":10}]',
    })
    fetchAnswerRubricsMock.mockResolvedValueOnce([
      {
        id: 'rubric-1',
        examTemplateId: 'template-1',
        questionNumber: 1,
        answerText: 'x = 2',
        answerImageUrl: 'https://cdn.test/rubrics/q1-answer.png',
        pointsAvailable: 10,
        acceptableVariations: null,
        gradingNotes: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ])
    updateAnswerRubricMock.mockResolvedValueOnce({
      id: 'rubric-1',
      examTemplateId: 'template-1',
      questionNumber: 1,
      answerText: 'x = 2',
      answerImageUrl: null,
      pointsAvailable: 10,
      acceptableVariations: null,
      gradingNotes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    render(
      <MemoryRouter initialEntries={['/exams/template-1/rubrics']}>
        <Routes>
          <Route path="/exams/:examId/rubrics" element={<ExamRubricPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Solve for x')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove image' }))

    expect(screen.queryByAltText('Teacher answer for question 1')).not.toBeInTheDocument()
    expect(await screen.findByText('Teacher answer image removed. Save the rubric to keep this change.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save Question 1 Rubric' }))

    await waitFor(() => {
      expect(updateAnswerRubricMock).toHaveBeenCalledWith(
        'template-1',
        'rubric-1',
        expect.objectContaining({
          questionNumber: 1,
          answerText: 'x = 2',
          answerImageUrl: '',
          pointsAvailable: 10,
        }),
      )
    })

    expect(await screen.findByText('Rubric saved.')).toBeInTheDocument()
  })
})