'use client'

import { useState } from 'react'
import Modal from './Modal'
import FolderIcon from './FolderIcon'
import ProfileCardForm from './ProfileCardForm'
import type { ProfileCard, User } from '@/lib/types'
import type { ProfileCardInput } from '@/lib/api'

export default function ProfileCardModal({
  user,
  card,
  isOwner,
  onClose,
  onSave,
}: {
  user: User
  card: ProfileCard | null
  isOwner: boolean
  onClose: () => void
  onSave: (input: ProfileCardInput) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <ProfileCardForm
        initial={card}
        onSubmit={onSave}
        onClose={() => setEditing(false)}
      />
    )
  }

  return (
    <Modal title="นามบัตรแนะนำตัว" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <FolderIcon avatar={user.avatar} size={48} />
          <div>
            <p className="font-medium text-amber-950">{user.name}</p>
          </div>
        </div>

        {card?.tagline && <p className="text-sm text-amber-900 whitespace-pre-wrap break-words">{card.tagline}</p>}

        {card && card.links.length > 0 && (
          <div>
            <p className="text-xs font-medium text-amber-700 mb-1.5">ลิงก์ติดต่อ</p>
            <div className="flex flex-wrap gap-2">
              {card.links.map((l, idx) => (
                <a
                  key={idx}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm rounded-full border border-amber-300 px-3 py-1 text-amber-700 hover:bg-amber-50 transition"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {card && Object.keys(card.extra ?? {}).length > 0 && (
          <div>
            <p className="text-xs font-medium text-amber-700 mb-1.5">ข้อมูลเพิ่มเติม</p>
            <dl className="space-y-1">
              {Object.entries(card.extra).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-sm">
                  <dt className="text-amber-600 shrink-0">{key}:</dt>
                  <dd className="text-amber-900 break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {!card && <p className="text-sm text-amber-600">ยังไม่มีข้อมูลแนะนำตัว</p>}

        {isOwner && (
          <div className="border-t border-amber-100 pt-3 flex justify-end">
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-500"
            >
              {card ? 'แก้ไขนามบัตร' : '+ สร้างนามบัตร'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
