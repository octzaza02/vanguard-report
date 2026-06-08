'use client'

import { useMemo, useState } from 'react'
import type { Match, MatchResult } from '@/lib/types'

const RESULT_LABELS: Record<MatchResult, string> = { win: 'ชนะ', loss: 'แพ้', draw: 'เสมอ' }
const RESULT_BADGE: Record<MatchResult, string> = {
  win: 'bg-amber-100 text-amber-950',
  loss: 'bg-red-50 text-red-600',
  draw: 'bg-amber-50 text-amber-700',
}

type SortKey = 'round_number' | 'match_date' | 'result'

export default function MatchTable({
  matches,
  isOwner,
  onEdit,
  onDelete,
}: {
  matches: Match[]
  isOwner: boolean
  onEdit: (m: Match) => void
  onDelete: (m: Match) => void
}) {
  const [resultFilter, setResultFilter] = useState<MatchResult | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('round_number')
  const [sortAsc, setSortAsc] = useState(true)

  const filtered = useMemo(() => {
    let rows = matches
    if (resultFilter !== 'all') rows = rows.filter((m) => m.result === resultFilter)
    rows = [...rows].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'round_number') cmp = (a.round_number ?? 0) - (b.round_number ?? 0)
      else if (sortKey === 'match_date') cmp = a.match_date.localeCompare(b.match_date)
      else cmp = a.result.localeCompare(b.result)
      return sortAsc ? cmp : -cmp
    })
    return rows
  }, [matches, resultFilter, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a)
    else {
      setSortKey(key)
      setSortAsc(key === 'round_number')
    }
  }

  const extraKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const m of matches) Object.keys(m.extra ?? {}).forEach((k) => keys.add(k))
    return Array.from(keys)
  }, [matches])

  return (
    <div className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-amber-200 p-3">
        <span className="text-sm text-amber-700">กรองผล:</span>
        {(['all', 'win', 'loss', 'draw'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setResultFilter(r)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
              resultFilter === r ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            {r === 'all' ? 'ทั้งหมด' : RESULT_LABELS[r]}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-amber-600 border-b border-amber-200">
              <th className="px-4 py-2 font-medium cursor-pointer select-none" onClick={() => toggleSort('round_number')}>
                รอบที่ {sortKey === 'round_number' ? (sortAsc ? '↑' : '↓') : ''}
              </th>
              <th className="px-4 py-2 font-medium cursor-pointer select-none" onClick={() => toggleSort('match_date')}>
                วันที่ {sortKey === 'match_date' ? (sortAsc ? '↑' : '↓') : ''}
              </th>
              <th className="px-4 py-2 font-medium">คู่แข่ง</th>
              <th className="px-4 py-2 font-medium">เริ่มก่อน/หลัง</th>
              <th className="px-4 py-2 font-medium cursor-pointer select-none" onClick={() => toggleSort('result')}>
                ผล {sortKey === 'result' ? (sortAsc ? '↑' : '↓') : ''}
              </th>
              <th className="px-4 py-2 font-medium">คะแนน</th>
              <th className="px-4 py-2 font-medium">บันทึก</th>
              {extraKeys.map((k) => (
                <th key={k} className="px-4 py-2 font-medium">{k}</th>
              ))}
              {isOwner && <th className="px-4 py-2 font-medium text-right">จัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-amber-200 last:border-0 hover:bg-amber-50">
                <td className="px-4 py-2 whitespace-nowrap text-amber-950 font-medium">{m.round_number ?? '—'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-amber-900">{m.match_date}</td>
                <td className="px-4 py-2 text-amber-900">{m.opponent || '—'}</td>
                <td className="px-4 py-2 text-amber-900">
                  {m.went_first === true ? 'เริ่มก่อน' : m.went_first === false ? 'เริ่มหลัง' : '—'}
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RESULT_BADGE[m.result]}`}>
                    {RESULT_LABELS[m.result]}
                  </span>
                </td>
                <td className="px-4 py-2 text-amber-900">{m.score || '—'}</td>
                <td className="px-4 py-2 text-amber-600 max-w-xs whitespace-pre-wrap break-words align-top">
                  {m.notes || '—'}
                </td>
                {extraKeys.map((k) => (
                  <td key={k} className="px-4 py-2 text-amber-600">{m.extra?.[k] ?? '—'}</td>
                ))}
                {isOwner && (
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => onEdit(m)} className="text-amber-700 hover:underline mr-3">
                      แก้ไข
                    </button>
                    <button onClick={() => onDelete(m)} className="text-red-600 hover:underline">
                      ลบ
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8 + extraKeys.length + (isOwner ? 1 : 0)} className="px-4 py-8 text-center text-amber-500">
                  ไม่มีแมตช์ที่ตรงกับตัวกรอง
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
