'use client'

import { useRef, useState } from 'react'
import { resizeToDataUrl } from '@/lib/image'

export default function BoardComposer({
  onSubmit,
  submitLabel = 'โพสต์',
  placeholder = 'เขียนข้อความ...',
  initialContent = '',
  initialImage = null,
  onCancel,
  autoFocus = false,
  clearOnSubmit = true,
}: {
  onSubmit: (content: string, image: string | null) => Promise<void>
  submitLabel?: string
  placeholder?: string
  initialContent?: string
  initialImage?: string | null
  onCancel?: () => void
  autoFocus?: boolean
  clearOnSubmit?: boolean
}) {
  const [content, setContent] = useState(initialContent)
  const [image, setImage] = useState<string | null>(initialImage)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      setImage(await resizeToDataUrl(file, 1000, 0.8))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปโหลดรูปไม่สำเร็จ')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function submit() {
    setError(null)
    if (!content.trim() && !image) {
      setError('กรุณาพิมพ์ข้อความหรือแนบรูป')
      return
    }
    setBusy(true)
    try {
      await onSubmit(content.trim(), image)
      if (clearOnSubmit) {
        setContent('')
        setImage(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={content}
        autoFocus={autoFocus}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      />

      {image && (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="แนบรูป" className="max-h-40 rounded-md border border-amber-300 object-contain" />
          <button
            type="button"
            onClick={() => setImage(null)}
            className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:border-red-400 transition"
          >
            ลบรูป
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="cursor-pointer rounded-md border border-amber-300 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50 hover:border-amber-400 transition">
          📷 photo
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1.5 rounded-md text-amber-700 hover:bg-amber-50 text-sm"
            >
              ยกเลิก
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="px-4 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 text-sm font-medium"
          >
            {busy ? 'กำลังบันทึก...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
