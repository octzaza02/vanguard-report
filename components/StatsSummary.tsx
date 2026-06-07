'use client'

import type { Match } from '@/lib/types'

export default function StatsSummary({ matches }: { matches: Match[] }) {
  const total = matches.length
  const wins = matches.filter((m) => m.result === 'win').length
  const losses = matches.filter((m) => m.result === 'loss').length
  const draws = matches.filter((m) => m.result === 'draw').length
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  const cards = [
    { label: 'แข่งทั้งหมด', value: total, color: 'text-amber-950' },
    { label: 'ชนะ', value: wins, color: 'text-amber-900' },
    { label: 'แพ้', value: losses, color: 'text-red-600' },
    { label: 'เสมอ', value: draws, color: 'text-amber-600' },
    { label: 'อัตราชนะ', value: `${winRate}%`, color: 'text-amber-950' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-amber-200 bg-white p-4 text-center shadow-sm">
          <p className={`text-2xl font-semibold ${c.color}`}>{c.value}</p>
          <p className="text-xs text-amber-600 mt-1">{c.label}</p>
        </div>
      ))}
    </div>
  )
}
