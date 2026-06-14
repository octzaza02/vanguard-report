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
const PRACTICE_DYN_SECTIONS = ['บันทึกการเล่น', 'Misplays', 'Turning Point', 'Death Cards'] as const
type PracticeDynSection = (typeof PRACTICE_DYN_SECTIONS)[number]
const SINGLE_INPUT_SECTIONS: readonly string[] = ['Misplays', 'Turning Point']
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
                          placeholder={sec === 'บันทึกการเล่น' ? 'เทิร์นที่' : 'Card Code'}
                          className="w-1/3 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          value={f.value}
                          onChange={(e) => updatePracticeDynField(sec, idx, { value: e.target.value })}
                          placeholder={sec === 'บันทึกการเล่น' ? 'notes' : 'Card Name'}
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
