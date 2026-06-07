'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getUser, listCompetitions, createCompetition, updateCompetition, deleteCompetition, updateAvatar, type CompetitionInput } from '@/lib/api'
import type { Competition, User } from '@/lib/types'
import { useSession } from '@/lib/session'
import CompetitionForm from '@/components/CompetitionForm'
import FolderIcon from '@/components/FolderIcon'
import AvatarEditor from '@/components/AvatarEditor'

export default function UserFolderPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params)
  const decodedName = decodeURIComponent(name)
  const { session } = useSession()
  const isOwner = session?.name === decodedName

  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [competitions, setCompetitions] = useState<Competition[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Competition | null>(null)
  const [showAvatarEditor, setShowAvatarEditor] = useState(false)

  const reload = useCallback(async () => {
    try {
      const u = await getUser(decodedName)
      setUser(u)
      if (u) setCompetitions(await listCompetitions(u.id))
      else setCompetitions([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ')
    }
  }, [decodedName])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleCreate(fields: CompetitionInput) {
    if (!session) throw new Error('กรุณาเข้าสู่ระบบ')
    await createCompetition(session.token, fields)
    await reload()
  }

  async function handleUpdate(fields: CompetitionInput) {
    if (!session || !editing) throw new Error('กรุณาเข้าสู่ระบบ')
    await updateCompetition(session.token, editing.id, fields)
    setEditing(null)
    await reload()
  }

  async function handleAvatarSave(avatar: string | null) {
    if (!session) throw new Error('กรุณาเข้าสู่ระบบ')
    const updated = await updateAvatar(session.token, avatar)
    setUser((u) => (u ? { ...u, avatar: updated.avatar } : u))
  }

  async function handleDelete(id: string) {
    if (!session) return
    if (!confirm('ลบงานแข่งนี้และแมตช์ทั้งหมดในงาน?')) return
    try {
      await deleteCompetition(session.token, id)
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบไม่สำเร็จ')
    }
  }

  if (user === null) {
    return (
      <div className="text-center text-amber-600 py-16">
        <p>ไม่พบผู้ใช้ชื่อ &ldquo;{decodedName}&rdquo;</p>
        <Link href="/" className="underline text-sm">กลับหน้าแรก</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <FolderIcon avatar={user?.avatar} size={48} />
            {isOwner && (
              <button
                onClick={() => setShowAvatarEditor(true)}
                title="แก้ไขโลโก้โฟลเดอร์"
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white text-xs leading-none border-2 border-white hover:bg-amber-500 transition"
              >
                ✎
              </button>
            )}
          </div>
          <div>
            <p className="text-sm text-amber-600">โฟลเดอร์ของ</p>
            <h1 className="text-2xl font-semibold">{decodedName}</h1>
          </div>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-500 transition"
          >
            + สร้างงานแข่งใหม่
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!competitions && !error && <p className="text-sm text-amber-600">กำลังโหลด...</p>}

      {competitions && competitions.length === 0 && (
        <div className="rounded-xl border border-dashed border-amber-300 p-8 text-center text-amber-600">
          {isOwner ? 'ยังไม่มีงานแข่ง — สร้างงานแข่งแรกของคุณได้เลย' : 'ผู้ใช้นี้ยังไม่มีงานแข่งที่บันทึกไว้'}
        </div>
      )}

      {competitions && competitions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {competitions.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-amber-400 transition"
            >
              <Link href={`/u/${encodeURIComponent(decodedName)}/${c.id}`} className="flex gap-3">
                {c.decklog_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.decklog_image}
                    alt="Decklog"
                    className="h-14 w-14 rounded-md border border-amber-200 object-cover shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-amber-950">{c.name}</p>
                  <p className="text-sm text-amber-600 mt-1">
                    {[c.game, c.category].filter(Boolean).join(' · ') || 'ไม่ระบุเกม/ประเภท'}
                  </p>
                  {c.decklog && <p className="text-xs text-amber-500 mt-1 truncate">Decklog: {c.decklog}</p>}
                </div>
              </Link>
              {isOwner && (
                <div className="mt-3 flex gap-3 text-xs">
                  <button onClick={() => setEditing(c)} className="text-amber-700 hover:underline">
                    แก้ไข
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:underline">
                    ลบ
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CompetitionForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
      {editing && (
        <CompetitionForm initial={editing} onSubmit={handleUpdate} onClose={() => setEditing(null)} />
      )}

      {showAvatarEditor && (
        <AvatarEditor
          current={user?.avatar ?? null}
          onSave={handleAvatarSave}
          onClose={() => setShowAvatarEditor(false)}
        />
      )}
    </div>
  )
}
