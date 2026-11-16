export function Skeleton({ className = '', style }) {
  return <div className={`skel ${className}`.trim()} style={style} aria-hidden />
}

export function PageSkeleton({ label = 'Loading…' }) {
  return (
    <div className="page-center page-skel" role="status" aria-label={label}>
      <div className="page-skel-card">
        <Skeleton className="skel-line skel-lg" />
        <Skeleton className="skel-line" />
        <Skeleton className="skel-line skel-short" />
      </div>
    </div>
  )
}

export function SpacesSkeleton() {
  return (
    <div className="skeleton-list" role="status" aria-label="Loading spaces">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton-row skel-card">
          <Skeleton className="skel-line skel-chip" />
          <Skeleton className="skel-line skel-lg" />
          <Skeleton className="skel-line" />
          <Skeleton className="skel-line skel-short" />
        </div>
      ))}
    </div>
  )
}

export function EditorSkeleton() {
  return (
    <div className="app-shell editor-skel" role="status" aria-label="Opening space">
      <div className="editor-skel-bar">
        <Skeleton className="skel-line skel-short" />
        <Skeleton className="skel-line skel-chip" />
      </div>
      <div className="editor-skel-body">
        <div className="editor-skel-main">
          <Skeleton className="skel-line skel-title" />
          <Skeleton className="skel-block" />
          <Skeleton className="skel-block skel-block-sm" />
        </div>
        <aside className="editor-skel-side">
          <Skeleton className="skel-line skel-lg" />
          <Skeleton className="skel-line" />
          <Skeleton className="skel-block skel-block-sm" />
        </aside>
      </div>
    </div>
  )
}
