import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AppHeader({ leading, actions }) {
  const { user, signOut } = useAuth()
  const label = user?.email || 'Account'

  return (
    <header className="app-bar">
      <div className="app-bar-left">
        <Link to="/app" className="brand">
          Notes Taker
        </Link>
        {leading}
      </div>
      <div className="app-bar-right">
        {actions}
        <span className="user-chip" title={label}>
          {label}
        </span>
        <button type="button" className="btn btn-ghost" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </header>
  )
}
