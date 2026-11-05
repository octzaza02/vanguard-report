'use client'

import { useEffect, useState } from 'react'
import { addFolderGroup, deleteFolderGroup, listFolderGroups } from '@/lib/api'
import type { FolderGroup } from '@/lib/types'
import { useSession } from '@/lib/session'

/**
 * Folder-group picker: the user's saved groups as chips (click to select),
 * an input + "เพิ่ม" button that saves a new group for reuse, and a manage
 * mode for removing groups from the saved list.
 */
export default function GroupPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const { session } = useSession()
  const [groups, setGroups] = useState<FolderGroup[] | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [managing, setManaging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    let cancelled = false
    listFolderGroups(session.userId)
      .then((g) => { if (!cancelled) setGroups(g) })
      .catch(() => { if (!cancelled) setGroups([]) })
    return () => { cancelled = true }
  }, [session])

  // A competition may carry a group that isn't in the saved list yet (e.g. older data).
  const names = groups?.map((g) => g.name) ?? []
  const shown = value && !names.includes(value) ? [...names, value] : names

  async function handleAdd() {
    const name = draft.trim()
    if (!name || !session) return
    setError(null)
    const existing = groups?.find((g) => g.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      onChange(existing.name)
      setDraft('')
      return
    }
    setBusy(true)
    try {
      const g = await addFolderGroup(session.token, name)
      setGroups((prev) => [...(prev ?? []), g])
      onChange(g.name)
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เพิ่มหมวดหมู่ไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(g: FolderGroup) {
    if (!session) return
    if (!confirm(`ลบหมวดหมู่ "${g.name}"?\nงานแข่งที่อยู่ในหมวดนี้จะถูกย้ายไป "ไม่มีหมวดหมู่"`)) return
    setError(null)
    try {
      await deleteFolderGroup(session.token, g.id)
      setGroups((prev) => (prev ?? []).filter((x) => x.id !== g.id))
      if (value === g.name) onChange('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบหมวดหมู่ไม่สำเร็จ')
    }
  }

  return (
    <div className="space-y-2">
      {groups === null && session && <p className="text-xs text-amber-500">กำลังโหลดหมวดหมู่...</p>}

      {shown.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {shown.map((name) => {
            const saved = groups?.find((g) => g.name === name)
            const selected = value === name
            return (
              <span key={name} className="relative">
                <button
                  type="button"
                  onClick={() => onChange(selected ? '' : name)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                    selected
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400'
                  } ${managing && saved ? 'pr-8' : ''}`}
                >
                  📁 {name}
                </button>
                {managing && saved && (
                  <button
                    type="button"
                    onClick={() => handleDelete(saved)}
                    title="ลบหมวดหมู่นี้"
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-xs transition ${
                      selected ? 'text-white hover:bg-white/20' : 'text-amber-400 hover:bg-red-50 hover:text-red-500'
                    }`}
                  >
                    ✕
                  </button>
                )}
              </span>
            )
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          maxLength={60}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
          }}
          placeholder="พิมพ์ชื่อหมวดหมู่ใหม่"
          className="w-full rounded-md border border-amber-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy || !draft.trim()}
          className="shrink-0 rounded-md bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-500 disabled:opacity-50 transition"
        >
          {busy ? '...' : '+ เพิ่ม'}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-amber-500">
          {shown.length > 0
            ? 'กดเลือกหมวดหมู่ที่บันทึกไว้ หรือเพิ่มใหม่ — หมวดหมู่จะถูกจำไว้ใช้ครั้งต่อไป'
            : 'ยังไม่มีหมวดหมู่ — เพิ่มหมวดแรกได้เลย ระบบจะจำไว้ใช้ครั้งต่อไป'}
        </p>
        {groups && groups.length > 0 && (
          <button
            type="button"
            onClick={() => setManaging((m) => !m)}
            className="shrink-0 text-xs text-amber-600 hover:underline"
          >
            {managing ? 'เสร็จสิ้น' : 'จัดการ'}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
