'use client'

import { useEffect, useMemo, useState } from 'react'
import MatchVideoPlayer from './MatchVideoPlayer'
import { MATCH_VIDEO_TYPES, isHttpUrl, validateVideoFile } from '@/lib/video'

// 'saved' = an existing URL (uploaded file or pasted link, possibly empty);
// 'file' = a local file picked but not uploaded yet (uploaded on save).
export type VideoDraft = { kind: 'saved'; url: string } | { kind: 'file'; file: File }

export default function MatchVideoField({
  value,
  onChange,
  disabled,
}: {
  value: VideoDraft
  onChange: (v: VideoDraft) => void
  disabled?: boolean
}) {
  const [mode, setMode] = useState<'file' | 'link'>('file')
  const [linkText, setLinkText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const localUrl = useMemo(() => (value.kind === 'file' ? URL.createObjectURL(value.file) : null), [value])
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl) }, [localUrl])

  function pickFile(file: File | undefined) {
    if (!file) return
    const problem = validateVideoFile(file)
    setError(problem)
    if (!problem) onChange({ kind: 'file', file })
  }

  function applyLink() {
    const url = linkText.trim()
    if (!isHttpUrl(url)) {
      setError('ลิงก์ไม่ถูกต้อง ต้องขึ้นต้นด้วย https://')
      return
    }
    setError(null)
    setLinkText('')
    onChange({ kind: 'saved', url })
  }

  function clear() {
    setError(null)
    onChange({ kind: 'saved', url: '' })
  }

  const hasVideo = value.kind === 'file' || value.url !== ''

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 space-y-3">
      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">วิดีโอแมตช์</p>

      {hasVideo ? (
        <div className="space-y-2">
          {value.kind === 'file' ? (
            <>
              <video src={localUrl ?? undefined} controls preload="metadata" playsInline className="w-full max-h-64 rounded-lg bg-black" />
              <p className="text-xs text-amber-600">
                {value.file.name} · {(value.file.size / 1024 / 1024).toFixed(1)}MB — จะอัปโหลดเมื่อกดบันทึก
              </p>
            </>
          ) : (
            <MatchVideoPlayer url={value.url} />
          )}
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
          >
            ลบวิดีโอ
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            {(
              [
                { v: 'file', label: 'อัปโหลดไฟล์' },
                { v: 'link', label: 'วางลิงก์' },
              ] as const
            ).map(({ v, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => { setMode(v); setError(null) }}
                className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                  mode === v
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'file' ? (
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed border-amber-300 bg-white px-3 py-4 text-center hover:bg-amber-50 transition">
              <span className="text-sm font-medium text-amber-800">🎬 เลือกไฟล์วิดีโอ</span>
              <span className="text-xs text-amber-500">MP4, WebM หรือ MOV ไม่เกิน 50MB</span>
              <input
                type="file"
                accept={MATCH_VIDEO_TYPES.join(',')}
                className="hidden"
                disabled={disabled}
                onChange={(e) => {
                  pickFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
          ) : (
            <div className="flex gap-2">
              <input
                type="url"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    applyLink()
                  }
                }}
                placeholder="ลิงก์ YouTube / Google Drive"
                className="flex-1 min-w-0 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={applyLink}
                className="shrink-0 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 transition"
              >
                แนบ
              </button>
            </div>
          )}
        </>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
