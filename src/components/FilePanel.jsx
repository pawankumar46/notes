import { useRef, useState } from 'react'
import EmptyState from './EmptyState'
import { useDialog } from '../context/DialogContext'
import { useToast } from '../context/ToastContext'
import {
  ACCEPT_ATTR,
  buildEmbedHtml,
  deleteSpaceFile,
  fileTypeLabel,
  formatBytes,
  getSpaceFileUrl,
  uploadSpaceFile,
} from '../lib/files'

export default function FilePanel({
  spaceId,
  userId,
  files,
  setFiles,
  canUpload = true,
  onInserted,
  onRemoved,
}) {
  const { confirm } = useDialog()
  const { success, error: toastError } = useToast()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  async function handleFiles(fileList) {
    const picked = [...fileList]
    if (!picked.length) return
    setBusy(true)

    try {
      for (const raw of picked) {
        const tempId = `temp-${Date.now()}-${raw.name}`
        const optimistic = {
          id: tempId,
          file_name: raw.name,
          file_type: 'file',
          file_size: raw.size,
          uploaded_by: userId,
          pending: true,
        }
        setFiles((prev) => [optimistic, ...prev])

        try {
          const { record, originalSize, compressedSize } = await uploadSpaceFile(
            spaceId,
            userId,
            raw,
          )
          const url = await getSpaceFileUrl(record)
          setFiles((prev) => [record, ...prev.filter((f) => f.id !== tempId && f.id !== record.id)])
          onInserted?.(buildEmbedHtml(record, url), record)

          if (compressedSize < originalSize) {
            success(
              `Compressed ${record.file_name} (${formatBytes(originalSize)} → ${formatBytes(compressedSize)})`,
            )
          } else {
            success(`Added ${record.file_name}`)
          }
        } catch (err) {
          setFiles((prev) => prev.filter((f) => f.id !== tempId))
          throw err
        }
      }
    } catch (err) {
      toastError(err.message)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function openFile(file) {
    if (file.pending) return
    try {
      const url = await getSpaceFileUrl(file)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toastError(err.message)
    }
  }

  async function insertAgain(file) {
    if (file.pending) return
    try {
      const url = await getSpaceFileUrl(file)
      onInserted?.(buildEmbedHtml(file, url), file)
      success(`Inserted ${file.file_name}`)
    } catch (err) {
      toastError(err.message)
    }
  }

  async function removeFile(file) {
    if (file.pending) return
    const ok = await confirm({
      title: 'Delete file?',
      message: `Delete “${file.file_name}” from this space? It will be removed from the database and writing area.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      danger: true,
    })
    if (!ok) return
    setRemovingId(file.id)
    const snapshot = files
    setFiles((prev) => prev.filter((f) => f.id !== file.id))
    try {
      await deleteSpaceFile(file)
      onRemoved?.(file)
      success(`Deleted ${file.file_name}`)
    } catch (err) {
      setFiles(snapshot)
      toastError(err.message || 'Could not delete file')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="file-panel">
      <div className="file-panel-head">
        <h3>Files</h3>
        <p className="muted small">
          Any file type. Photos are resized; other files are gzip-compressed when it saves space.
        </p>
      </div>

      {canUpload && (
        <div className="file-upload">
          <input
            ref={inputRef}
            id="space-file-input"
            type="file"
            className="sr-only"
            accept={ACCEPT_ATTR}
            multiple
            onChange={(e) => handleFiles(e.target.files)}
          />
          <label htmlFor="space-file-input" className="btn btn-secondary btn-block file-upload-btn">
            {busy ? 'Compressing & uploading…' : 'Upload into writing area'}
          </label>
        </div>
      )}

      {files.length === 0 ? (
        <EmptyState
          kind="files"
          className="empty-state-compact"
          title="No files yet"
          description="Drop PDFs, sheets, or images into this space."
          actionLabel={canUpload ? (busy ? 'Uploading…' : 'Upload a file') : undefined}
          actionDisabled={busy}
          onAction={
            canUpload
              ? () => inputRef.current?.click()
              : undefined
          }
        />
      ) : (
        <ul className="file-list">
          {files.map((file) => (
            <li key={file.id} className={file.pending ? 'file-item is-pending' : 'file-item'}>
              <button
                type="button"
                className="file-open"
                onClick={() => openFile(file)}
                disabled={file.pending}
              >
                <span className="tag">{fileTypeLabel(file.file_type)}</span>
                <span className="file-name">{file.file_name}</span>
                <span className="meta">
                  {file.pending ? 'Uploading…' : formatBytes(file.file_size)}
                </span>
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => insertAgain(file)}
                disabled={file.pending}
              >
                Insert
              </button>
              {(canUpload || file.uploaded_by === userId) && (
                <button
                  type="button"
                  className="btn btn-ghost danger btn-sm"
                  disabled={file.pending || removingId === file.id}
                  onClick={() => removeFile(file)}
                >
                  {removingId === file.id ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
