const ILLUSTRATIONS = {
  spaces: (
    <svg viewBox="0 0 120 96" fill="none" aria-hidden>
      <rect x="18" y="20" width="56" height="64" rx="8" fill="var(--surface)" stroke="var(--border-strong)" />
      <rect x="28" y="32" width="36" height="6" rx="3" fill="var(--border-strong)" />
      <rect x="28" y="44" width="28" height="4" rx="2" fill="var(--border)" />
      <rect x="28" y="54" width="32" height="4" rx="2" fill="var(--border)" />
      <rect x="46" y="12" width="56" height="64" rx="8" fill="var(--accent-muted)" stroke="var(--accent)" />
      <rect x="56" y="24" width="36" height="6" rx="3" fill="var(--accent)" opacity="0.55" />
      <rect x="56" y="36" width="28" height="4" rx="2" fill="var(--accent)" opacity="0.35" />
      <rect x="56" y="46" width="32" height="4" rx="2" fill="var(--accent)" opacity="0.35" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 120 96" fill="none" aria-hidden>
      <circle cx="52" cy="44" r="22" stroke="var(--border-strong)" strokeWidth="3" />
      <path d="M68 60l18 18" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <rect x="42" y="38" width="20" height="3" rx="1.5" fill="var(--border)" />
      <rect x="42" y="46" width="14" height="3" rx="1.5" fill="var(--border)" />
    </svg>
  ),
  files: (
    <svg viewBox="0 0 120 96" fill="none" aria-hidden>
      <path
        d="M40 22h28l16 16v40a6 6 0 0 1-6 6H40a6 6 0 0 1-6-6V28a6 6 0 0 1 6-6z"
        fill="var(--surface)"
        stroke="var(--border-strong)"
      />
      <path d="M68 22v14h14" stroke="var(--border-strong)" />
      <rect x="46" y="48" width="28" height="4" rx="2" fill="var(--accent)" opacity="0.45" />
      <rect x="46" y="58" width="20" height="4" rx="2" fill="var(--border)" />
      <circle cx="86" cy="68" r="16" fill="var(--accent-muted)" stroke="var(--accent)" />
      <path d="M86 60v16M78 68h16" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
}

export default function EmptyState({
  kind = 'spaces',
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled = false,
  className = '',
}) {
  return (
    <div className={`empty empty-state ${className}`.trim()}>
      <div className="empty-illu">{ILLUSTRATIONS[kind] || ILLUSTRATIONS.spaces}</div>
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onAction}
          disabled={actionDisabled}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
