import { useRef } from 'react'
import type { BatchFileMapping } from '../domain/batchTypes'

interface BatchUploadStepProps {
  files: BatchFileMapping[]
  isLoading: boolean
  errorMessage: string | null
  fileRejectionMessage: string | null
  onFilesAdded: (files: FileList | File[]) => void
  onRemoveFile: (localFileId: string) => void
  onCancel: () => void
  onNext: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function BatchUploadStep({
  files,
  isLoading,
  errorMessage,
  fileRejectionMessage,
  onFilesAdded,
  onRemoveFile,
  onCancel,
  onNext,
}: BatchUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h2 className="font-display text-lg font-semibold text-pri">Upload submissions</h2>
        <p className="font-body text-sm text-sec">
          Drag and drop student submissions here, or click to browse.
        </p>
      </header>

      {isLoading && (
        <div className="rounded-xl border border-subtle bg-surface p-4" aria-live="polite">
          <p className="font-body text-sm text-sec">Loading class context…</p>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border p-4"
          style={{
            borderColor: 'rgba(232, 69, 90, 0.22)',
            background: 'rgba(232, 69, 90, 0.08)',
          }}
        >
          <p className="font-body text-sm" style={{ color: 'var(--accent-crimson)' }}>
            {errorMessage}
          </p>
        </div>
      )}

      {fileRejectionMessage && (
        <div
          role="alert"
          className="rounded-xl border p-4"
          style={{
            borderColor: 'rgba(232, 69, 90, 0.22)',
            background: 'rgba(232, 69, 90, 0.08)',
          }}
        >
          <p className="font-body text-sm" style={{ color: 'var(--accent-crimson)' }}>
            {fileRejectionMessage}
          </p>
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
        }}
        onDrop={(event) => {
          event.preventDefault()
          onFilesAdded(event.dataTransfer.files)
        }}
        className="cursor-pointer rounded-xl border-2 border-dashed p-8 text-center"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--bg-elevated)',
        }}
        aria-label="Upload student submissions"
      >
        <p className="text-2xl" aria-hidden="true">↑</p>
        <p className="mt-2 font-display text-sm font-semibold text-pri">
          Drag &amp; drop student submissions here, or click to browse
        </p>
        <p className="mt-1 font-body text-xs text-mut">Supported formats: PDF, PNG, JPG, JPEG, HEIC</p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.heic,.heif,application/pdf,image/png,image/jpeg,image/heic,image/heif"
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) {
              onFilesAdded(event.target.files)
              event.currentTarget.value = ''
            }
          }}
        />
      </div>

      <div className="rounded-xl border border-subtle bg-surface p-4">
        <h3 className="font-display text-sm font-semibold text-pri">Selected files</h3>
        {files.length === 0 ? (
          <p className="mt-2 font-body text-sm text-sec">No files selected.</p>
        ) : (
          <ul className="mt-3 space-y-2" aria-label="Selected submission files">
            {files.map((file) => (
              <li
                key={file.localFileId}
                className="flex items-center justify-between gap-3 rounded-lg border border-subtle bg-elevated px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-body text-sm text-pri" title={file.fileName}>
                    {file.fileName}
                  </p>
                  <p className="font-mono text-xs text-mut">{formatFileSize(file.fileSize)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveFile(file.localFileId)}
                  className="rounded-lg px-2 py-1 text-xs font-display font-semibold"
                  style={{ color: 'var(--accent-crimson)' }}
                  aria-label={`Remove ${file.fileName}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-subtle pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 font-display text-sm font-semibold text-sec transition-colors hover:text-pri"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={files.length === 0 || isLoading}
          className="rounded-lg px-4 py-2 font-display text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: 'var(--accent-gold)',
            color: 'var(--bg-base)',
          }}
        >
          Next: Map Students
        </button>
      </footer>
    </section>
  )
}
