'use client'

import { useRef, useState, type FormEvent } from 'react'
import Modal from './Modal'
import type { Competition } from '@/lib/types'
import type { CompetitionInput } from '@/lib/api'
import { resizeToDataUrl } from '@/lib/image'

const MAX_DECKLOG_DIM = 480

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
  const [decklogImage, setDecklogImage] = useState<string | null>(initial?.decklog_image ?? null)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageError(null)
    if (!file.type.startsWith('image/')) {
      setImageError('กรุณาเลือกไฟล์รูปภาพ')
      return
    }
    try {
      const dataUrl = await resizeToDataUrl(file, MAX_DECKLOG_DIM, 0.85)
      setDecklogImage(dataUrl)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'อัปโหลดรูปไม่สำเร็จ')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('กรุณากรอกชื่องานแข่ง')
      return
    }
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), game: '', category, decklog, decklogImage })
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
          <label className="block text-sm font-medium text-amber-900 mb-1">ประเภท</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-amber-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="เช่น swissround, tournament"
          />
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

          {decklogImage && (
            <div className="mt-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={decklogImage}
                alt="Decklog"
                className="max-h-40 rounded-md border border-amber-300 object-contain"
              />
              <button
                type="button"
                onClick={() => setDecklogImage(null)}
                className="text-sm text-red-600 hover:underline"
              >
                ลบรูป
              </button>
            </div>
          )}

          <div className="mt-2">
            <label className="block text-xs font-medium text-amber-600 mb-1">แนบรูป Decklog (ถ้ามี)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="w-full text-sm text-amber-700 file:mr-3 file:rounded-md file:border file:border-amber-300 file:bg-amber-50 file:px-3 file:py-1.5 file:text-amber-900 file:hover:bg-amber-100 file:transition"
            />
            <p className="text-xs text-amber-500 mt-1">รูปจะถูกย่อขนาดอัตโนมัติก่อนบันทึก</p>
            {imageError && <p className="text-sm text-red-600 mt-1">{imageError}</p>}
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
