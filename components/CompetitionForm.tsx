'use client'

import { useRef, useState, type FormEvent } from 'react'
import Modal from './Modal'
import type { Competition } from '@/lib/types'
import type { CompetitionInput } from '@/lib/api'
import { resizeToDataUrl } from '@/lib/image'

const MAX_DECKLOG_DIM = 480

type DeckRow = { key: string; value: string }
type AttachmentDraft = { image: string | null; note: string; cardsIn: DeckRow[]; cardsOut: DeckRow[] }

function emptyAttachment(): AttachmentDraft {
  return { image: null, note: '', cardsIn: [], cardsOut: [] }
}

function seedAttachment(a: Partial<AttachmentDraft>): AttachmentDraft {
  return { image: a.image ?? null, note: a.note ?? '', cardsIn: a.cardsIn ?? [], cardsOut: a.cardsOut ?? [] }
}

function DeckSection({
  label,
  rows,
  onChange,
}: {
  label: string
  rows: DeckRow[]
  onChange: (rows: DeckRow[]) => void
}) {
  function addRow() { onChange([...rows, { key: '', value: '' }]) }
  function updateRow(idx: number, patch: Partial<DeckRow>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }
  function removeRow(idx: number) { onChange(rows.filter((_, i) => i !== idx)) }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-amber-900">{label}</p>
        <button type="button" onClick={addRow} className="text-xs text-amber-600 underline hover:text-amber-950">
          + เพิ่มฟิลด์
        </button>
      </div>
      {rows.map((r, idx) => (
        <div key={idx} className="flex gap-2">
          <input
            type="text"
            value={r.key}
            onChange={(e) => updateRow(idx, { key: e.target.value })}
            placeholder="Card Code"
            className="w-1/3 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            value={r.value}
            onChange={(e) => updateRow(idx, { value: e.target.value })}
            placeholder="Card Name"
            className="flex-1 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button type="button" onClick={() => removeRow(idx)} className="px-2 text-amber-500 hover:text-red-600">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

export default function CompetitionForm({
  initial,
  onSubmit,
  onClose,
}: {
  initial?: Competition
  onSubmit: (fields: CompetitionInput) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [decklog, setDecklog] = useState(initial?.decklog ?? '')

  const [attachments, setAttachments] = useState<AttachmentDraft[]>(() => {
    if (initial?.attachments && initial.attachments.length > 0)
      return initial.attachments.map(seedAttachment)
    return [seedAttachment({ image: initial?.decklog_image, note: initial?.notes ?? '' })]
  })

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

  function updateAttachment(idx: number, patch: Partial<AttachmentDraft>) {
    setAttachments((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)))
  }
  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleFile(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('กรุณาเลือกไฟล์รูปภาพ'); return }
    try {
      const dataUrl = await resizeToDataUrl(file, MAX_DECKLOG_DIM, 0.85)
      updateAttachment(idx, { image: dataUrl })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'อัปโหลดรูปไม่สำเร็จ')
    } finally {
      const ref = fileRefs.current[idx]
      if (ref) ref.value = ''
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('กรุณากรอกชื่องานแข่ง'); return }
    setSaving(true)
    try {
      const first = attachments[0] ?? emptyAttachment()
      await onSubmit({
        name: name.trim(), game: '', category, decklog,
        decklogImage: first.image, notes: first.note,
        attachments,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={initial ? 'แก้ไขงานแข่ง' : 'สร้างงานแข่งใหม่'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">ชื่องานแข่ง *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-amber-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-900 mb-2">ประเภท</label>
          <div className="flex flex-wrap gap-2">
            {['competitive', 'casual', 'Practise'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setCategory(category === opt ? '' : opt)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                  category === opt
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">Decklog (เด็คที่ใช้)</label>
          <textarea
            value={decklog}
            onChange={(e) => setDecklog(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-amber-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="ชื่อเด็ค / รายละเอียดเด็คที่ใช้ในงานแข่งนี้"
          />
        </div>

        {attachments.map((att, idx) => (
          <div key={idx} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                กรอบที่ {idx + 1}
              </span>
              {attachments.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  ลบกรอบนี้
                </button>
              )}
            </div>

            {/* Image */}
            {att.image && (
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={att.image}
                  alt="Attachment"
                  className="max-h-40 rounded-md border border-amber-300 object-contain shrink-0"
                />
                <button
                  type="button"
                  onClick={() => updateAttachment(idx, { image: null })}
                  className="text-sm text-red-600 hover:underline"
                >
                  ลบรูป
                </button>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-amber-600 mb-1">แนบรูป (ถ้ามี)</label>
              <input
                ref={(el) => { fileRefs.current[idx] = el }}
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(idx, e)}
                className="w-full text-sm text-amber-700 file:mr-3 file:rounded-md file:border file:border-amber-300 file:bg-amber-50 file:px-3 file:py-1.5 file:text-amber-900 file:hover:bg-amber-100 file:transition"
              />
              <p className="text-xs text-amber-500 mt-1">รูปจะถูกย่อขนาดอัตโนมัติก่อนบันทึก</p>
            </div>

            {/* DECKS CHANGE */}
            <div className="border-t border-amber-200 pt-3 space-y-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Decks Change</p>
              <DeckSection
                label="Cards In"
                rows={att.cardsIn}
                onChange={(rows) => updateAttachment(idx, { cardsIn: rows })}
              />
              <DeckSection
                label="Cards Out"
                rows={att.cardsOut}
                onChange={(rows) => updateAttachment(idx, { cardsOut: rows })}
              />
            </div>

            {/* Note */}
            <div className="border-t border-amber-200 pt-3">
              <label className="block text-sm font-medium text-amber-900 mb-1">Note</label>
              <textarea
                value={att.note}
                onChange={(e) => updateAttachment(idx, { note: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="บันทึกเพิ่มเติม"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setAttachments((prev) => [...prev, emptyAttachment()])}
          className="w-full rounded-lg border border-dashed border-amber-300 py-2 text-sm text-amber-600 hover:bg-amber-50 transition"
        >
          + เพิ่มกรอบ
        </button>

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
