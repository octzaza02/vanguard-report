// Match video attachments: either a file uploaded to Supabase Storage
// (via the signed-URL route in app/api/match-video) or an external link
// (YouTube / Google Drive / any URL). Stored in match.extra[MATCH_VIDEO_KEY].

export const MATCH_VIDEO_KEY = '__video'
export const MATCH_VIDEO_BUCKET = 'match-videos'
export const MATCH_VIDEO_MAX_BYTES = 50 * 1024 * 1024
export const MATCH_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

const STORAGE_MARKER = `/storage/v1/object/public/${MATCH_VIDEO_BUCKET}/`

/** Object path inside the bucket if the URL is one of our uploaded files, else null. */
export function storagePathFromUrl(url: string): string | null {
  const i = url.indexOf(STORAGE_MARKER)
  return i === -1 ? null : decodeURIComponent(url.slice(i + STORAGE_MARKER.length).split('?')[0])
}

/** Embeddable player URL for YouTube / Google Drive links, else null. */
export function embedUrl(url: string): string | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  const host = u.hostname.replace(/^www\.|^m\./, '')
  if (host === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`
  if (host === 'youtube.com') {
    const id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/)?.[1]
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  if (host === 'drive.google.com') {
    const id = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? u.searchParams.get('id')
    return id ? `https://drive.google.com/file/d/${id}/preview` : null
  }
  return null
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export function validateVideoFile(file: File): string | null {
  if (!MATCH_VIDEO_TYPES.includes(file.type)) return 'รองรับเฉพาะไฟล์ MP4, WebM หรือ MOV'
  if (file.size > MATCH_VIDEO_MAX_BYTES) return `ไฟล์ใหญ่ ${(file.size / 1024 / 1024).toFixed(1)}MB เกินขีดจำกัด 50MB`
  return null
}

async function apiError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => null)
  return new Error(body?.error ?? `เกิดข้อผิดพลาด (${res.status})`)
}

/** Uploads a video file and resolves to its public URL. */
export async function uploadMatchVideo(
  token: string,
  file: File,
  onProgress?: (fraction: number) => void
): Promise<string> {
  const res = await fetch('/api/match-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, contentType: file.type, size: file.size }),
  })
  if (!res.ok) throw await apiError(res)
  const { signedUrl, publicUrl } = (await res.json()) as { signedUrl: string; publicUrl: string }

  // XHR (not fetch) so we can report upload progress for large files.
  const form = new FormData()
  form.append('cacheControl', '3600')
  form.append('', file)
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`อัปโหลดไม่สำเร็จ (${xhr.status})`))
    xhr.onerror = () => reject(new Error('อัปโหลดไม่สำเร็จ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'))
    xhr.send(form)
  })
  return publicUrl
}

/** Best-effort removal of an uploaded video; ignores external links. */
export async function deleteMatchVideo(token: string, url: string): Promise<void> {
  const path = storagePathFromUrl(url)
  if (!path) return
  const res = await fetch('/api/match-video', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, path }),
  })
  if (!res.ok) throw await apiError(res)
}
