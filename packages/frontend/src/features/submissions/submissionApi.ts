import api from '../../lib/api'

export interface FileUploadResponse {
  submissionId: string
  fileUrl: string
  fileName: string
  status: string
  uploadedAt: string
}

export interface BatchUploadResponse {
  results: FileUploadResponse[]
  totalUploaded: number
  totalFailed: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
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
    .post<ApiResponse<FileUploadResponse>>(
      `/submissions/upload?assignmentId=${assignmentId}&studentId=${studentId}`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress(event) {
          if (onProgress && event.total) {
            onProgress(Math.round((event.loaded * 100) / event.total))
          }
        },
      },
    )
    .then((r) => r.data.data)
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
    .post<ApiResponse<BatchUploadResponse>>(
      `/submissions/upload/batch?assignmentId=${assignmentId}&studentId=${studentId}`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress(event) {
          if (onProgress && event.total) {
            onProgress(Math.round((event.loaded * 100) / event.total))
          }
        },
      },
    )
    .then((r) => r.data.data)
}
