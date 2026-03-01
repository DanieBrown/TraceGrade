import { useCallback, useMemo, useState } from 'react'
import type { BatchFileMapping } from '../domain/batchTypes'

const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
])

let fileCounter = 0

function createLocalFileId(): string {
  fileCounter += 1
  return `batch-file-${Date.now()}-${fileCounter}`
}

function isSupportedFileType(file: File): boolean {
  if (ALLOWED_FILE_TYPES.has(file.type)) {
    return true
  }

  return /\.(pdf|png|jpg|jpeg|heic|heif)$/i.test(file.name)
}

function toBatchFileMapping(file: File): BatchFileMapping {
  return {
    localFileId: createLocalFileId(),
    file,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    studentId: null,
  }
}

export function useBatchMapping(initialFiles: BatchFileMapping[] = []) {
  const [files, setFiles] = useState<BatchFileMapping[]>(initialFiles)
  const [fileRejectionMessage, setFileRejectionMessage] = useState<string | null>(null)

  const addFiles = useCallback((selectedFiles: FileList | File[]) => {
    const entries = Array.from(selectedFiles)

    const acceptedFiles: File[] = []
    const rejectedNames: string[] = []

    for (const file of entries) {
      if (isSupportedFileType(file)) {
        acceptedFiles.push(file)
      } else {
        rejectedNames.push(file.name)
      }
    }

    if (rejectedNames.length > 0) {
      setFileRejectionMessage(
        `Unsupported files removed: ${rejectedNames.join(', ')}. Allowed types: PDF, PNG, JPG, JPEG, HEIC.`,
      )
    } else {
      setFileRejectionMessage(null)
    }

    if (acceptedFiles.length === 0) {
      return
    }

    setFiles((current) => [...current, ...acceptedFiles.map((file) => toBatchFileMapping(file))])
  }, [])

  const removeFile = useCallback((localFileId: string) => {
    setFiles((current) => current.filter((file) => file.localFileId !== localFileId))
  }, [])

  const setStudentForFile = useCallback((localFileId: string, studentId: string | null) => {
    setFiles((current) =>
      current.map((file) =>
        file.localFileId === localFileId
          ? {
              ...file,
              studentId,
            }
          : file,
      ),
    )
  }, [])

  const clearFiles = useCallback(() => {
    setFiles([])
    setFileRejectionMessage(null)
  }, [])

  const fileCount = useMemo(() => files.length, [files])

  return {
    files,
    fileCount,
    fileRejectionMessage,
    addFiles,
    removeFile,
    setStudentForFile,
    clearFiles,
  }
}
