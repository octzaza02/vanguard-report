'use client'

import { Fragment, useMemo, useState } from 'react'
import type { Match, MatchResult } from '@/lib/types'

const RESULT_LABELS: Record<MatchResult, string> = { win: 'ชนะ', loss: 'แพ้', draw: 'เสมอ' }

const PRACTICE_SECTIONS = ['Mulligan', 'บันทึกการเล่น', 'Misplays', 'Turning Point', 'Death Cards'] as const
const MULLIGAN_SUBS = ['มือแรก', 'การ์ดที่เปลี่ยน', 'การ์ดที่ได้'] as const

// Keys in the order they appear in the match form (practice mode)
const EXTRA_KEY_ORDER = [
  'RM_Counter Blast',
  'RM_Soul',
  'RM_Energy',
  'RM_Damage Denial',
  'RM_Shield Value',
]

type PlayTurnGroup = { turn: string; notes: string[] }
type PracticeSection =
  | { sec: string; items: string[]; groups?: undefined }
  | { sec: string; groups: PlayTurnGroup[]; items?: undefined }

function getPracticeData(m: Match): PracticeSection[] {
  const result: PracticeSection[] = []

  // Mulligan — grouped by sub-section
  for (const sub of MULLIGAN_SUBS) {
    const prefix = `Mulligan::${sub}::`
    const items = Object.keys(m.extra ?? {})
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length))
    if (items.length > 0) result.push({ sec: `Mulligan · ${sub}`, items })
  }

  // บันทึกการเล่น — new format: บันทึกการเล่น::turn::gi_ni = note
  //                  legacy format: บันทึกการเล่น::turn = note  OR  ::note = ""
  {
    const prefix = 'บันทึกการเล่น::'
    const raw = Object.entries(m.extra ?? {}).filter(([k]) => k.startsWith(prefix))
    const grouped = new Map<string, { sortKey: string; note: string }[]>()
    const legacyNotes: string[] = []
    for (const [k, v] of raw) {
      const rest = k.slice(prefix.length)
      const sep = rest.indexOf('::')
      if (sep !== -1) {
        const turn = rest.slice(0, sep)
        const idxStr = rest.slice(sep + 2)
        if (!grouped.has(turn)) grouped.set(turn, [])
        grouped.get(turn)!.push({ sortKey: idxStr, note: v })
      } else {
        legacyNotes.push(v ? `เทิร์น ${rest}: ${v}` : rest)
      }
    }
    const sortedTurns = Array.from(grouped.entries()).sort(([a], [b]) => {
      const na = parseFloat(a)
      const nb = parseFloat(b)
      const numA = isNaN(na) ? Infinity : na
      const numB = isNaN(nb) ? Infinity : nb
      if (numA !== numB) return numA - numB
      return a.localeCompare(b, undefined, { numeric: true })
    })
    const groups: PlayTurnGroup[] = []
    if (legacyNotes.length > 0) groups.push({ turn: '', notes: legacyNotes })
    for (const [turn, entries] of sortedTurns) {
      entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      groups.push({ turn, notes: entries.map((e) => e.note) })
    }
    if (groups.length > 0) result.push({ sec: 'บันทึกการเล่น', groups })
  }

  // Other practice sections
  for (const sec of ['Misplays', 'Turning Point', 'Death Cards'] as const) {
    const prefix = `${sec}::`
    const items = Object.entries(m.extra ?? {})
      .filter(([k]) => k.startsWith(prefix))
      .map(([k, v]) => (v ? `${k.slice(prefix.length)}: ${v}` : k.slice(prefix.length)))
    if (items.length > 0) result.push({ sec, items })
  }

  return result
}
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
    for (const m of matches) {
      Object.keys(m.extra ?? {}).forEach((k) => {
        // exclude practice section keys and summary fields — shown in expanded bullet row instead
        if (PRACTICE_SECTIONS.some((sec) => k.startsWith(`${sec}::`))) return
        if (k === 'WinLoseSummary' || k === 'NextStrategy') return
        keys.add(k)
      })
    }
    return Array.from(keys).sort((a, b) => {
      const ai = EXTRA_KEY_ORDER.indexOf(a)
      const bi = EXTRA_KEY_ORDER.indexOf(b)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return 0
    })
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
                <th key={k} className="px-4 py-2 font-medium">{k.startsWith('RM_') ? k.slice(3) : k}</th>
              ))}
              {isOwner && <th className="px-4 py-2 font-medium text-right">จัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const practiceData = getPracticeData(m)
              const hasPractice = practiceData.length > 0 || !!m.extra?.['WinLoseSummary'] || !!m.extra?.['NextStrategy']
              const colSpan = 7 + extraKeys.length + (isOwner ? 1 : 0)
              return (
                <Fragment key={m.id}>
                  <tr
                    className={`border-b ${hasPractice ? '' : 'border-amber-200'} hover:bg-amber-50`}
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-amber-950 font-medium">
                      {m.round_number ?? '—'}
                    </td>
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
                  {hasPractice && (
                    <tr key={`${m.id}-detail`} className="border-b border-amber-200 bg-amber-50/60">
                      <td colSpan={colSpan} className="px-6 py-3 space-y-3">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">ข้อมูลการ Practise</p>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
                          {practiceData.map((section) => (
                            <div key={section.sec}>
                              <p className="text-xs font-semibold text-amber-800 mb-1">{section.sec}</p>
                              {section.groups ? (
                                <div className="space-y-1.5">
                                  {section.groups.map((g, gi) => (
                                    <div key={gi}>
                                      {g.turn && (
                                        <p className="text-xs font-medium text-amber-700 mb-0.5">เทิร์น {g.turn}</p>
                                      )}
                                      <ul className={`space-y-0.5 ${g.turn ? 'pl-3' : ''}`}>
                                        {g.notes.map((note, ni) => {
                                          const isPR = note.startsWith('[PR] ')
                                          const text = isPR ? note.slice(5) : note
                                          return (
                                            <li key={ni} className="flex items-start gap-1.5 text-sm text-amber-900">
                                              <span className="mt-0.5 text-amber-500 shrink-0">•</span>
                                              {isPR && <span className="shrink-0 rounded px-1 text-xs font-bold bg-amber-500 text-white leading-5">PR</span>}
                                              <span>{text}</span>
                                            </li>
                                          )
                                        })}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <ul className="space-y-0.5">
                                  {section.items!.map((item, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-sm text-amber-900">
                                      <span className="mt-0.5 text-amber-500 shrink-0">•</span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                        {(m.extra?.['WinLoseSummary'] || m.extra?.['NextStrategy']) && (
                          <div className="border-t border-amber-200 pt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {m.extra?.['WinLoseSummary'] && (
                              <div>
                                <p className="text-xs font-semibold text-amber-800 mb-1">สรุปผลเกมนี้ชนะ/แพ้เพราะอะไร</p>
                                <p className="text-sm text-amber-900 whitespace-pre-wrap">{m.extra['WinLoseSummary']}</p>
                              </div>
                            )}
                            {m.extra?.['NextStrategy'] && (
                              <div>
                                <p className="text-xs font-semibold text-amber-800 mb-1">รอบหน้าเจอเด็คนี้จะแก้ยังไง</p>
                                <p className="text-sm text-amber-900 whitespace-pre-wrap">{m.extra['NextStrategy']}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
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
