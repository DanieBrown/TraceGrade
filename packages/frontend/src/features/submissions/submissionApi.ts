import api from '../../lib/api'

export interface FileUploadResponse {
  submissionId: string
  fileUrl: string
  fileName: string
  status: string
  uploadedAt: string
}

export interface BatchUploadResponse {
  submissions?: FileUploadResponse[]
  totalFiles?: number
  successfulUploads?: number
  results?: FileUploadResponse[]
  totalUploaded?: number
  totalFailed?: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractApiResponseData<T>(payload: unknown): T {
  if (isRecord(payload) && 'data' in payload) {
    return payload.data as T
  }

  return payload as T
}

export function uploadSingle(
  assignmentId: string,
  studentId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<FileUploadResponse> {
  const form = new FormData()
  form.append('file', file)

  return api
    .post<ApiResponse<FileUploadResponse> | FileUploadResponse>(
      '/submissions/upload',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: {
          assignmentId,
          studentId,
        },
        onUploadProgress(event) {
          if (onProgress && event.total) {
            onProgress(Math.round((event.loaded * 100) / event.total))
          }
        },
      },
    )
    .then((r) => extractApiResponseData<FileUploadResponse>(r.data))
}

export function uploadBatch(
  assignmentId: string,
  studentId: string,
  files: File[],
  onProgress?: (percent: number) => void,
): Promise<BatchUploadResponse> {
  const form = new FormData()
  files.forEach((f) => form.append('files', f))

  return api
    .post<ApiResponse<BatchUploadResponse> | BatchUploadResponse>(
      '/submissions/upload/batch',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: {
          assignmentId,
          studentId,
        },
        onUploadProgress(event) {
          if (onProgress && event.total) {
            onProgress(Math.round((event.loaded * 100) / event.total))
          }
        },
      },
    )
    .then((r) => extractApiResponseData<BatchUploadResponse>(r.data))
}
