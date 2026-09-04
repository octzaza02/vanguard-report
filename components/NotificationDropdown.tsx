'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { FeedItem } from '@/lib/types'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'เมื่อกี้'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ชม.ที่แล้ว`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'เมื่อวาน'
  if (days < 7) return `${days} วันที่แล้ว`
  return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

export default function NotificationDropdown({
  items,
  lastSeenAt,
  onMarkAllRead,
  onClose,
}: {
  items: FeedItem[]
  lastSeenAt: string | null
  onMarkAllRead: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-amber-200 bg-white shadow-lg z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100 bg-amber-50">
        <span className="text-sm font-medium text-amber-950">การแจ้งเตือน</span>
        {items.length > 0 && (
          <button onClick={onMarkAllRead} className="text-xs text-amber-700 hover:underline">
            อ่านทั้งหมด
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-amber-100">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-amber-600">ยังไม่มีการแจ้งเตือน</p>
            <p className="text-xs text-amber-400 mt-1">ติดตามผู้เล่นเพื่อรับการแจ้งเตือน</p>
          </div>
        ) : (
          items.map((item, i) => {
            const isUnread = !lastSeenAt || new Date(item.created_at) > new Date(lastSeenAt)
            return (
              <Link
                key={i}
                href={`/u/${encodeURIComponent(item.user_name)}/${item.competition_id}`}
                onClick={onClose}
                className={`flex gap-3 px-4 py-3 hover:bg-amber-50 transition ${isUnread ? 'bg-amber-50/70' : ''}`}
              >
                <div
                  className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                    isUnread ? 'bg-amber-500' : 'bg-transparent'
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm text-amber-950 leading-snug">
                    <span className="font-medium">{item.user_name}</span>{' '}
                    {item.kind === 'new_competition'
                      ? 'สร้างงานแข่งใหม่ '
                      : `เพิ่มแมตช์ใหม่ ${item.match_count} แมตช์ ใน `}
                    <span className="font-medium">{item.competition_name}</span>
                  </p>
                  <p className="text-xs text-amber-500 mt-0.5">
                    {timeAgo(item.created_at)}
                    {item.competition_category ? ` · ${item.competition_category}` : ''}
                  </p>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
