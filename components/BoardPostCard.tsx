'use client'

import { useState } from 'react'
import FolderIcon from './FolderIcon'
import BoardComposer from './BoardComposer'
import { createBoardPost, updateBoardPost, deleteBoardPost } from '@/lib/api'
import type { BoardPost, Session } from '@/lib/types'

function formatTime(ts: string) {
  const d = new Date(ts)
  return d.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function BoardItem({
  item,
  session,
  onChanged,
  onOpenImage,
  compact = false,
}: {
  item: BoardPost
  session: Session | null
  onChanged: () => Promise<void>
  onOpenImage: (src: string) => void
  compact?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const isOwner = session?.userId === item.user_id
  const canDelete = isOwner || !!session?.isAdmin

  async function handleEdit(content: string, image: string | null) {
    if (!session) return
    await updateBoardPost(session.token, item.id, { content, image })
    setEditing(false)
    await onChanged()
  }

  async function handleDelete() {
    if (!session) return
    if (!confirm('ลบข้อความนี้?')) return
    try {
      await deleteBoardPost(session.token, item.id)
      await onChanged()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบไม่สำเร็จ')
    }
  }

  return (
    <div className="flex gap-3">
      <FolderIcon avatar={item.author_avatar} size={compact ? 32 : 40} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium text-amber-950">{item.author_name}</span>
          <span className="text-xs text-amber-500">{formatTime(item.created_at)}</span>
          {item.edited && <span className="text-xs text-amber-400">(แก้ไขแล้ว)</span>}
        </div>

        {editing ? (
          <div className="mt-2">
            <BoardComposer
              initialContent={item.content ?? ''}
              initialImage={item.image}
              submitLabel="บันทึก"
              autoFocus
              clearOnSubmit={false}
              onSubmit={handleEdit}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <>
            {item.content && (
              <p className="mt-0.5 text-sm text-amber-900 whitespace-pre-wrap break-words">{item.content}</p>
            )}
            {item.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt="รูปแนบ"
                onClick={() => onOpenImage(item.image!)}
                className="mt-2 max-h-72 rounded-lg border border-amber-200 object-cover cursor-zoom-in hover:opacity-90 transition"
              />
            )}
            {(isOwner || canDelete) && (
              <div className="mt-1.5 flex gap-3 text-xs">
                {isOwner && (
                  <button onClick={() => setEditing(true)} className="text-amber-600 hover:underline">
                    แก้ไข
                  </button>
                )}
                {canDelete && (
                  <button onClick={handleDelete} className="text-red-500 hover:underline">
                    ลบ
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function BoardPostCard({
  post,
  replies,
  session,
  onChanged,
  onOpenImage,
}: {
  post: BoardPost
  replies: BoardPost[]
  session: Session | null
  onChanged: () => Promise<void>
  onOpenImage: (src: string) => void
}) {
  const [replying, setReplying] = useState(false)

  async function handleReply(content: string, image: string | null) {
    if (!session) return
    await createBoardPost(session.token, { content, image, parentId: post.id })
    setReplying(false)
    await onChanged()
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
      <BoardItem item={post} session={session} onChanged={onChanged} onOpenImage={onOpenImage} />

      {replies.length > 0 && (
        <div className="mt-4 space-y-4 border-l-2 border-amber-100 pl-4">
          {replies.map((r) => (
            <BoardItem key={r.id} item={r} session={session} onChanged={onChanged} onOpenImage={onOpenImage} compact />
          ))}
        </div>
      )}

      {session && (
        <div className="mt-3 pl-1">
          {replying ? (
            <div className="mt-2">
              <BoardComposer
                placeholder={`ตอบกลับ ${post.author_name}...`}
                submitLabel="ตอบกลับ"
                autoFocus
                onSubmit={handleReply}
                onCancel={() => setReplying(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setReplying(true)}
              className="text-xs font-medium text-amber-600 hover:text-amber-900"
            >
              💬 ตอบกลับ
            </button>
          )}
        </div>
      )}
    </div>
  )
}
