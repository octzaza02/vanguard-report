'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { listUsers, adminDeleteUser } from '@/lib/api'
import type { User } from '@/lib/types'
import { useSession } from '@/lib/session'
import FolderIcon from '@/components/FolderIcon'

export default function HomePage() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { session } = useSession()

  const reload = useCallback(() => {
    listUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ'))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleDeleteUser(u: User) {
    if (!session) return
    if (
      !confirm(
        `ลบบัญชี "${u.name}" ถาวร?\n\nข้อมูลงานแข่งและแมตช์ทั้งหมดของผู้ใช้นี้จะถูกลบไปด้วย และไม่สามารถกู้คืนได้`
      )
    )
      return
    setDeletingId(u.id)
    try {
      await adminDeleteUser(session.token, u.id)
      reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบไม่สำเร็จ')
    } finally {
      setDeletingId(null)
    }
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
          {users.map((u) => (
            <div
              key={u.id}
              className="group rounded-xl border border-amber-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-amber-400 transition"
            >
              <Link href={`/u/${encodeURIComponent(u.name)}`} className="flex items-center gap-3">
                <FolderIcon avatar={u.avatar} size={40} className="group-hover:bg-amber-100 transition" />
                <div>
                  <p className="font-medium text-amber-950">{u.name}</p>
                  {session?.name === u.name && <p className="text-xs text-amber-600">โฟลเดอร์ของฉัน</p>}
                </div>
              </Link>
              {session?.isAdmin && session.name !== u.name && (
                <div className="mt-3 border-t border-amber-100 pt-2">
                  <button
                    onClick={() => handleDeleteUser(u)}
                    disabled={deletingId === u.id}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    {deletingId === u.id ? 'กำลังลบ...' : '🗑 ลบบัญชีนี้ (แอดมิน)'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
