import { supabase } from './supabase'

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const MENTION_RE = /@([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi

export function extractMentionEmails(text) {
  if (!text) return []
  const found = new Set()
  for (const match of text.matchAll(MENTION_RE)) {
    found.add(match[1].toLowerCase())
  }
  return [...found]
}

export function extractEmails(text) {
  if (!text) return []
  return [...new Set((text.match(EMAIL_RE) || []).map((e) => e.toLowerCase()))]
}

export async function listNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, content, owner_id, updated_at, created_at, updated_by')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getNote(id) {
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, content, owner_id, updated_at, created_at, updated_by')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createNote(ownerId) {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      owner_id: ownerId,
      title: 'Untitled',
      content: '',
      updated_by: ownerId,
    })
    .select('id')
    .single()
  if (error) throw error
  return data
}

export function summarizeNoteChange(prevTitle, prevContent, nextTitle, nextContent) {
  const prevLines = (prevContent || '').split('\n')
  const nextLines = (nextContent || '').split('\n')
  const linesAdded = Math.max(0, nextLines.length - prevLines.length)
  const linesRemoved = Math.max(0, prevLines.length - nextLines.length)
  const titleChanged = (prevTitle || '') !== (nextTitle || '')
  const contentChanged = (prevContent || '') !== (nextContent || '')

  if (!titleChanged && !contentChanged) return null

  const parts = []
  if (titleChanged) parts.push('changed the title')
  if (contentChanged) {
    if (linesAdded > 0 && linesRemoved === 0) {
      parts.push(`added ${linesAdded} line${linesAdded === 1 ? '' : 's'}`)
    } else if (linesRemoved > 0 && linesAdded === 0) {
      parts.push(`removed ${linesRemoved} line${linesRemoved === 1 ? '' : 's'}`)
    } else if (linesAdded > 0 || linesRemoved > 0) {
      parts.push(`edited content (+${linesAdded}/-${linesRemoved} lines)`)
    } else {
      parts.push('edited the content')
    }
  }

  return {
    action: titleChanged && !contentChanged ? 'title_changed' : 'content_changed',
    summary: parts.join(' and '),
    linesAdded,
    linesRemoved,
  }
}

export async function updateNote(id, { title, content, updatedBy }) {
  const { data, error } = await supabase
    .from('notes')
    .update({
      title,
      content,
      updated_by: updatedBy,
    })
    .eq('id', id)
    .select('id, title, content, owner_id, updated_at, updated_by')
    .single()
  if (error) throw error
  return data
}

export async function logNoteActivity({
  noteId,
  actorId,
  actorEmail,
  action,
  summary,
  linesAdded = 0,
  linesRemoved = 0,
}) {
  const { data, error } = await supabase
    .from('note_activity')
    .insert({
      note_id: noteId,
      actor_id: actorId,
      actor_email: actorEmail,
      action,
      summary,
      lines_added: linesAdded,
      lines_removed: linesRemoved,
    })
    .select(
      'id, note_id, actor_id, actor_email, action, summary, lines_added, lines_removed, created_at',
    )
    .single()
  if (error) throw error
  return data
}

export async function listNoteActivity(noteId) {
  const { data, error } = await supabase
    .from('note_activity')
    .select(
      'id, note_id, actor_id, actor_email, action, summary, lines_added, lines_removed, created_at',
    )
    .eq('note_id', noteId)
    .order('created_at', { ascending: false })
    .limit(40)
  if (error) throw error
  return data || []
}

export async function deleteNote(id) {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}

export async function listCollaborators(noteId) {
  const { data, error } = await supabase
    .from('note_collaborators')
    .select('id, note_id, email, user_id, role, status, created_at')
    .eq('note_id', noteId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function inviteCollaborator(noteId, email, invitedBy) {
  const normalized = email.trim().toLowerCase()
  if (!normalized) throw new Error('Email required')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', normalized)
    .maybeSingle()

  const { data, error } = await supabase
    .from('note_collaborators')
    .upsert(
      {
        note_id: noteId,
        email: normalized,
        user_id: profile?.id ?? null,
        role: 'editor',
        status: profile?.id ? 'accepted' : 'pending',
        invited_by: invitedBy,
      },
      { onConflict: 'note_id,email' },
    )
    .select('id, note_id, email, user_id, role, status, created_at')
    .single()

  if (error) throw error
  return data
}

export async function removeCollaborator(collaboratorId) {
  const { error } = await supabase
    .from('note_collaborators')
    .delete()
    .eq('id', collaboratorId)
  if (error) throw error
}

export async function notifyEmail({ type, noteId, recipientEmails, noteTitle, inviterName, editorName }) {
  const { data, error } = await supabase.functions.invoke('notify-email', {
    body: {
      type,
      note_id: noteId,
      recipient_emails: recipientEmails,
      note_title: noteTitle,
      inviter_name: inviterName,
      editor_name: editorName,
    },
  })
  if (error) throw error
  return data
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function ensureProfile(user) {
  if (!user?.id || !user?.email) return null
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email.toLowerCase(),
        display_name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url || null,
      },
      { onConflict: 'id' },
    )
    .select('id, email, display_name, avatar_url')
    .single()
  if (error) throw error

  await supabase
    .from('note_collaborators')
    .update({ user_id: user.id, status: 'accepted' })
    .eq('email', user.email.toLowerCase())
    .eq('status', 'pending')

  return data
}
