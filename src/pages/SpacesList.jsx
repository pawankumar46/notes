import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../context/AuthContext'
import { useDialog } from '../context/DialogContext'
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

export default function SpacesList() {
  const { user } = useAuth()
  const { confirm } = useDialog()
  const navigate = useNavigate()
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    listNotes()
      .then((data) => {
        if (active) setSpaces(data)
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
    if (!q) return spaces
    return spaces.filter((space) => {
      const hay = `${space.title || ''} ${space.content || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [spaces, query])

  async function handleCreate() {
    setCreating(true)
    setError(null)
    try {
      const space = await createNote(user.id)
      navigate(`/app/spaces/${space.id}`)
    } catch (err) {
      setError(err.message)
      setCreating(false)
    }
  }

  async function handleDelete(id, e) {
    e.preventDefault()
    e.stopPropagation()
    const ok = await confirm({
      title: 'Delete space?',
      message: 'This space and its files will be removed. This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteNote(id)
      setSpaces((prev) => prev.filter((n) => n.id !== id))
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
            <h1>Spaces</h1>
            <p className="muted">
              {loading
                ? 'Loading your workspace…'
                : `${spaces.length} space${spaces.length === 1 ? '' : 's'}, writing and files`}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? 'Creating…' : 'New space'}
          </button>
        </div>

        <div className="toolbar">
          <label className="search-field">
            <span className="sr-only">Search spaces</span>
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
            <div className="skeleton-row" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <h2>{query ? 'No matches' : 'No spaces yet'}</h2>
            <p className="muted">
              {query
                ? 'Try a different search term.'
                : 'Create a space for writing, photos, PDFs, and spreadsheets.'}
            </p>
            {!query && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={creating}
              >
                Create your first space
              </button>
            )}
          </div>
        ) : (
          <ul className="note-grid">
            {filtered.map((space) => {
              const owned = space.owner_id === user.id
              const preview = (space.content || '')
                .replace(/&nbsp;/gi, ' ')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 120)
              return (
                <li key={space.id}>
                  <Link to={`/app/spaces/${space.id}`} className="note-card">
                    <div className="note-card-top">
                      <span className={owned ? 'tag tag-owner' : 'tag tag-shared'}>
                        {owned ? 'Yours' : 'Shared'}
                      </span>
                      {owned && (
                        <button
                          type="button"
                          className="btn btn-ghost danger btn-sm"
                          onClick={(e) => handleDelete(space.id, e)}
                          aria-label={`Delete ${space.title || 'space'}`}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <h2>{space.title || 'Untitled space'}</h2>
                    <p className="note-preview">{preview || 'Empty space'}</p>
                    <p className="meta">Updated {formatUpdated(space.updated_at)}</p>
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
