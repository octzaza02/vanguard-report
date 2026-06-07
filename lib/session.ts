'use client'

import { useEffect, useState } from 'react'
import type { Session } from './types'

const STORAGE_KEY = 'comp-stats-session'

export function loadSession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.token && parsed?.userId && parsed?.name) {
      return { token: parsed.token, userId: parsed.userId, name: parsed.name, isAdmin: !!parsed.isAdmin }
    }
    return null
  } catch {
    return null
  }
}

export function saveSession(session: Session) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  window.dispatchEvent(new Event('comp-stats-session-change'))
}

export function clearSession() {
  window.localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event('comp-stats-session-change'))
}

/** Reactive hook that re-reads the session from localStorage on change. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSession(loadSession())
    setReady(true)
    const handler = () => setSession(loadSession())
    window.addEventListener('comp-stats-session-change', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('comp-stats-session-change', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  return { session, ready }
}
