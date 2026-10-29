import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ensureProfile } from '../lib/notes'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    let mounted = true

    async function boot() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        try {
          await ensureProfile(data.session.user)
        } catch {
          // profile sync is best-effort
        }
      }
      if (mounted) setLoading(false)
    }

    boot()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
      }
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false)
      }
      if (next?.user && event !== 'PASSWORD_RECOVERY') {
        ensureProfile(next.user).catch(() => {})
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      passwordRecovery,
      clearPasswordRecovery() {
        setPasswordRecovery(false)
      },
      async signUp(email, password, { fullName, company } = {}) {
        const trimmedName = (fullName || '').trim()
        const trimmedCompany = (company || '').trim()
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: trimmedName,
              name: trimmedName,
              company: trimmedCompany || null,
            },
          },
        })
        if (error) throw error

        if (data.user) {
          await ensureProfile({
            ...data.user,
            user_metadata: {
              ...data.user.user_metadata,
              full_name: trimmedName,
              name: trimmedName,
              company: trimmedCompany || null,
            },
          })
        }

        return data
      },
      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })
        if (error) throw error
        return data
      },
      async resetPassword(email) {
        const { data, error } = await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          { redirectTo: `${window.location.origin}/auth/reset` },
        )
        if (error) throw error
        return data
      },
      async updatePassword(password) {
        const { data, error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setPasswordRecovery(false)
        return data
      },
      async signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        setPasswordRecovery(false)
      },
    }),
    [session, loading, passwordRecovery],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
