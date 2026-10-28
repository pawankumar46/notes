import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../context/AuthContext'
import { createNote, deleteNote, listNotes } from '../lib/notes'

function formatUpdated(value) {
  const date = new Date(value)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotesList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    listNotes()
      .then((data) => {
        if (active) setNotes(data)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((note) => {
      const hay = `${note.title || ''} ${note.content || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [notes, query])

  async function handleCreate() {
    setCreating(true)
    setError(null)
    try {
      const note = await createNote(user.id)
      navigate(`/app/notes/${note.id}`)
    } catch (err) {
      setError(err.message)
      setCreating(false)
    }
  }

  async function handleDelete(id, e) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    try {
      await deleteNote(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="app-main">
        <div className="list-head">
          <div>
            <h1>Notes</h1>
            <p className="muted">
              {loading
                ? 'Loading your workspace…'
                : `${notes.length} note${notes.length === 1 ? '' : 's'} · owned and shared`}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? 'Creating…' : 'New note'}
          </button>
        </div>

        <div className="toolbar">
          <label className="search-field">
            <span className="sr-only">Search notes</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or content"
            />
          </label>
        </div>

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <div className="skeleton-list" aria-hidden>
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <h2>{query ? 'No matches' : 'No notes yet'}</h2>
            <p className="muted">
              {query
                ? 'Try a different search term.'
                : 'Create a note, invite teammates by email, and edit together.'}
            </p>
            {!query && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={creating}
              >
                Create your first note
              </button>
            )}
          </div>
        ) : (
          <ul className="note-list">
            {filtered.map((note) => {
              const owned = note.owner_id === user.id
              const preview = (note.content || '').replace(/\s+/g, ' ').trim().slice(0, 140)
              return (
                <li key={note.id}>
                  <Link to={`/app/notes/${note.id}`} className="note-row">
                    <div className="note-row-body">
                      <div className="note-row-top">
                        <h2>{note.title || 'Untitled'}</h2>
                        <span className={owned ? 'tag tag-owner' : 'tag tag-shared'}>
                          {owned ? 'Owned' : 'Shared'}
                        </span>
                      </div>
                      <p className="note-preview">{preview || 'Empty note'}</p>
                      <p className="meta">Updated {formatUpdated(note.updated_at)}</p>
                    </div>
                    {owned && (
                      <button
                        type="button"
                        className="btn btn-ghost danger"
                        onClick={(e) => handleDelete(note.id, e)}
                        aria-label={`Delete ${note.title || 'note'}`}
                      >
                        Delete
                      </button>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
