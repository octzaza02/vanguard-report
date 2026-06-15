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
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    if (session) await logout(session.token).catch(() => {})
    clearSession()
    router.push('/login')
    setMenuOpen(false)
  }

  return (
    <header className="border-b border-amber-200 bg-white sticky top-0 z-40">
      <div className="w-full max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="font-semibold text-base sm:text-lg tracking-tight shrink-0 leading-tight">
          Player Card Battle Report
        </Link>

        {ready && (
          <>
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-3 text-sm">
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

            {/* Mobile: login button or hamburger */}
            <div className="md:hidden flex items-center gap-2">
              {!session && (
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-500 transition"
                >
                  เข้าสู่ระบบ
                </Link>
              )}
              {session && (
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="เมนู"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-amber-200 text-amber-700 hover:bg-amber-50 transition text-lg"
                >
                  {menuOpen ? '✕' : '☰'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Mobile dropdown */}
      {menuOpen && session && (
        <div className="md:hidden border-t border-amber-100 bg-white px-4 pt-3 pb-4 flex flex-col gap-2 text-sm shadow-md">
          <p className="text-amber-600 text-xs">สวัสดี, <span className="font-medium text-amber-950">{session.name}</span></p>
          <Link
            href={`/u/${encodeURIComponent(session.name)}`}
            onClick={() => setMenuOpen(false)}
            className="px-3 py-2 rounded-md bg-amber-50 hover:bg-amber-100 transition"
          >
            📁 โฟลเดอร์ของฉัน
          </Link>
          {session.isAdmin && (
            <button
              onClick={() => { setShowManageUsers(true); setMenuOpen(false) }}
              className="px-3 py-2 rounded-md bg-amber-50 hover:bg-amber-100 transition text-left"
            >
              ⚙️ จัดการผู้ใช้งาน
            </button>
          )}
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-md bg-amber-600 text-white hover:bg-amber-500 transition text-left"
          >
            ออกจากระบบ
          </button>
        </div>
      )}

      {showManageUsers && session && (
        <AdminManageUsersModal session={session} onClose={() => setShowManageUsers(false)} />
      )}
    </header>
  )
}
