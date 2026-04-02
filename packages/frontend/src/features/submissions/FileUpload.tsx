import { useCallback, useEffect, useRef, useState } from 'react'
import { useFileUpload } from './useFileUpload'
import type { QueuedFile } from './useFileUpload'

interface Props {
  assignmentId: string
  studentId: string
  onUploadComplete?: (submissionId: string) => void
}

// ── helpers ─────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fileIcon(file: File): string {
  if (file.type === 'application/pdf') return '📄'
  if (file.type.startsWith('image/')) return '🖼️'
  return '📎'
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: QueuedFile['status'] }) {
  const map: Record<QueuedFile['status'], { label: string; className: string }> = {
    queued:    { label: 'Queued',    className: 'border border-subtle bg-white/[0.04] text-sec' },
    uploading: { label: 'Uploading', className: 'border border-gold-500/25 bg-gold-500/10 text-gold-300' },
    done:      { label: 'Done',      className: 'border border-teal-500/25 bg-teal-500/10 text-teal-400' },
    error:     { label: 'Error',     className: 'border border-crimson-500/25 bg-crimson-500/10 text-crimson-400' },
  }
  const { label, className } = map[status]
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  )
}

function FileRow({
  queued,
  onRemove,
  onRetry,
}: {
  queued: QueuedFile
  onRemove: () => void
  onRetry: () => void
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-subtle bg-white/[0.03] p-3">
      {/* Preview / icon */}
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-subtle bg-elevated text-xl">
        {queued.previewUrl ? (
          <img
            src={queued.previewUrl}
            alt={queued.file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{fileIcon(queued.file)}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="truncate text-sm font-medium text-pri">{queued.file.name}</p>
          <StatusBadge status={queued.status} />
        </div>
        <p className="mb-1.5 text-xs text-mut">{formatSize(queued.file.size)}</p>

        {/* Progress bar */}
        {(queued.status === 'uploading' || queued.status === 'done') && (
          <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                queued.status === 'done' ? 'bg-teal-500' : 'bg-gold-500'
              }`}
              style={{ width: `${queued.progress}%` }}
            />
          </div>
        )}

        {/* Error message */}
        {queued.status === 'error' && queued.error && (
          <p className="mt-1 text-xs text-crimson-400">{queued.error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {queued.status === 'error' && (
          <button
            onClick={onRetry}
            title="Retry"
            className="p-1 text-gold-300 transition-colors hover:text-gold-200 text-sm"
          >
            ↺
          </button>
        )}
        {queued.status !== 'uploading' && (
          <button
            onClick={onRemove}
            title="Remove"
            className="p-1 text-mut transition-colors hover:text-crimson-400 text-sm"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function FileUpload({ assignmentId, studentId, onUploadComplete }: Props) {
  const {
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
  } = useFileUpload(assignmentId, studentId)

  const [isDragOver, setIsDragOver] = useState(false)

  // Notify parent once the first file completes uploading
  useEffect(() => {
    if (!onUploadComplete) return
    const firstDone = queue.find((f) => f.status === 'done' && f.result?.submissionId)
    if (firstDone?.result?.submissionId) {
      onUploadComplete(firstDone.result.submissionId)
    }
  }, [queue, onUploadComplete])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (raw: FileList | File[]) => {
      const errors = addFiles(raw)
      setValidationErrors(errors)
    },
    [addFiles],
  )

  // ── drag handlers ────────────────────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    // only fire when leaving the dropzone itself (not a child)
    if (e.currentTarget === e.target) setIsDragOver(false)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) handleFiles(e.target.files)
      // reset so the same file can be re-selected
      e.target.value = ''
    },
    [handleFiles],
  )

  const openPicker = () => inputRef.current?.click()
  const handleChooseFilesClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    openPicker()
  }

  const hasFiles = queue.length > 0
  const allDone = hasFiles && doneCount === queue.length
  const canUpload = pendingCount > 0 || errorCount > 0

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload area – drag and drop files or click to browse"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={openPicker}
        onKeyDown={(e) => e.key === 'Enter' && openPicker()}
        className={[
          'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed',
          'py-12 px-8 cursor-pointer transition-colors select-none',
          isDragOver
            ? 'border-gold-500/50 bg-gold-500/10'
            : 'border-subtle bg-white/[0.03] hover:border-gold-500/30 hover:bg-white/[0.05]',
        ].join(' ')}
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
            isDragOver ? 'bg-gold-500/15' : 'bg-white/[0.04]'
          }`}
        >
          {isDragOver ? '📥' : '☁️'}
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-pri">
            {isDragOver ? 'Drop files here' : 'Drag & drop exam images here'}
          </p>
          <p className="mt-0.5 text-xs text-sec">or click to browse files</p>
        </div>
        <button
          type="button"
          onClick={handleChooseFilesClick}
          className="rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 text-sm font-semibold text-gold-300 transition-colors hover:bg-gold-500/20 hover:text-gold-200"
        >
          Choose files
        </button>
        <p className="text-xs text-mut">
          JPEG, PNG, PDF, HEIC · Max 10 MB per file
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf,.heic,image/jpeg,image/png,application/pdf,image/heic"
          className="sr-only"
          onChange={onInputChange}
        />
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="space-y-1 rounded-xl border border-crimson-500/25 bg-crimson-500/10 p-3">
          <p className="text-xs font-semibold text-crimson-400">
            {validationErrors.length} file{validationErrors.length > 1 ? 's' : ''} rejected:
          </p>
          {validationErrors.map((err, i) => (
            <p key={i} className="text-xs text-crimson-300">
              • {err}
            </p>
          ))}
          <button
            onClick={() => setValidationErrors([])}
            className="mt-1 text-xs text-crimson-300 underline hover:text-crimson-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* File queue */}
      {hasFiles && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-sec">
              {queue.length} file{queue.length > 1 ? 's' : ''} selected
              {doneCount > 0 && (
                <span className="ml-2 text-teal-400">· {doneCount} uploaded</span>
              )}
              {errorCount > 0 && (
                <span className="ml-2 text-crimson-400">· {errorCount} failed</span>
              )}
            </p>
            <button
              onClick={clearAll}
              disabled={isUploading}
              className="text-xs text-mut transition-colors hover:text-sec disabled:opacity-40"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-2">
            {queue.map((q) => (
              <FileRow
                key={q.id}
                queued={q}
                onRemove={() => removeFile(q.id)}
                onRetry={() => uploadFile(q)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      {hasFiles && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={openPicker}
            className="text-sm font-medium text-gold-300 transition-colors hover:text-gold-200"
          >
            + Add more files
          </button>

          {allDone ? (
            <div className="flex items-center gap-2 text-sm font-medium text-teal-400">
              <span>✓</span> All files uploaded
            </div>
          ) : (
            <button
              onClick={uploadAll}
              disabled={!canUpload || isUploading}
              className={[
                'inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors',
                canUpload && !isUploading
                  ? 'bg-gold-500 hover:bg-gold-600 text-navy-950'
                  : 'bg-white/[0.04] text-mut cursor-not-allowed',
              ].join(' ')}
            >
              {isUploading ? (
                <>
                  <span className="animate-spin text-base">⟳</span>
                  Uploading…
                </>
              ) : (
                <>
                  ↑ Upload {pendingCount + errorCount} file{pendingCount + errorCount > 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
