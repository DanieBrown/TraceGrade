import { useCallback, useReducer, useRef } from 'react'
import { uploadSingle } from './submissionApi'
import type { FileUploadResponse } from './submissionApi'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf']
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic', '.pdf']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error'

export interface QueuedFile {
  id: string
  file: File
  previewUrl: string | null
  progress: number
  status: UploadStatus
  error: string | null
  result: FileUploadResponse | null
}

type Action =
  | { type: 'ADD'; files: QueuedFile[] }
  | { type: 'REMOVE'; id: string }
  | { type: 'PROGRESS'; id: string; progress: number }
  | { type: 'DONE'; id: string; result: FileUploadResponse }
  | { type: 'ERROR'; id: string; error: string }
  | { type: 'UPLOADING'; id: string }
  | { type: 'CLEAR' }

function reducer(state: QueuedFile[], action: Action): QueuedFile[] {
  switch (action.type) {
    case 'ADD':
      return [...state, ...action.files]
    case 'REMOVE':
      return state.filter((f) => f.id !== action.id)
    case 'UPLOADING':
      return state.map((f) =>
        f.id === action.id ? { ...f, status: 'uploading', progress: 0, error: null } : f,
      )
    case 'PROGRESS':
      return state.map((f) =>
        f.id === action.id ? { ...f, progress: action.progress } : f,
      )
    case 'DONE':
      return state.map((f) =>
        f.id === action.id
          ? { ...f, status: 'done', progress: 100, result: action.result }
          : f,
      )
    case 'ERROR':
      return state.map((f) =>
        f.id === action.id ? { ...f, status: 'error', error: action.error } : f,
      )
    case 'CLEAR':
      return []
    default:
      return state
  }
}

function validateFile(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  const typeOk = ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext)
  if (!typeOk) {
    return `Invalid file type. Accepted: JPEG, PNG, PDF, HEIC.`
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File exceeds 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`
  }
  return null
}

function buildPreviewUrl(file: File): string | null {
  if (file.type.startsWith('image/')) {
    return URL.createObjectURL(file)
  }
  return null
}

let nextId = 1

export function useFileUpload(assignmentId: string, studentId: string) {
  const [queue, dispatch] = useReducer(reducer, [])
  const isDraggingRef = useRef(false)

  const addFiles = useCallback((rawFiles: FileList | File[]) => {
    const incoming: QueuedFile[] = []
    const validationErrors: string[] = []

    Array.from(rawFiles).forEach((file) => {
      const error = validateFile(file)
      if (error) {
        validationErrors.push(`${file.name}: ${error}`)
        return
      }
      incoming.push({
        id: String(nextId++),
        file,
        previewUrl: buildPreviewUrl(file),
        progress: 0,
        status: 'queued',
        error: null,
        result: null,
      })
    })

    if (incoming.length > 0) {
      dispatch({ type: 'ADD', files: incoming })
    }

    return validationErrors
  }, [])

  const removeFile = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id })
  }, [])

  const uploadFile = useCallback(
    async (queued: QueuedFile) => {
      dispatch({ type: 'UPLOADING', id: queued.id })
      try {
        const result = await uploadSingle(
          assignmentId,
          studentId,
          queued.file,
          (pct) => dispatch({ type: 'PROGRESS', id: queued.id, progress: pct }),
        )
        dispatch({ type: 'DONE', id: queued.id, result })
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Upload failed. Please try again.'
        dispatch({ type: 'ERROR', id: queued.id, error: msg })
      }
    },
    [assignmentId, studentId],
  )

  const uploadAll = useCallback(async () => {
    const pending = queue.filter((f) => f.status === 'queued' || f.status === 'error')
    await Promise.all(pending.map(uploadFile))
  }, [queue, uploadFile])

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR' })
  }, [])

  const pendingCount = queue.filter((f) => f.status === 'queued').length
  const uploadingCount = queue.filter((f) => f.status === 'uploading').length
  const doneCount = queue.filter((f) => f.status === 'done').length
  const errorCount = queue.filter((f) => f.status === 'error').length
  const isUploading = uploadingCount > 0

  return {
    queue,
    addFiles,
    removeFile,
    uploadAll,
    uploadFile,
    clearAll,
    isUploading,
    pendingCount,
    doneCount,
    errorCount,
    isDraggingRef,
  }
}
