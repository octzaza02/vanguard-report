'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { listBoardPosts, createBoardPost } from '@/lib/api'
import type { BoardPost } from '@/lib/types'
import { useSession } from '@/lib/session'
import BoardComposer from '@/components/BoardComposer'
import BoardPostCard from '@/components/BoardPostCard'

export default function BoardPage() {
  const { session, ready } = useSession()
  const [posts, setPosts] = useState<BoardPost[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setPosts(await listBoardPosts())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ')
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // Top-level posts newest-first; replies grouped by parent, oldest-first.
  const { topLevel, repliesByParent } = useMemo(() => {
    const all = posts ?? []
    const map = new Map<string, BoardPost[]>()
    for (const p of all) {
      if (p.parent_id) {
        const arr = map.get(p.parent_id) ?? []
        arr.push(p)
        map.set(p.parent_id, arr)
      }
    }
    const tops = all.filter((p) => !p.parent_id).reverse()
    return { topLevel: tops, repliesByParent: map }
  }, [posts])

  async function handleCreate(content: string, image: string | null) {
    if (!session) return
    await createBoardPost(session.token, { content, image })
    await reload()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Discussion Board</h1>
      </div>

      {/* Composer */}
      {ready &&
        (session ? (
          <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
            <BoardComposer onSubmit={handleCreate} placeholder="แชร์อะไรกับเพื่อนๆ..." submitLabel="โพสต์" />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-amber-300 p-6 text-center text-amber-600">
            <Link href="/login" className="underline font-medium">
              เข้าสู่ระบบ
            </Link>{' '}
            เพื่อร่วมพูดคุยและโพสต์ข้อความ
          </div>
        ))}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {!posts && !error && <p className="text-sm text-amber-600">กำลังโหลด...</p>}

      {posts && topLevel.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-amber-300 p-8 text-center text-amber-600">
          ยังไม่มีข้อความ — เริ่มพูดคุยเป็นคนแรกได้เลย
        </div>
      )}

      {posts && topLevel.length > 0 && (
        <div className="space-y-4">
          {topLevel.map((post) => (
            <BoardPostCard
              key={post.id}
              post={post}
              replies={repliesByParent.get(post.id) ?? []}
              session={session}
              onChanged={reload}
              onOpenImage={setLightboxSrc}
            />
          ))}
        </div>
      )}

      {/* Image lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxSrc(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt="ขยายรูป"
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
