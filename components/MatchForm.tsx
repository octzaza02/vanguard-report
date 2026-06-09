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

const PRACTICE_BOX1 = ['Mulligan', 'Turn Counts'] as const
type PracticeFieldKey = (typeof PRACTICE_BOX1)[number]
const PRACTICE_DYN_SECTIONS = ['Misplays', 'Turning Point'] as const
type PracticeDynSection = (typeof PRACTICE_DYN_SECTIONS)[number]
const RESOURCE_FIELDS = ['Counter Blast', 'Soul', 'Energy', 'Damage Denial', 'Shield Value'] as const
type ResourceField = (typeof RESOURCE_FIELDS)[number]
type ResourceRating = { good: boolean; bad: boolean }
const DECK_CHANGE_SECTIONS = ['Death Cards', 'Cards In', 'Cards Out'] as const
type DeckSection = (typeof DECK_CHANGE_SECTIONS)[number]

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
  const [practiceValues, setPracticeValues] = useState<Record<PracticeFieldKey, string>>(
    () => Object.fromEntries(PRACTICE_BOX1.map((k) => [k, initial?.extra?.[k] ?? ''])) as Record<PracticeFieldKey, string>
  )
  const [resourceValues, setResourceValues] = useState<Record<ResourceField, ResourceRating>>(() =>
    Object.fromEntries(
      RESOURCE_FIELDS.map((k) => {
        const saved = initial?.extra?.[`RM_${k}`] ?? ''
        return [k, { good: saved.includes('Good'), bad: saved.includes('Bad') }]
      })
    ) as Record<ResourceField, ResourceRating>
  )
  const [practiceDynFields, setPracticeDynFields] = useState<Record<PracticeDynSection, ExtraField[]>>(() => {
    const init = (sec: PracticeDynSection): ExtraField[] => []
    return Object.fromEntries(PRACTICE_DYN_SECTIONS.map((s) => [s, init(s)])) as Record<PracticeDynSection, ExtraField[]>
  })
  const [deckSectionFields, setDeckSectionFields] = useState<Record<DeckSection, ExtraField[]>>(() => {
    const init = (sec: DeckSection): ExtraField[] => {
      if (initial?.extra && sec in initial.extra) {
        return [{ key: sec, value: String(initial.extra[sec]) }]
      }
      return []
    }
    return Object.fromEntries(DECK_CHANGE_SECTIONS.map((s) => [s, init(s)])) as Record<DeckSection, ExtraField[]>
  })
  const allReservedKeys = [
    ...PRACTICE_BOX1,
    ...PRACTICE_DYN_SECTIONS,
    ...RESOURCE_FIELDS.map((k) => `RM_${k}`),
    ...DECK_CHANGE_SECTIONS,
  ] as readonly string[]
  const [extraFields, setExtraFields] = useState<ExtraField[]>(
    initial?.extra
      ? Object.entries(initial.extra)
          .filter(([key]) => !allReservedKeys.includes(key))
          .map(([key, value]) => ({ key, value: String(value) }))
      : []
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function addPracticeDynField(sec: PracticeDynSection) {
    setPracticeDynFields((prev) => ({ ...prev, [sec]: [...prev[sec], { key: '', value: '' }] }))
  }
  function updatePracticeDynField(sec: PracticeDynSection, idx: number, patch: Partial<ExtraField>) {
    setPracticeDynFields((prev) => ({ ...prev, [sec]: prev[sec].map((f, i) => (i === idx ? { ...f, ...patch } : f)) }))
  }
  function removePracticeDynField(sec: PracticeDynSection, idx: number) {
    setPracticeDynFields((prev) => ({ ...prev, [sec]: prev[sec].filter((_, i) => i !== idx) }))
  }

  function addDeckField(sec: DeckSection) {
    setDeckSectionFields((prev) => ({ ...prev, [sec]: [...prev[sec], { key: '', value: '' }] }))
  }
  function updateDeckField(sec: DeckSection, idx: number, patch: Partial<ExtraField>) {
    setDeckSectionFields((prev) => ({ ...prev, [sec]: prev[sec].map((f, i) => (i === idx ? { ...f, ...patch } : f)) }))
  }
  function removeDeckField(sec: DeckSection, idx: number) {
    setDeckSectionFields((prev) => ({ ...prev, [sec]: prev[sec].filter((_, i) => i !== idx) }))
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
      if (isPractice) {
        for (const k of PRACTICE_BOX1) {
          if (practiceValues[k].trim()) extra[k] = practiceValues[k].trim()
        }
        for (const k of RESOURCE_FIELDS) {
          const v = resourceValues[k]
          const parts = [v.good ? 'Good' : '', v.bad ? 'Bad' : ''].filter(Boolean)
          if (parts.length > 0) extra[`RM_${k}`] = parts.join(', ')
        }
        for (const sec of PRACTICE_DYN_SECTIONS) {
          for (const f of practiceDynFields[sec]) {
            if (f.key.trim()) extra[f.key.trim()] = f.value
          }
        }
        for (const sec of DECK_CHANGE_SECTIONS) {
          for (const f of deckSectionFields[sec]) {
            if (f.key.trim()) extra[f.key.trim()] = f.value
          }
        }
      }
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

        {isPractice && (
          <>
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">ข้อมูลการPractise</p>
              {PRACTICE_BOX1.map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-amber-900 mb-1">{field}</label>
                  <input
                    type="text"
                    value={practiceValues[field]}
                    onChange={(e) => setPracticeValues((v) => ({ ...v, [field]: e.target.value }))}
                    className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder={field}
                  />
                </div>
              ))}
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
                  {practiceDynFields[sec].map((f, idx) => (
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
                  ))}
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

            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 space-y-4">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Decks Change</p>
              {DECK_CHANGE_SECTIONS.map((sec) => (
                <div key={sec} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-amber-900">{sec}</p>
                    <button
                      type="button"
                      onClick={() => addDeckField(sec)}
                      className="text-xs text-amber-600 underline hover:text-amber-950"
                    >
                      + เพิ่มฟิลด์
                    </button>
                  </div>
                  {deckSectionFields[sec].map((f, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={f.key}
                        onChange={(e) => updateDeckField(sec, idx, { key: e.target.value })}
                        placeholder="Card Code"
                        className="w-1/3 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="text"
                        value={f.value}
                        onChange={(e) => updateDeckField(sec, idx, { value: e.target.value })}
                        placeholder="Card Name"
                        className="flex-1 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeDeckField(sec, idx)}
                        className="px-2 text-amber-500 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">บันทึกส่วนตัว</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-amber-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="สิ่งที่ทำได้ดี / สิ่งที่ต้องปรับปรุง"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-amber-900">ฟิลด์กำหนดเอง</label>
            <button type="button" onClick={addExtraField} className="text-sm text-amber-700 underline hover:text-amber-950">
              + เพิ่มฟิลด์
            </button>
          </div>
          <div className="space-y-2">
            {extraFields.map((f, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={f.key}
                  onChange={(e) => updateExtraField(idx, { key: e.target.value })}
                  placeholder="ชื่อฟิลด์"
                  className="w-1/3 rounded-md border border-amber-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="text"
                  value={f.value}
                  onChange={(e) => updateExtraField(idx, { value: e.target.value })}
                  placeholder="ค่า"
                  className="flex-1 rounded-md border border-amber-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => removeExtraField(idx)}
                  className="px-2 text-amber-500 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

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
