import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../lib/api'
import { uploadBatch, uploadSingle } from './submissionApi'

vi.mock('../../lib/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('submissionApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses axios params for uploadSingle and preserves special characters in ids', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          submissionId: 'sub-1',
          fileUrl: '/uploads/sub-1.pdf',
          fileName: 'submission-1.pdf',
          status: 'PENDING',
          uploadedAt: '2026-03-01T10:00:00.000Z',
        },
      },
    })

    const assignmentId = ' assignment&id=abc%20 '
    const studentId = ' student&id=42 = % '
    const file = new File(['file'], 'submission.pdf', { type: 'application/pdf' })

    await uploadSingle(assignmentId, studentId, file)

    expect(api.post).toHaveBeenCalledWith(
      '/submissions/upload',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
        params: {
          assignmentId,
          studentId,
        },
      }),
    )
  })

  it('uses axios params for uploadBatch and preserves special characters in ids', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          submissions: [],
        },
      },
    })

    const assignmentId = 'a&b=c %25'
    const studentId = 's=t&u % '
    const files = [
      new File(['f1'], 'first.pdf', { type: 'application/pdf' }),
      new File(['f2'], 'second.pdf', { type: 'application/pdf' }),
    ]

    await uploadBatch(assignmentId, studentId, files)

    expect(api.post).toHaveBeenCalledWith(
      '/submissions/upload/batch',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
        params: {
          assignmentId,
          studentId,
        },
      }),
    )
  })
})
