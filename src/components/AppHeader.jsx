import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AppHeader({ leading, actions }) {
  const { user, signOut } = useAuth()
  const label =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'Account'

  return (
    <header className="app-bar">
      <div className="app-bar-left">
        <Link to="/app" className="brand">
          <img className="brand-mark" src="/logo.svg" alt="" width="20" height="20" />
          <span className="brand-text">Notefolio</span>
        </Link>
        {leading}
      </div>
      <div className="app-bar-right">
        {actions}
        <span className="user-chip" title={label}>
          {label}
        </span>
        <button type="button" className="btn btn-ghost btn-signout" onClick={() => signOut()}>
          <span className="btn-signout-full">Sign out</span>
          <span className="btn-signout-short">Out</span>
        </button>
      </div>
    </header>
  )
}
