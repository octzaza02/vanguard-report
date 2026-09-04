'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { listFeed } from './api'
import type { FeedItem } from './types'

const STORAGE_KEY = 'notif_last_seen'
const POLL_MS = 60_000
const LOOKBACK_DAYS = 30

export function useNotifications(token: string | null) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setLastSeenAt(localStorage.getItem(STORAGE_KEY))
  }, [])

  const fetchFeed = useCallback(async () => {
    if (!token) return
    const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString()
    try {
      setItems(await listFeed(token, since))
    } catch {
      // silent — don't disrupt UI on feed errors
    }
  }, [token])

  useEffect(() => {
    fetchFeed()
    timerRef.current = setInterval(fetchFeed, POLL_MS)
    const onVisibility = () => { if (!document.hidden) fetchFeed() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchFeed])

  const unreadCount = lastSeenAt
    ? items.filter((it) => new Date(it.created_at) > new Date(lastSeenAt)).length
    : items.length

  function markAllRead() {
    const now = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, now)
    setLastSeenAt(now)
  }

  return { items, unreadCount, lastSeenAt, markAllRead }
}
