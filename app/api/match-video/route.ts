// Issues signed upload URLs for match videos and deletes replaced ones.
// Runs server-side with the service role key so the storage bucket needs no
// anon write policies; callers are authenticated with the app session token.

import { createClient } from '@supabase/supabase-js'
import { MATCH_VIDEO_BUCKET, MATCH_VIDEO_MAX_BYTES, MATCH_VIDEO_TYPES } from '@/lib/video'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

async function sessionUser(admin: ReturnType<typeof adminClient>, token: unknown): Promise<string | null> {
  if (typeof token !== 'string' || !token) return null
  const { data, error } = await admin.rpc('_session_user', { p_token: token })
  if (error || typeof data !== 'string') return null
  return data
}

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

const EXT: Record<string, string> = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' }

export async function POST(request: Request) {
  let admin
  try {
    admin = adminClient()
  } catch (e) {
    return fail((e as Error).message, 500)
  }
  const body = await request.json().catch(() => null)
  const userId = await sessionUser(admin, body?.token)
  if (!userId) return fail('session หมดอายุ กรุณาเข้าสู่ระบบใหม่', 401)

  const contentType = String(body?.contentType ?? '')
  const size = Number(body?.size ?? 0)
  if (!MATCH_VIDEO_TYPES.includes(contentType)) return fail('รองรับเฉพาะไฟล์ MP4, WebM หรือ MOV', 400)
  if (!(size > 0) || size > MATCH_VIDEO_MAX_BYTES) return fail('ไฟล์วิดีโอต้องไม่เกิน 50MB', 400)

  const path = `${userId}/${crypto.randomUUID()}.${EXT[contentType]}`
  const bucket = admin.storage.from(MATCH_VIDEO_BUCKET)
  const { data, error } = await bucket.createSignedUploadUrl(path)
  if (error || !data) return fail(error?.message ?? 'สร้างลิงก์อัปโหลดไม่สำเร็จ', 500)

  return Response.json({
    signedUrl: data.signedUrl,
    publicUrl: bucket.getPublicUrl(path).data.publicUrl,
  })
}

export async function DELETE(request: Request) {
  let admin
  try {
    admin = adminClient()
  } catch (e) {
    return fail((e as Error).message, 500)
  }
  const body = await request.json().catch(() => null)
  const userId = await sessionUser(admin, body?.token)
  if (!userId) return fail('session หมดอายุ กรุณาเข้าสู่ระบบใหม่', 401)

  const path = String(body?.path ?? '')
  // Users may only delete files inside their own folder.
  if (!path.startsWith(`${userId}/`) || path.includes('..')) return fail('ไม่มีสิทธิ์ลบไฟล์นี้', 403)

  const { error } = await admin.storage.from(MATCH_VIDEO_BUCKET).remove([path])
  if (error) return fail(error.message, 500)
  return Response.json({ ok: true })
}
