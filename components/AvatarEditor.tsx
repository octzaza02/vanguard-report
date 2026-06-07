'use client'

import { useRef, useState } from 'react'
import Modal from './Modal'
import FolderIcon from './FolderIcon'
import { resizeToDataUrl } from '@/lib/image'

const EMOJI_PRESETS = ['📁', '🏆', '🎮', '🕹️', '⚡', '🔥', '🐉', '🎯', '🛡️', '🚀', '⭐', '🃏']

export default function AvatarEditor({
  current,
  onSave,
  onClose,
}: {
  current: string | null
  onSave: (avatar: string | null) => Promise<void>
  onClose: () => void
}) {
  const [value, setValue] = useState(current ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพ')
      return
    }
    try {
      const dataUrl = await resizeToDataUrl(file)
      setValue(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปโหลดรูปไม่สำเร็จ')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      await onSave(value.trim() ? value.trim() : null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const isImage = value.startsWith('data:image')

  return (
    <Modal title="แก้ไขโลโก้โฟลเดอร์" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <FolderIcon avatar={value || null} size={56} />
          <p className="text-sm text-amber-600">ตัวอย่างโลโก้โฟลเดอร์ของคุณ</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">เลือกอิโมจิ</label>
          <div className="flex flex-wrap gap-2">
            {EMOJI_PRESETS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setValue(e)}
                className={`flex h-10 w-10 items-center justify-center rounded-md border text-lg transition ${
                  value === e ? 'border-amber-600 bg-amber-50' : 'border-amber-300 hover:bg-amber-50'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">หรือพิมพ์อิโมจิ/ข้อความเอง</label>
          <input
            type="text"
            value={isImage ? '' : value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={4}
            className="w-full rounded-md border border-amber-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="เช่น 🐯 หรือ ตัวอักษร 1-2 ตัว"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">หรืออัปโหลดรูปภาพ</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="w-full text-sm text-amber-700 file:mr-3 file:rounded-md file:border file:border-amber-300 file:bg-amber-50 file:px-3 file:py-1.5 file:text-amber-900 file:hover:bg-amber-100 file:transition"
          />
          <p className="text-xs text-amber-500 mt-1">รูปจะถูกย่อขนาดอัตโนมัติก่อนบันทึก</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={() => setValue('')}
            className="px-4 py-2 rounded-md text-amber-600 hover:bg-amber-50 text-sm"
          >
            ใช้โลโก้เริ่มต้น
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-amber-700 hover:bg-amber-50">
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-md bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
