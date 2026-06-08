'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { listUsers, listProfileCards, upsertProfileCard } from '@/lib/api'
import type { ProfileCard, User } from '@/lib/types'
import { useSession } from '@/lib/session'
import FolderIcon from '@/components/FolderIcon'
import ProfileCardModal from '@/components/ProfileCardModal'

export default function HomePage() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [cards, setCards] = useState<Record<string, ProfileCard>>({})
  const [error, setError] = useState<string | null>(null)
  const [cardUser, setCardUser] = useState<User | null>(null)
  const { session } = useSession()

  const reload = useCallback(() => {
    listUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ'))
    listProfileCards()
      .then((list) => setCards(Object.fromEntries(list.map((c) => [c.user_id, c]))))
      .catch(() => {
        /* profile cards are optional — ignore load errors silently */
      })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleSaveProfileCard(input: Parameters<typeof upsertProfileCard>[1]) {
    if (!session) return
    const saved = await upsertProfileCard(session.token, input)
    setCards((c) => ({ ...c, [saved.user_id]: saved }))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">โฟลเดอร์ผู้เล่น</h1>
        <p className="text-sm text-amber-700">
          เลือกดูสถิติการแข่งขันของแต่ละคน — ใครๆ ก็ดูได้ แต่แก้ไขได้เฉพาะข้อมูลของตัวเอง
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!users && !error && <p className="text-sm text-amber-600">กำลังโหลด...</p>}

      {users && users.length === 0 && (
        <div className="rounded-xl border border-dashed border-amber-300 p-8 text-center text-amber-600">
          ยังไม่มีผู้เล่นในระบบ — <Link href="/login" className="underline">เข้าสู่ระบบ</Link> เพื่อเริ่มสร้างบัญชีแรก
        </div>
      )}

      {users && users.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {users.map((u) => {
            const isOwner = session?.name === u.name
            const card = cards[u.id] ?? null
            const showCardButton = isOwner || card !== null
            return (
              <div
                key={u.id}
                className="group rounded-xl border border-amber-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-amber-400 transition"
              >
                <Link href={`/u/${encodeURIComponent(u.name)}`} className="flex items-center gap-3">
                  <FolderIcon avatar={u.avatar} size={40} className="group-hover:bg-amber-100 transition" />
                  <div>
                    <p className="font-medium text-amber-950">{u.name}</p>
                    {isOwner && <p className="text-xs text-amber-600">โฟลเดอร์ของฉัน</p>}
                  </div>
                </Link>

                <div className="mt-3 border-t border-amber-100 pt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/u/${encodeURIComponent(u.name)}`}
                    className="text-xs font-medium text-amber-700 border border-amber-300 rounded-full px-3 py-1 hover:bg-amber-50 hover:border-amber-400 transition"
                  >
                    ไปที่โฟลเดอร์
                  </Link>
                  {showCardButton && (
                    <button
                      onClick={() => setCardUser(u)}
                      className="text-xs font-medium text-amber-700 border border-amber-300 rounded-full px-3 py-1 hover:bg-amber-50 hover:border-amber-400 transition"
                    >
                      {card ? 'นามบัตรแนะนำตัว' : '+ สร้างนามบัตรแนะนำตัว'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {cardUser && (
        <ProfileCardModal
          user={cardUser}
          card={cards[cardUser.id] ?? null}
          isOwner={session?.name === cardUser.name}
          onClose={() => setCardUser(null)}
          onSave={handleSaveProfileCard}
        />
      )}
    </div>
  )
}
