'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/api'
import { saveSession } from '@/lib/session'

export default function LoginPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('กรุณากรอกชื่อ')
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN ต้องเป็นตัวเลข 4 หลัก')
      return
    }

    setLoading(true)
    try {
      const session = await login(name.trim(), pin)
      saveSession(session)
      router.push(`/u/${encodeURIComponent(session.name)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <h1 className="text-2xl font-semibold mb-1">เข้าสู่ระบบ</h1>
      <p className="text-sm text-amber-700 mb-6">
        กรอกชื่อและ PIN 4 หลัก — ถ้ายังไม่มีบัญชี ระบบจะสร้างให้อัตโนมัติด้วยชื่อและ PIN ที่กรอก
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-amber-200 rounded-xl p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">ชื่อ</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-amber-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Handle name (ชื่อที่ใช้แข่ง)"
            autoComplete="username"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">PIN (ตัวเลข 4 หลัก)</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="w-full rounded-md border border-amber-300 px-3 py-2 tracking-[0.5em] text-center font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="••••"
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-amber-600 text-white py-2 font-medium hover:bg-amber-500 transition disabled:opacity-50"
        >
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ / สมัครสมาชิก'}
        </button>
      </form>
    </div>
  )
}
