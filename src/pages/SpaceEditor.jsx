import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import FilePanel from '../components/FilePanel'
import RichEditor from '../components/RichEditor'
import { useAuth } from '../context/AuthContext'
import { plainTextFromHtml } from '../lib/editor'
import { listSpaceFiles, refreshContentEmbeds, stripEmbedsForFile } from '../lib/files'
import { supabase } from '../lib/supabase'
import {
  extractMentionEmails,
  getNote,
  inviteCollaborator,
  listCollaborators,
  logNoteActivity,
  notifyEmail,
  removeCollaborator,
  summarizeNoteChange,
  updateNote,
} from '../lib/notes'

export default function SpaceEditor() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [note, setNote] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [lineAuthors, setLineAuthors] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [shareMsg, setShareMsg] = useState(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [files, setFiles] = useState([])

  const saveTimer = useRef(null)
  const editorRef = useRef(null)
  const lastSaved = useRef({ title: '', content: '', lineAuthors: [] })
  const applyingRemote = useRef(false)
  const notifiedMentions = useRef(new Set())
  const lastChangeNotify = useRef(0)
  const lastActivityLog = useRef(0)

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'Someone'

  const load = useCallback(async () => {
    setError(null)
    try {
      const [n, c, f] = await Promise.all([
        getNote(id),
        listCollaborators(id),
        listSpaceFiles(id),
      ])
      const hydrated = await refreshContentEmbeds(n.content || '')
      setNote(n)
      setTitle(n.title || '')
      setContent(hydrated)
      setLineAuthors(Array.isArray(n.line_authors) ? n.line_authors : [])
      lastSaved.current = {
        title: n.title || '',
        content: hydrated,
        lineAuthors: Array.isArray(n.line_authors) ? n.line_authors : [],
      }
      setCollaborators(c)
      setFiles(f)
    } catch (err) {
      setError(err.message)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const channel = supabase
      .channel(`note-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notes', filter: `id=eq.${id}` },
        async (payload) => {
          const row = payload.new
          if (!row || row.updated_by === user.id) return
          applyingRemote.current = true
          const hydrated = await refreshContentEmbeds(row.content || '')
          setNote((prev) => ({ ...prev, ...row }))
          setTitle(row.title || '')
          setContent(hydrated)
          setLineAuthors(Array.isArray(row.line_authors) ? row.line_authors : [])
          lastSaved.current = {
            title: row.title || '',
            content: hydrated,
            lineAuthors: Array.isArray(row.line_authors) ? row.line_authors : [],
          }
          setStatus('synced')
          setTimeout(() => {
            applyingRemote.current = false
          }, 50)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, user.id])

  async function persist(nextTitle, nextContent, nextAuthors, { notifyChange = true } = {}) {
    if (!note) return
    setStatus('saving')
    setError(null)
    try {
      const prevTitle = lastSaved.current.title
      const prevContent = lastSaved.current.content
      const change = summarizeNoteChange(prevTitle, prevContent, nextTitle, nextContent)

      const updated = await updateNote(id, {
        title: nextTitle,
        content: nextContent,
        updatedBy: user.id,
        lineAuthors: nextAuthors,
      })
      lastSaved.current = {
        title: nextTitle,
        content: nextContent,
        lineAuthors: nextAuthors,
      }
      setNote((prev) => ({ ...prev, ...updated }))
      setStatus('saved')

      if (change && Date.now() - lastActivityLog.current > 20_000) {
        lastActivityLog.current = Date.now()
        try {
          await logNoteActivity({
            noteId: id,
            actorId: user.id,
            actorEmail: user.email,
            action: change.action,
            summary: change.summary,
            linesAdded: change.linesAdded,
            linesRemoved: change.linesRemoved,
          })
        } catch {
          // activity log is best-effort
        }
      }

      if (notifyChange && Date.now() - lastChangeNotify.current > 120_000) {
        lastChangeNotify.current = Date.now()
        try {
          await notifyEmail({
            type: 'change',
            noteId: id,
            noteTitle: nextTitle,
            editorName: displayName,
          })
        } catch {
          // Email is best-effort; note is already saved
        }
      }

      const plain = plainTextFromHtml(nextContent)
      const mentions = extractMentionEmails(plain)
      const existing = new Set(collaborators.map((c) => c.email.toLowerCase()))
      const fresh = mentions.filter(
        (email) =>
          email !== user.email?.toLowerCase() &&
          !existing.has(email) &&
          !notifiedMentions.current.has(`${id}:${email}`),
      )

      for (const email of fresh) {
        try {
          const collab = await inviteCollaborator(id, email, user.id)
          setCollaborators((prev) => {
            if (prev.some((c) => c.email === collab.email)) return prev
            return [...prev, collab]
          })
          notifiedMentions.current.add(`${id}:${email}`)
          await notifyEmail({
            type: 'mention',
            noteId: id,
            recipientEmails: [email],
            noteTitle: nextTitle,
            inviterName: displayName,
          })
        } catch {
          // ignore per-email failures
        }
      }
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  function scheduleSave(nextTitle, nextContent, nextAuthors) {
    if (applyingRemote.current) return
    if (
      nextTitle === lastSaved.current.title &&
      nextContent === lastSaved.current.content
    ) {
      return
    }
    setStatus('editing')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      persist(nextTitle, nextContent, nextAuthors)
    }, 900)
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  async function handleInvite(e) {
    e.preventDefault()
    setShareMsg(null)
    setError(null)
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return
    if (email === user.email?.toLowerCase()) {
      setShareMsg('You already have access to this note.')
      return
    }
    setInviting(true)
    try {
      const collab = await inviteCollaborator(id, email, user.id)
      setCollaborators((prev) => {
        const without = prev.filter((c) => c.email !== collab.email)
        return [...without, collab]
      })
      setInviteEmail('')
      await notifyEmail({
        type: 'invite',
        noteId: id,
        recipientEmails: [email],
        noteTitle: title,
        inviterName: displayName,
      })
      setShareMsg(`Invite sent to ${email}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(collaboratorId) {
    try {
      await removeCollaborator(collaboratorId)
      setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId))
    } catch (err) {
      setError(err.message)
    }
  }

  const isOwner = note?.owner_id === user.id
  const plain = plainTextFromHtml(content)
  const wordCount = plain.trim() ? plain.trim().split(/\s+/).length : 0

  const statusLabel = {
    idle: 'Ready',
    editing: 'Unsaved changes',
    saving: 'Saving…',
    saved: 'All changes saved',
    synced: 'Updated by collaborator',
    error: 'Save failed',
  }[status]

  if (error && !note) {
    return (
      <div className="page-center">
        <p className="alert alert-error">{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/app')}>
          Back to notes
        </button>
      </div>
    )
  }

  if (!note) {
    return (
      <div className="page-center">
        <div className="spinner" aria-hidden />
        <p className="muted">Opening note…</p>
      </div>
    )
  }

  return (
    <div className="app-shell editor-shell">
      <AppHeader
        leading={
          <nav className="editor-nav">
            <Link to="/app" className="back-link">
              All spaces
            </Link>
            <span className="save-pill" data-status={status}>
              {statusLabel}
            </span>
          </nav>
        }
        actions={
          <button
            type="button"
            className="btn btn-secondary share-toggle"
            onClick={() => setShareOpen((v) => !v)}
          >
            {shareOpen ? 'Hide share' : 'Share'}
          </button>
        }
      />

      <div className={`editor-layout ${shareOpen ? 'share-open' : ''}`}>
        <section className="editor-pane">
          <input
            className="title-input"
            value={title}
            onChange={(e) => {
              const v = e.target.value
              setTitle(v)
              scheduleSave(v, content, lineAuthors)
            }}
            placeholder="Untitled space"
            aria-label="Space title"
          />

          <RichEditor
            ref={editorRef}
            value={content}
            lineAuthors={lineAuthors}
            currentUser={user}
            placeholder="Write here… Mention people with @email@domain.com"
            onChange={({ html, lineAuthors: nextAuthors }) => {
              setContent(html)
              setLineAuthors(nextAuthors)
              scheduleSave(title, html, nextAuthors)
            }}
          />

          <div className="editor-footer">
            <span className="muted small">
              {wordCount} word{wordCount === 1 ? '' : 's'}
            </span>
            {error && (
              <span className="alert alert-error compact" role="alert">
                {error}
              </span>
            )}
          </div>
        </section>

        <aside className="share-pane">
          <div className="share-pane-head">
            <h2>Share</h2>
            <p className="muted small">
              Invite by email. Writing, photos, PDFs, and sheets stay in one space.
            </p>
          </div>

          {isOwner ? (
            <form className="invite-form" onSubmit={handleInvite}>
              <label className="auth-field">
                <span>Invite email</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                />
              </label>
              <button type="submit" className="btn btn-primary btn-block" disabled={inviting}>
                {inviting ? 'Sending…' : 'Send invite'}
              </button>
            </form>
          ) : (
            <p className="muted small">Only the owner can invite new people.</p>
          )}

          {shareMsg && (
            <p className="alert alert-ok" role="status">
              {shareMsg}
            </p>
          )}

          <FilePanel
            spaceId={id}
            userId={user.id}
            files={files}
            setFiles={setFiles}
            canUpload={Boolean(note)}
            onInserted={(embedHtml) => {
              editorRef.current?.insertHtml(embedHtml)
            }}
            onRemoved={(file) => {
              if (editorRef.current) {
                editorRef.current.removeFileEmbeds(file.id)
                return
              }
              const nextContent = stripEmbedsForFile(content, file.id)
              setContent(nextContent)
              if (saveTimer.current) clearTimeout(saveTimer.current)
              persist(title, nextContent, lineAuthors, { notifyChange: false })
            }}
          />

          <div className="collab-section">
            <h3>People with access</h3>
            <ul className="collab-list">
              <li className="collab-item">
                <div>
                  <div className="collab-email">{isOwner ? user.email : 'Owner'}</div>
                  <div className="meta">Full access</div>
                </div>
                <span className="tag tag-owner">Owner</span>
              </li>
              {collaborators.map((c) => (
                <li key={c.id} className="collab-item">
                  <div>
                    <div className="collab-email">{c.email}</div>
                    <div className="meta">
                      {c.status === 'accepted' ? 'Can edit' : 'Invite pending'}
                    </div>
                  </div>
                  <div className="collab-actions">
                    <span className={c.status === 'accepted' ? 'tag tag-shared' : 'tag'}>
                      {c.status === 'accepted' ? 'Editor' : 'Pending'}
                    </span>
                    {isOwner && (
                      <button
                        type="button"
                        className="btn btn-ghost danger btn-sm"
                        onClick={() => handleRemove(c.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
