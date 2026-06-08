'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, clearSession } from '@/lib/session'
import { logout } from '@/lib/api'
import AdminManageUsersModal from './AdminManageUsersModal'

export default function NavBar() {
  const { session, ready } = useSession()
  const router = useRouter()
  const [showManageUsers, setShowManageUsers] = useState(false)

  async function handleLogout() {
    if (session) await logout(session.token).catch(() => {})
    clearSession()
    router.push('/login')
  }

  return (
    <header className="border-b border-amber-200 bg-white">
      <div className="w-full max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          🏆 สถิติการแข่งขัน
        </Link>
        {ready && (
          <nav className="flex items-center gap-3 text-sm">
            {session ? (
              <>
                <span className="text-amber-700">
                  สวัสดี, <span className="font-medium text-amber-950">{session.name}</span>
                </span>
                <Link
                  href={`/u/${encodeURIComponent(session.name)}`}
                  className="px-3 py-1.5 rounded-md bg-amber-50 hover:bg-amber-100 transition"
                >
                  โฟลเดอร์ของฉัน
                </Link>
                {session.isAdmin && (
                  <button
                    onClick={() => setShowManageUsers(true)}
                    className="px-3 py-1.5 rounded-md bg-amber-50 hover:bg-amber-100 transition"
                  >
                    จัดการผู้ใช้งาน
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-500 transition"
                >
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-500 transition"
              >
                เข้าสู่ระบบ
              </Link>
            )}
          </nav>
        )}
      </div>
      {showManageUsers && session && (
        <AdminManageUsersModal session={session} onClose={() => setShowManageUsers(false)} />
      )}
    </header>
  )
}
