'use client'

import { useCallback, useEffect, useState } from 'react'
import Modal from './Modal'
import FolderIcon from './FolderIcon'
import { listUsers, adminDeleteUser } from '@/lib/api'
import type { Session, User } from '@/lib/types'

export default function AdminManageUsersModal({ session, onClose }: { session: Session; onClose: () => void }) {
  const [users, setUsers] = useState<User[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>('')
  const [deleting, setDeleting] = useState(false)

  const reload = useCallback(() => {
    listUsers()
      .then((list) => {
        const others = list.filter((u) => u.id !== session.userId)
        setUsers(others)
        setSelectedId((prev) => (others.some((u) => u.id === prev) ? prev : (others[0]?.id ?? '')))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ'))
  }, [session.userId])

  useEffect(() => {
    reload()
  }, [reload])

  const selected = users?.find((u) => u.id === selectedId) ?? null

  async function handleDelete() {
    if (!selected) return
    if (
      !confirm(
        `ลบบัญชี "${selected.name}" ถาวร?\n\nข้อมูลงานแข่งและแมตช์ทั้งหมดของผู้ใช้นี้จะถูกลบไปด้วย และไม่สามารถกู้คืนได้`
      )
    )
      return
    setDeleting(true)
    try {
      await adminDeleteUser(session.token, selected.id)
      reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบไม่สำเร็จ')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal title="จัดการผู้ใช้งาน" onClose={onClose}>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!users && !error && <p className="text-sm text-amber-600">กำลังโหลด...</p>}

        {users && users.length === 0 && (
          <p className="text-sm text-amber-600">ไม่มีผู้ใช้งานอื่นให้จัดการ</p>
        )}

        {users && users.length > 0 && (
          <>
            <div>
              <label className="block text-xs font-medium text-amber-700 mb-1.5">เลือกผู้ใช้งาน</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full rounded-md border border-amber-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {selected && (
              <div className="flex items-center gap-3 rounded-lg border border-amber-100 p-3">
                <FolderIcon avatar={selected.avatar} size={40} />
                <p className="font-medium text-amber-950">{selected.name}</p>
              </div>
            )}

            <div className="border-t border-amber-100 pt-3 flex justify-end">
              <button
                onClick={handleDelete}
                disabled={!selected || deleting}
                className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? 'กำลังลบ...' : 'ลบบัญชีผู้ใช้นี้'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
