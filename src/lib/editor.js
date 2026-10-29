export const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: 'Yellow', value: '#ffe566' },
  { id: 'coral', label: 'Coral', value: '#ffb4a2' },
  { id: 'mint', label: 'Mint', value: '#b8e0d2' },
  { id: 'lilac', label: 'Lilac', value: '#cdb4db' },
  { id: 'sky', label: 'Sky', value: '#a8dadc' },
]

export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function plainTextFromHtml(html) {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.innerText || '').replace(/\u00a0/g, ' ')
}

export function linesFromPlain(text) {
  return (text || '').replace(/\r\n/g, '\n').split('\n')
}

export function ensureNoteHtml(content) {
  if (!content) return '<p><br></p>'
  const trimmed = content.trim()
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return content
  return linesFromPlain(content)
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : '<p><br></p>'))
    .join('')
}

export function updateLineAuthors(prevPlain, nextPlain, prevAuthors, actor) {
  const prevLines = linesFromPlain(prevPlain)
  const nextLines = linesFromPlain(nextPlain)
  const prev = Array.isArray(prevAuthors) ? prevAuthors : []
  const next = []

  for (let i = 0; i < nextLines.length; i += 1) {
    const line = nextLines[i]
    const prevLine = prevLines[i]
    const prevMeta = prev[i]
    if (prevLine === line && prevMeta?.email) {
      next.push(prevMeta)
    } else {
      next.push({
        email: actor.email,
        name: actor.name || actor.email,
        at: new Date().toISOString(),
      })
    }
  }

  return next
}

export function formatBlameTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now - date
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function getCaretLineIndex(root) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || !root.contains(selection.anchorNode)) {
    return 0
  }

  const range = selection.getRangeAt(0).cloneRange()
  range.selectNodeContents(root)
  range.setEnd(selection.anchorNode, selection.anchorOffset)
  const textBefore = range.toString()
  return textBefore.split('\n').length - 1
}

export function runEditorCommand(command, value = null) {
  document.execCommand(command, false, value)
}

export function applyHighlight(color) {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return

  try {
    document.execCommand('styleWithCSS', false, true)
  } catch {
    // ignore
  }

  const ok = document.execCommand('hiliteColor', false, color)
  if (!ok) document.execCommand('backColor', false, color)
}

export function applyMark() {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  const mark = document.createElement('mark')
  mark.className = 'note-mark'
  try {
    range.surroundContents(mark)
  } catch {
    applyHighlight('#ffe566')
  }
}

export function applyStrike() {
  document.execCommand('strikeThrough', false, null)
}

export function insertCheckbox() {
  document.execCommand(
    'insertHTML',
    false,
    '<label class="note-check"><input type="checkbox" contenteditable="false" /><span class="note-check-gap"></span></label>\u00a0',
  )
}
