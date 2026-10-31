import { useRef, useState } from 'react'
import { useDialog } from '../context/DialogContext'
import {
  ACCEPT_ATTR,
  buildEmbedHtml,
  deleteSpaceFile,
  formatBytes,
  getSpaceFileUrl,
  uploadSpaceFile,
} from '../lib/files'

function typeLabel(type) {
  if (type === 'image') return 'Photo'
  if (type === 'pdf') return 'PDF'
  if (type === 'excel') return 'Spreadsheet'
  return 'File'
}

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
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  async function handleFiles(fileList) {
    const picked = [...fileList]
    if (!picked.length) return
    setBusy(true)
    setError(null)
    setMessage(null)

    try {
      for (const raw of picked) {
        const { record, originalSize, compressedSize } = await uploadSpaceFile(
          spaceId,
          userId,
          raw,
        )
        const url = await getSpaceFileUrl(record.storage_path)
        setFiles((prev) => [record, ...prev.filter((f) => f.id !== record.id)])
        onInserted?.(buildEmbedHtml(record, url), record)

        if (compressedSize < originalSize) {
          setMessage(
            `Added ${record.file_name} to the writing area (${formatBytes(originalSize)} → ${formatBytes(compressedSize)})`,
          )
        } else {
          setMessage(`Added ${record.file_name} to the writing area`)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function openFile(file) {
    try {
      const url = await getSpaceFileUrl(file.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err.message)
    }
  }

  async function insertAgain(file) {
    try {
      const url = await getSpaceFileUrl(file.storage_path)
      onInserted?.(buildEmbedHtml(file, url), file)
      setMessage(`Inserted ${file.file_name} into the writing area`)
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeFile(file) {
    const ok = await confirm({
      title: 'Delete file?',
      message: `Delete “${file.file_name}” from this space? It will be removed from the database and writing area.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      danger: true,
    })
    if (!ok) return
    setRemovingId(file.id)
    setError(null)
    setMessage(null)
    try {
      await deleteSpaceFile(file)
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
      onRemoved?.(file)
      setMessage(`Deleted ${file.file_name}`)
    } catch (err) {
      setError(err.message || 'Could not delete file')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="file-panel">
      <div className="file-panel-head">
        <h3>Files</h3>
        <p className="muted small">Uploads appear in the writing area. Photos are compressed.</p>
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
            {busy ? 'Uploading…' : 'Upload into writing area'}
          </label>
        </div>
      )}

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="alert alert-ok" role="status">
          {message}
        </p>
      )}

      {files.length === 0 ? (
        <p className="muted small">No files yet.</p>
      ) : (
        <ul className="file-list">
          {files.map((file) => (
            <li key={file.id} className="file-item">
              <button type="button" className="file-open" onClick={() => openFile(file)}>
                <span className="tag">{typeLabel(file.file_type)}</span>
                <span className="file-name">{file.file_name}</span>
                <span className="meta">{formatBytes(file.file_size)}</span>
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => insertAgain(file)}
              >
                Insert
              </button>
              {(canUpload || file.uploaded_by === userId) && (
                <button
                  type="button"
                  className="btn btn-ghost danger btn-sm"
                  disabled={removingId === file.id}
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
