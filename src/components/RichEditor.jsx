import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  HIGHLIGHT_COLORS,
  applyHighlight,
  applyMark,
  applyStrike,
  ensureNoteHtml,
  formatBlameTime,
  getCaretLineIndex,
  insertCheckbox,
  plainTextFromHtml,
  updateLineAuthors,
} from '../lib/editor'

const RichEditor = forwardRef(function RichEditor(
  {
    value,
    lineAuthors = [],
    currentUser,
    onChange,
    placeholder = 'Start writing…',
    disabled = false,
  },
  ref,
) {
  const editorRef = useRef(null)
  const authorsRef = useRef(lineAuthors)
  const plainRef = useRef(plainTextFromHtml(ensureNoteHtml(value)))
  const [blame, setBlame] = useState(null)
  const [showColors, setShowColors] = useState(false)
  const seeded = useRef(false)

  useEffect(() => {
    authorsRef.current = lineAuthors
  }, [lineAuthors])

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const html = ensureNoteHtml(value)
    if (!seeded.current || document.activeElement !== el) {
      if (el.innerHTML !== html) el.innerHTML = html
      seeded.current = true
      plainRef.current = plainTextFromHtml(html)
    }
  }, [value])

  function emitChange() {
    const el = editorRef.current
    if (!el) return
    const html = el.innerHTML
    const plain = plainTextFromHtml(html)
    const nextAuthors = updateLineAuthors(plainRef.current, plain, authorsRef.current, {
      email: currentUser?.email,
      name:
        currentUser?.user_metadata?.full_name ||
        currentUser?.user_metadata?.name ||
        currentUser?.email,
    })
    plainRef.current = plain
    authorsRef.current = nextAuthors
    onChange?.({ html, plain, lineAuthors: nextAuthors })
    refreshBlame()
  }

  function refreshBlame() {
    const el = editorRef.current
    if (!el) return
    const index = Math.max(0, getCaretLineIndex(el))
    const meta = authorsRef.current?.[index]
    if (!meta?.email) {
      setBlame(null)
      return
    }
    const label = meta.name || meta.email.split('@')[0]
    setBlame({
      index,
      text: `${label}  ${formatBlameTime(meta.at)}`,
    })
  }

  useImperativeHandle(ref, () => ({
    insertHtml(html) {
      const el = editorRef.current
      if (!el || disabled) return
      el.focus()
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0 || !el.contains(selection.anchorNode)) {
        const range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(false)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
      document.execCommand('insertHTML', false, html)
      emitChange()
    },
    removeFileEmbeds(fileId) {
      const el = editorRef.current
      if (!el || !fileId) return
      el.querySelectorAll(`[data-file-id="${CSS.escape(fileId)}"]`).forEach((node) => {
        node.remove()
      })
      emitChange()
    },
  }))

  function handleToolbar(action, color) {
    editorRef.current?.focus()
    if (action === 'highlight') applyHighlight(color)
    if (action === 'mark') applyMark()
    if (action === 'strike') applyStrike()
    if (action === 'checkbox') insertCheckbox()
    setShowColors(false)
    emitChange()
  }

  return (
    <div className="rich-editor">
      <div className="note-toolbar" role="toolbar" aria-label="Formatting">
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            aria-expanded={showColors}
            aria-haspopup="true"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowColors((v) => !v)}
          >
            Highlight
          </button>
          {showColors && (
            <div className="color-pop" role="menu">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className="color-swatch"
                  style={{ background: color.value }}
                  title={color.label}
                  aria-label={color.label}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleToolbar('highlight', color.value)}
                />
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="toolbar-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleToolbar('mark')}
        >
          Mark
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleToolbar('strike')}
        >
          Strike
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleToolbar('checkbox')}
        >
          Checkbox
        </button>
      </div>

      <div className="rich-editor-frame">
        <div
          ref={editorRef}
          className="content-input rich-content"
          contentEditable={!disabled}
          role="textbox"
          aria-multiline="true"
          aria-label="Space content"
          data-placeholder={placeholder}
          suppressContentEditableWarning
          onInput={emitChange}
          onKeyUp={refreshBlame}
          onMouseUp={refreshBlame}
          onFocus={refreshBlame}
          onBlur={() => setShowColors(false)}
          onClick={(e) => {
            if (e.target?.matches?.('input[type="checkbox"]')) {
              emitChange()
            }
          }}
        />
        {blame && (
          <div className="line-blame" aria-hidden>
            {blame.text}
          </div>
        )}
      </div>
    </div>
  )
})

export default RichEditor
