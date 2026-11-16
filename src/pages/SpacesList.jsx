import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../context/AuthContext'
import { useDialog } from '../context/DialogContext'
import { spacePreviewText } from '../lib/files'
import { fadeUp, listContainer, listItem, useMotionConfig } from '../lib/motion'
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

function greetingName(user) {
  const raw =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'there'
  return String(raw).split(' ')[0]
}

export default function SpacesList() {
  const { user } = useAuth()
  const { confirm } = useDialog()
  const navigate = useNavigate()
  const { reduce } = useMotionConfig()
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

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

  const ownedCount = useMemo(
    () => spaces.filter((s) => s.owner_id === user.id).length,
    [spaces, user.id],
  )
  const sharedCount = spaces.length - ownedCount

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return spaces.filter((space) => {
      const owned = space.owner_id === user.id
      if (filter === 'yours' && !owned) return false
      if (filter === 'shared' && owned) return false
      if (!q) return true
      const hay = `${space.title || ''} ${spacePreviewText(space.content)}`.toLowerCase()
      return hay.includes(q)
    })
  }, [spaces, query, filter, user.id])

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

  const today = new Date().toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const itemMotion = listItem(reduce)

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="app-main spaces-home">
        <motion.header className="spaces-hero" {...fadeUp(reduce)}>
          <div className="spaces-hero-copy">
            <p className="spaces-date">{today}</p>
            <h1>Hello, {greetingName(user)}</h1>
            <p className="muted spaces-lead">
              Your spaces for writing, files, and shared handoff.
            </p>
          </div>
          <motion.button
            type="button"
            className="btn btn-primary spaces-create"
            onClick={handleCreate}
            disabled={creating}
            whileHover={reduce || creating ? undefined : { y: -1 }}
            whileTap={reduce || creating ? undefined : { scale: 0.98 }}
          >
            {creating ? 'Creating…' : 'New space'}
          </motion.button>
        </motion.header>

        <motion.section
          className="spaces-stats"
          aria-label="Workspace summary"
          {...fadeUp(reduce, 0.08)}
        >
          {[
            { value: loading ? '—' : spaces.length, label: 'Open spaces' },
            { value: loading ? '—' : ownedCount, label: 'Yours' },
            { value: loading ? '—' : sharedCount, label: 'Shared with you' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              className="spaces-stat"
              whileHover={reduce ? undefined : { y: -2 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            >
              <span className="spaces-stat-value">{stat.value}</span>
              <span className="spaces-stat-label">{stat.label}</span>
            </motion.div>
          ))}
        </motion.section>

        <motion.div className="spaces-toolbar" {...fadeUp(reduce, 0.12)}>
          <div className="spaces-filters" role="tablist" aria-label="Filter spaces">
            {[
              { id: 'all', label: 'All' },
              { id: 'yours', label: 'Yours' },
              { id: 'shared', label: 'Shared' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={filter === item.id ? 'spaces-filter active' : 'spaces-filter'}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="search-field spaces-search">
            <span className="sr-only">Search spaces</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search spaces"
            />
          </label>
        </motion.div>

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
        ) : (
          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                className="empty spaces-empty"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="spaces-empty-mark" aria-hidden />
                <h2>{query || filter !== 'all' ? 'No matches' : 'No spaces yet'}</h2>
                <p className="muted">
                  {query || filter !== 'all'
                    ? 'Try another filter or search term.'
                    : 'Start a folio for notes, PDFs, spreadsheets, and docs.'}
                </p>
                {!query && filter === 'all' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCreate}
                    disabled={creating}
                  >
                    Create your first space
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.ul
                key={`${filter}-${query}`}
                className="note-grid spaces-grid"
                {...listContainer(reduce)}
              >
                <motion.li {...itemMotion}>
                  <motion.button
                    type="button"
                    className="note-card spaces-new-card"
                    onClick={handleCreate}
                    disabled={creating}
                    whileHover={reduce || creating ? undefined : { y: -3 }}
                    whileTap={reduce || creating ? undefined : { scale: 0.99 }}
                  >
                    <span className="spaces-new-plus" aria-hidden>
                      +
                    </span>
                    <h2>{creating ? 'Creating…' : 'New space'}</h2>
                    <p className="note-preview">Blank folio for writing and files</p>
                  </motion.button>
                </motion.li>
                {filtered.map((space) => {
                  const owned = space.owner_id === user.id
                  const preview = spacePreviewText(space.content)
                  return (
                    <motion.li key={space.id} layout={!reduce} {...itemMotion}>
                      <motion.div
                        whileHover={reduce ? undefined : { y: -3 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                      >
                        <Link
                          to={`/app/spaces/${space.id}`}
                          className={
                            owned ? 'note-card spaces-card' : 'note-card spaces-card is-shared'
                          }
                        >
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
                          <p className="note-preview">
                            {preview || 'Empty folio — ready for notes'}
                          </p>
                          <p className="meta">Updated {formatUpdated(space.updated_at)}</p>
                        </Link>
                      </motion.div>
                    </motion.li>
                  )
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}
