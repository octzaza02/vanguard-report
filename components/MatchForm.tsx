'use client'

import { Fragment, useState, type FormEvent } from 'react'
import Modal from './Modal'
import type { Match, MatchResult } from '@/lib/types'
import type { MatchInput } from '@/lib/api'

function todayISO() {
  const d = new Date()
  const tz = d.getTimezoneOffset()
  return new Date(d.getTime() - tz * 60000).toISOString().slice(0, 10)
}

type ExtraField = { key: string; value: string }

const MULLIGAN_SUBS = ['มือแรก', 'การ์ดที่เปลี่ยน', 'การ์ดที่ได้'] as const
type MulliganSub = (typeof MULLIGAN_SUBS)[number]
const PRACTICE_DYN_SECTIONS = ['Misplays', 'Turning Point', 'Death Cards'] as const
type PracticeDynSection = (typeof PRACTICE_DYN_SECTIONS)[number]
const SINGLE_INPUT_SECTIONS: readonly string[] = ['Misplays', 'Turning Point']

type PlayNote = { text: string; pr: boolean }
type PlayGroup = { turn: string; notes: PlayNote[] }
const RESOURCE_FIELDS = ['Counter Blast', 'Soul', 'Energy', 'Damage Denial', 'Shield Value'] as const
type ResourceField = (typeof RESOURCE_FIELDS)[number]
type ResourceRating = { good: boolean; bad: boolean }

export default function MatchForm({
  initial,
  nextRoundNumber,
  category,
  onSubmit,
  onClose,
}: {
  initial?: Match
  nextRoundNumber?: number
  category?: string
  onSubmit: (input: MatchInput) => Promise<void>
  onClose: () => void
}) {
  const isPractice = category === 'Practise'
  const [matchDate, setMatchDate] = useState(initial?.match_date ?? todayISO())
  const [showDatePicker, setShowDatePicker] = useState(Boolean(initial))
  const [roundNumber, setRoundNumber] = useState<string>(
    initial?.round_number != null ? String(initial.round_number) : nextRoundNumber != null ? String(nextRoundNumber) : ''
  )
  const [opponent, setOpponent] = useState(initial?.opponent ?? '')
  const [wentFirst, setWentFirst] = useState<boolean | null>(initial?.went_first ?? null)
  const [result, setResult] = useState<MatchResult>(initial?.result ?? 'win')
  const [score, setScore] = useState(initial?.score ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [resourceValues, setResourceValues] = useState<Record<ResourceField, ResourceRating>>(() =>
    Object.fromEntries(
      RESOURCE_FIELDS.map((k) => {
        const saved = initial?.extra?.[`RM_${k}`] ?? ''
        return [k, { good: saved.includes('Good'), bad: saved.includes('Bad') }]
      })
    ) as Record<ResourceField, ResourceRating>
  )
  const [mulliganSubFields, setMulliganSubFields] = useState<Record<MulliganSub, string[]>>(() =>
    Object.fromEntries(
      MULLIGAN_SUBS.map((sub) => {
        if (!initial?.extra) return [sub, []]
        const prefix = `Mulligan::${sub}::`
        const items = Object.keys(initial.extra)
          .filter((k) => k.startsWith(prefix))
          .map((k) => k.slice(prefix.length))
        return [sub, items]
      })
    ) as Record<MulliganSub, string[]>
  )
  const [playLog, setPlayLog] = useState<PlayGroup[]>(() => {
    if (!initial?.extra) return []
    const prefix = 'บันทึกการเล่น::'
    const entries = Object.entries(initial.extra).filter(([k]) => k.startsWith(prefix))
    if (entries.length === 0) return []
    const grouped = new Map<string, PlayNote[]>()
    const legacy: PlayGroup[] = []
    for (const [k, v] of entries) {
      const rest = k.slice(prefix.length)
      const sepIdx = rest.indexOf('::')
      if (sepIdx !== -1) {
        const turn = rest.slice(0, sepIdx)
        if (!grouped.has(turn)) grouped.set(turn, [])
        const pr = v.startsWith('[PR] ')
        grouped.get(turn)!.push({ text: pr ? v.slice(5) : v, pr })
      } else {
        legacy.push({ turn: v ? rest : '', notes: [{ text: v || rest, pr: false }] })
      }
    }
    const fromNew: PlayGroup[] = Array.from(grouped.entries()).map(([turn, notes]) => ({ turn, notes }))
    return [...fromNew, ...legacy]
  })
  const [practiceDynFields, setPracticeDynFields] = useState<Record<PracticeDynSection, ExtraField[]>>(() =>
    Object.fromEntries(
      PRACTICE_DYN_SECTIONS.map((sec) => {
        if (!initial?.extra) return [sec, []]
        const prefix = `${sec}::`
        const rows = Object.entries(initial.extra)
          .filter(([k]) => k.startsWith(prefix))
          .map(([k, v]) => ({ key: k.slice(prefix.length), value: String(v) }))
        return [sec, rows]
      })
    ) as Record<PracticeDynSection, ExtraField[]>
  )
  const [winLoseSummary, setWinLoseSummary] = useState(initial?.extra?.['WinLoseSummary'] ?? '')
  const [nextStrategy, setNextStrategy] = useState(initial?.extra?.['NextStrategy'] ?? '')
  const [extraFields, setExtraFields] = useState<ExtraField[]>(
    initial?.extra
      ? Object.entries(initial.extra)
          .filter(([key]) => {
            if (RESOURCE_FIELDS.some((k) => key === `RM_${k}`)) return false
            if (key.startsWith('Mulligan::')) return false
            if (key.startsWith('บันทึกการเล่น::')) return false
            if (PRACTICE_DYN_SECTIONS.some((sec) => key.startsWith(`${sec}::`))) return false
            if (key === 'WinLoseSummary' || key === 'NextStrategy') return false
            return true
          })
          .map(([key, value]) => ({ key, value: String(value) }))
      : []
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function addMulliganItem(sub: MulliganSub) {
    setMulliganSubFields((prev) => ({ ...prev, [sub]: [...prev[sub], ''] }))
  }
  function updateMulliganItem(sub: MulliganSub, idx: number, val: string) {
    setMulliganSubFields((prev) => ({ ...prev, [sub]: prev[sub].map((v, i) => (i === idx ? val : v)) }))
  }
  function removeMulliganItem(sub: MulliganSub, idx: number) {
    setMulliganSubFields((prev) => ({ ...prev, [sub]: prev[sub].filter((_, i) => i !== idx) }))
  }

  function addPlayGroup() { setPlayLog((p) => [...p, { turn: '', notes: [{ text: '', pr: false }] }]) }
  function removePlayGroup(gi: number) { setPlayLog((p) => p.filter((_, i) => i !== gi)) }
  function updatePlayTurn(gi: number, val: string) {
    setPlayLog((p) => p.map((g, i) => i === gi ? { ...g, turn: val } : g))
  }
  function addPlayNote(gi: number) {
    setPlayLog((p) => p.map((g, i) => i === gi ? { ...g, notes: [...g.notes, { text: '', pr: false }] } : g))
  }
  function updatePlayNote(gi: number, ni: number, text: string) {
    setPlayLog((p) => p.map((g, i) => i === gi ? { ...g, notes: g.notes.map((n, j) => j === ni ? { ...n, text } : n) } : g))
  }
  function togglePlayNotePR(gi: number, ni: number) {
    setPlayLog((p) => p.map((g, i) => i === gi ? { ...g, notes: g.notes.map((n, j) => j === ni ? { ...n, pr: !n.pr } : n) } : g))
  }
  function removePlayNote(gi: number, ni: number) {
    setPlayLog((p) => p.map((g, i) => i === gi ? { ...g, notes: g.notes.filter((_, j) => j !== ni) } : g))
  }

  function addPracticeDynField(sec: PracticeDynSection) {
    setPracticeDynFields((prev) => ({ ...prev, [sec]: [...prev[sec], { key: '', value: '' }] }))
  }
  function updatePracticeDynField(sec: PracticeDynSection, idx: number, patch: Partial<ExtraField>) {
    setPracticeDynFields((prev) => ({ ...prev, [sec]: prev[sec].map((f, i) => (i === idx ? { ...f, ...patch } : f)) }))
  }
  function removePracticeDynField(sec: PracticeDynSection, idx: number) {
    setPracticeDynFields((prev) => ({ ...prev, [sec]: prev[sec].filter((_, i) => i !== idx) }))
  }

  function addExtraField() {
    setExtraFields((f) => [...f, { key: '', value: '' }])
  }
  function updateExtraField(idx: number, patch: Partial<ExtraField>) {
    setExtraFields((f) => f.map((field, i) => (i === idx ? { ...field, ...patch } : field)))
  }
  function removeExtraField(idx: number) {
    setExtraFields((f) => f.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const extra: Record<string, string> = {}
      for (const k of RESOURCE_FIELDS) {
        const v = resourceValues[k]
        const parts = [v.good ? 'Good' : '', v.bad ? 'Bad' : ''].filter(Boolean)
        if (parts.length > 0) extra[`RM_${k}`] = parts.join(', ')
      }
      for (const sub of MULLIGAN_SUBS) {
        for (const item of mulliganSubFields[sub]) {
          if (item.trim()) extra[`Mulligan::${sub}::${item.trim()}`] = ''
        }
      }
      for (const [gi, group] of playLog.entries()) {
        for (const [ni, note] of group.notes.entries()) {
          if (note.text.trim()) {
            const val = note.pr ? `[PR] ${note.text.trim()}` : note.text.trim()
            extra[`บันทึกการเล่น::${group.turn.trim()}::${gi}_${ni}`] = val
          }
        }
      }
      for (const sec of PRACTICE_DYN_SECTIONS) {
        for (const f of practiceDynFields[sec]) {
          if (f.key.trim()) extra[`${sec}::${f.key.trim()}`] = f.value
        }
      }
      if (winLoseSummary.trim()) extra['WinLoseSummary'] = winLoseSummary.trim()
      if (nextStrategy.trim()) extra['NextStrategy'] = nextStrategy.trim()
      for (const f of extraFields) {
        if (f.key.trim()) extra[f.key.trim()] = f.value
      }
      const trimmedRound = roundNumber.trim()
      const parsedRound = trimmedRound ? parseInt(trimmedRound, 10) : null
      await onSubmit({
        matchDate,
        roundNumber: parsedRound != null && !Number.isNaN(parsedRound) ? parsedRound : null,
        opponent,
        wentFirst,
        result,
        score,
        notes,
        extra,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={initial ? 'แก้ไขแมตช์' : 'บันทึกแมตช์ใหม่'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">วันที่แข่ง</label>
          {showDatePicker ? (
            <input
              type="date"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              className="w-full rounded-md border border-amber-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-amber-900">{matchDate} (วันนี้)</span>
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className="text-sm text-amber-700 underline hover:text-amber-950"
              >
                เลือกวันก่อนหน้า
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">รอบที่</label>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={roundNumber}
            onChange={(e) => setRoundNumber(e.target.value)}
            className="w-full rounded-md border border-amber-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="ลำดับรอบการแข่งขัน เช่น 1, 2, 3"
          />
          <p className="text-xs text-amber-500 mt-1">ดีฟอลต์เรียงตามลำดับการบันทึก แต่แก้ไขเลขรอบเองได้</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">คู่แข่ง</label>
          <input
            type="text"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            className="w-full rounded-md border border-amber-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Deck / คู่แข่ง"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">เริ่มก่อนหรือเริ่มหลัง</label>
          <div className="flex gap-2">
            {(
              [
                { v: null, label: 'ไม่ระบุ' },
                { v: true, label: 'เริ่มก่อน' },
                { v: false, label: 'เริ่มหลัง' },
              ] as const
            ).map(({ v, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => setWentFirst(v)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
                  wentFirst === v
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">ผลการแข่งขัน</label>
          <div className="flex gap-2">
            {(['win', 'loss', 'draw'] as MatchResult[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setResult(r)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
                  result === r
                    ? r === 'win'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : r === 'loss'
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-amber-100 text-white border-amber-300'
                    : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                }`}
              >
                {r === 'win' ? 'ชนะ' : r === 'loss' ? 'แพ้' : 'เสมอ'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">คะแนน</label>
          <input
            type="text"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-full rounded-md border border-amber-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="เช่น 2-1, 13-7"
          />
        </div>

        <>
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">ข้อมูลการPractise</p>

              {/* Mulligan — three fixed sub-sections */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-900">Mulligan</p>
                {MULLIGAN_SUBS.map((sub) => (
                  <div key={sub} className="ml-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-amber-700">{sub}</p>
                      <button
                        type="button"
                        onClick={() => addMulliganItem(sub)}
                        className="text-xs text-amber-600 underline hover:text-amber-950"
                      >
                        + เพิ่มฟิลด์
                      </button>
                    </div>
                    {mulliganSubFields[sub].map((val, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => updateMulliganItem(sub, idx, e.target.value)}
                          placeholder="กรอกข้อมูล"
                          className="flex-1 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeMulliganItem(sub, idx)}
                          className="px-2 text-amber-500 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* บันทึกการเล่น — turn (left) + multiple notes (right) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-amber-900">บันทึกการเล่น</p>
                  <button
                    type="button"
                    onClick={addPlayGroup}
                    className="text-xs text-amber-600 underline hover:text-amber-950"
                  >
                    + เพิ่มฟิลด์
                  </button>
                </div>
                {playLog.map((group, gi) => (
                  <div key={gi} className="flex gap-2 items-start">
                    {/* Turn field */}
                    <input
                      type="text"
                      value={group.turn}
                      onChange={(e) => updatePlayTurn(gi, e.target.value)}
                      placeholder="เทิร์นที่"
                      className="w-20 shrink-0 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    {/* Notes column */}
                    <div className="flex-1 space-y-1">
                      {group.notes.map((note, ni) => (
                        <div key={ni} className="flex gap-1">
                          <input
                            type="text"
                            value={note.text}
                            onChange={(e) => updatePlayNote(gi, ni, e.target.value)}
                            placeholder="บันทึก"
                            className="flex-1 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => togglePlayNotePR(gi, ni)}
                            className={`shrink-0 rounded-md border px-2 py-1.5 text-xs font-bold transition ${
                              note.pr
                                ? 'bg-amber-500 border-amber-500 text-white'
                                : 'bg-white border-amber-300 text-amber-400 hover:border-amber-400 hover:text-amber-600'
                            }`}
                          >
                            PR
                          </button>
                          <button
                            type="button"
                            onClick={() => removePlayNote(gi, ni)}
                            className="px-1.5 text-amber-400 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addPlayNote(gi)}
                        className="text-xs text-amber-500 hover:text-amber-800"
                      >
                        + เพิ่มบันทึก
                      </button>
                    </div>
                    {/* Remove group */}
                    <button
                      type="button"
                      onClick={() => removePlayGroup(gi)}
                      className="mt-1.5 px-1.5 text-amber-400 hover:text-red-600 text-sm shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {PRACTICE_DYN_SECTIONS.map((sec) => (
                <div key={sec} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-amber-900">{sec}</p>
                    <button
                      type="button"
                      onClick={() => addPracticeDynField(sec)}
                      className="text-xs text-amber-600 underline hover:text-amber-950"
                    >
                      + เพิ่มฟิลด์
                    </button>
                  </div>
                  {practiceDynFields[sec].map((f, idx) =>
                    SINGLE_INPUT_SECTIONS.includes(sec) ? (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={f.key}
                          onChange={(e) => updatePracticeDynField(sec, idx, { key: e.target.value })}
                          placeholder="กรอกข้อมูล"
                          className="flex-1 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => removePracticeDynField(sec, idx)}
                          className="px-2 text-amber-500 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={f.key}
                          onChange={(e) => updatePracticeDynField(sec, idx, { key: e.target.value })}
                          placeholder="Card Code"
                          className="w-1/3 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          value={f.value}
                          onChange={(e) => updatePracticeDynField(sec, idx, { value: e.target.value })}
                          placeholder="Card Name"
                          className="flex-1 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => removePracticeDynField(sec, idx)}
                          className="px-2 text-amber-500 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Resource Management</p>
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-2">
                <span />
                <span className="text-xs font-semibold text-green-700 text-center w-12">Good</span>
                <span className="text-xs font-semibold text-red-600 text-center w-12">Bad</span>
                {RESOURCE_FIELDS.map((field) => (
                  <Fragment key={field}>
                    <span className="text-sm font-medium text-amber-900">{field}</span>
                    <button
                      type="button"
                      onClick={() => setResourceValues((v) => ({ ...v, [field]: { ...v[field], good: !v[field].good } }))}
                      className={`w-12 h-8 rounded-md border text-sm font-bold transition ${
                        resourceValues[field].good
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'bg-white border-amber-300 text-amber-300 hover:border-green-400 hover:text-green-500'
                      }`}
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setResourceValues((v) => ({ ...v, [field]: { ...v[field], bad: !v[field].bad } }))}
                      className={`w-12 h-8 rounded-md border text-sm font-bold transition ${
                        resourceValues[field].bad
                          ? 'bg-red-500 border-red-500 text-white'
                          : 'bg-white border-amber-300 text-amber-300 hover:border-red-400 hover:text-red-500'
                      }`}
                    >
                      ✕
                    </button>
                  </Fragment>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">สรุปเกม</p>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">สรุปผลเกมนี้ชนะ/แพ้เพราะอะไร</label>
                <textarea
                  value={winLoseSummary}
                  onChange={(e) => setWinLoseSummary(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="เหตุผลที่ชนะหรือแพ้ในเกมนี้"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">รอบหน้าเจอเด็คนี้จะแก้ยังไง</label>
                <textarea
                  value={nextStrategy}
                  onChange={(e) => setNextStrategy(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="กลยุทธ์หรือการปรับเด็คสำหรับครั้งถัดไป"
                />
              </div>
            </div>

        </>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-amber-700 hover:bg-amber-50">
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-md bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
