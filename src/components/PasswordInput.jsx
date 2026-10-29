import { useState } from 'react'

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.6 10.7a2.5 2.5 0 003.5 3.5M9.9 5.2A10.4 10.4 0 0112 5c5 0 8.8 3.4 10.5 7-.5 1.1-1.2 2.2-2.1 3.1M6.1 6.2C4.4 7.5 3.2 9.1 2.5 12c1.7 3.6 5.5 7 10.5 7 1.4 0 2.7-.3 3.9-.7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.5 12C4.2 8.4 8 5 12 5s7.8 3.4 9.5 7c-1.7 3.6-5.5 7-9.5 7s-7.8-3.4-9.5-7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export default function PasswordInput({
  label = 'Password',
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  minLength = 6,
  required = false,
  id,
}) {
  const [visible, setVisible] = useState(false)
  const inputId = id || `password-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <label className="auth-field" htmlFor={inputId}>
      <span>{label}</span>
      <div className="password-field">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          title={visible ? 'Hide password' : 'Show password'}
        >
          <EyeIcon open={visible} />
        </button>
      </div>
    </label>
  )
}
