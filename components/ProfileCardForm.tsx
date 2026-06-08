'use client'

import { useState, type FormEvent } from 'react'
import Modal from './Modal'
import type { ProfileCard, ProfileLink } from '@/lib/types'
import type { ProfileCardInput } from '@/lib/api'

type ExtraField = { key: string; value: string }

const MAX_LINKS = 6
const MAX_EXTRA = 8
const MAX_TAGLINE = 280

export default function ProfileCardForm({
  initial,
  onSubmit,
  onClose,
}: {
  initial: ProfileCard | null
  onSubmit: (input: ProfileCardInput) => Promise<void>
  onClose: () => void
}) {
  const [tagline, setTagline] = useState(initial?.tagline ?? '')
  const [links, setLinks] = useState<ProfileLink[]>(initial?.links ?? [])
  const [extraFields, setExtraFields] = useState<ExtraField[]>(
    initial?.extra ? Object.entries(initial.extra).map(([key, value]) => ({ key, value: String(value) })) : []
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function addLink() {
    if (links.length >= MAX_LINKS) return
    setLinks((l) => [...l, { label: '', url: '' }])
  }
  function updateLink(idx: number, patch: Partial<ProfileLink>) {
    setLinks((l) => l.map((link, i) => (i === idx ? { ...link, ...patch } : link)))
  }
  function removeLink(idx: number) {
    setLinks((l) => l.filter((_, i) => i !== idx))
  }

  function addExtraField() {
    if (extraFields.length >= MAX_EXTRA) return
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

    const cleanedLinks = links
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
      .filter((l) => l.label && l.url)

    for (const l of cleanedLinks) {
      if (!/^https?:\/\//i.test(l.url)) {
        setError(`ลิงก์ "${l.label}" ต้องขึ้นต้นด้วย http:// หรือ https://`)
        return
      }
    }

    const extra: Record<string, string> = {}
    for (const f of extraFields) {
      if (f.key.trim()) extra[f.key.trim()] = f.value
    }

    setSaving(true)
    try {
      await onSubmit({ tagline: tagline.trim(), links: cleanedLinks, extra })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={initial ? 'แก้ไขนามบัตรแนะนำตัว' : 'สร้างนามบัตรแนะนำตัว'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">แนะนำตัวสั้นๆ</label>
          <textarea
            value={tagline}
            onChange={(e) => setTagline(e.target.value.slice(0, MAX_TAGLINE))}
            rows={3}
            className="w-full rounded-md border border-amber-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="เช่น เล่นมา 3 ปี / ถนัดเด็คคอนโทรล"
          />
          <p className="text-xs text-amber-500 mt-1 text-right">{tagline.length}/{MAX_TAGLINE}</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-amber-900">ลิงก์โซเชียล / ติดต่อ</label>
            {links.length < MAX_LINKS && (
              <button type="button" onClick={addLink} className="text-sm text-amber-700 underline hover:text-amber-950">
                + เพิ่มลิงก์
              </button>
            )}
          </div>
          <div className="space-y-2">
            {links.map((l, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={l.label}
                  onChange={(e) => updateLink(idx, { label: e.target.value })}
                  placeholder="ชื่อ เช่น Discord"
                  className="w-1/3 rounded-md border border-amber-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="text"
                  value={l.url}
                  onChange={(e) => updateLink(idx, { url: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 rounded-md border border-amber-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button type="button" onClick={() => removeLink(idx)} className="px-2 text-amber-500 hover:text-red-600">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-500 mt-1">สูงสุด {MAX_LINKS} ลิงก์</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-amber-900">ฟิลด์กำหนดเอง</label>
            {extraFields.length < MAX_EXTRA && (
              <button
                type="button"
                onClick={addExtraField}
                className="text-sm text-amber-700 underline hover:text-amber-950"
              >
                + เพิ่มฟิลด์
              </button>
            )}
          </div>
          <div className="space-y-2">
            {extraFields.map((f, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={f.key}
                  onChange={(e) => updateExtraField(idx, { key: e.target.value })}
                  placeholder="ชื่อฟิลด์ เช่น เกมที่ถนัด"
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
          <p className="text-xs text-amber-500 mt-1">สูงสุด {MAX_EXTRA} ฟิลด์</p>
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
