'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  getCompetition,
  listMatches,
  createMatch,
  updateMatch,
  deleteMatch,
  type MatchInput,
} from '@/lib/api'
import type { Competition, Match } from '@/lib/types'
import { useSession } from '@/lib/session'
import StatsSummary from '@/components/StatsSummary'
import StatsCharts from '@/components/StatsCharts'
import MatchTable from '@/components/MatchTable'
import MatchForm from '@/components/MatchForm'
import { buildCompetitionShareImage, downloadDataUrl } from '@/lib/shareCard'

export default function CompetitionPage({
  params,
}: {
  params: Promise<{ name: string; competitionId: string }>
}) {
  const { name, competitionId } = use(params)
  const decodedName = decodeURIComponent(name)
  const { session } = useSession()
  const isOwner = session?.name === decodedName

  const [competition, setCompetition] = useState<Competition | null | undefined>(undefined)
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Match | null>(null)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [sharePreview, setSharePreview] = useState<{ url: string; filename: string } | null>(null)

  const reload = useCallback(async () => {
    try {
      const c = await getCompetition(competitionId)
      setCompetition(c)
      if (c) setMatches(await listMatches(c.id))
      else setMatches([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ')
    }
  }, [competitionId])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleCreateMatch(input: MatchInput) {
    if (!session) throw new Error('กรุณาเข้าสู่ระบบ')
    await createMatch(session.token, competitionId, input)
    await reload()
  }

  async function handleUpdateMatch(input: MatchInput) {
    if (!session || !editing) throw new Error('กรุณาเข้าสู่ระบบ')
    await updateMatch(session.token, editing.id, input)
    setEditing(null)
    await reload()
  }

  async function handleShare() {
    if (!competition) return
    setShareError(null)
    setSharing(true)
    try {
      const dataUrl = await buildCompetitionShareImage(competition, matches ?? [], decodedName)
      const safeName = competition.name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'competition'
      setSharePreview({ url: dataUrl, filename: `${safeName}-stats.jpg` })
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'สร้างรูปไม่สำเร็จ')
    } finally {
      setSharing(false)
    }
  }

  function handleConfirmShareSave() {
    if (!sharePreview) return
    downloadDataUrl(sharePreview.url, sharePreview.filename)
    setSharePreview(null)
  }

  async function handleDeleteMatch(m: Match) {
    if (!session) return
    if (!confirm('ลบแมตช์นี้?')) return
    try {
      await deleteMatch(session.token, m.id)
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบไม่สำเร็จ')
    }
  }

  if (competition === null) {
    return (
      <div className="text-center text-amber-600 py-16">
        <p>ไม่พบงานแข่งนี้</p>
        <Link href={`/u/${encodeURIComponent(decodedName)}`} className="underline text-sm">
          กลับไปที่โฟลเดอร์ของ {decodedName}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/u/${encodeURIComponent(decodedName)}`} className="text-sm text-amber-600 hover:underline">
          ← {decodedName}
        </Link>
        <div className="mt-1 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{competition?.name ?? '...'}</h1>
            {competition && (
              <p className="text-sm text-amber-600 mt-0.5">
                {[competition.game, competition.category].filter(Boolean).join(' · ') || 'ไม่ระบุเกม/ประเภท'}
              </p>
            )}
            {competition && (competition.decklog || competition.decklog_image) && (
              <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-3">
                {competition.decklog_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={competition.decklog_image}
                    alt="Decklog"
                    className="max-h-40 rounded-md border border-amber-300 object-contain shrink-0"
                  />
                )}
                {competition.decklog && (
                  <div className="min-w-0">
                    <p className="text-sm text-amber-900 whitespace-pre-wrap">{competition.decklog}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          {isOwner && (
            <div className="shrink-0">
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-500 transition"
              >
                + บันทึกแมตช์ใหม่
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!matches && !error && <p className="text-sm text-amber-600">กำลังโหลด...</p>}

      {matches && (
        <>
          <StatsSummary matches={matches} />
          <StatsCharts matches={matches} />
          {matches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-amber-300 p-8 text-center text-amber-600">
              {isOwner ? 'ยังไม่มีแมตช์ — เริ่มบันทึกแมตช์แรกของงานนี้ได้เลย' : 'ยังไม่มีแมตช์ที่บันทึกไว้ในงานนี้'}
            </div>
          ) : (
            <MatchTable
              matches={matches}
              isOwner={isOwner}
              onEdit={(m) => setEditing(m)}
              onDelete={handleDeleteMatch}
            />
          )}

          <div className="flex flex-col items-center gap-2 pt-2 pb-4">
            <button
              onClick={handleShare}
              disabled={!competition || sharing}
              className="px-6 py-3 rounded-md border border-amber-400 text-amber-900 text-sm font-medium hover:bg-amber-50 transition disabled:opacity-50"
            >
              {sharing ? 'กำลังสร้างรูป...' : '📤 แชร์สรุปสถิติเป็นรูป (.jpg)'}
            </button>
            <p className="text-xs text-amber-500">บันทึกข้อมูลทั้งหมดของงานแข่งนี้ (สถิติ, Decklog, รายการแมตช์) เป็นรูปภาพเดียว</p>
            {shareError && <p className="text-xs text-red-600 text-center">{shareError}</p>}
          </div>
        </>
      )}

      {showForm && (
        <MatchForm
          nextRoundNumber={
            matches && matches.length > 0
              ? Math.max(0, ...matches.map((m) => m.round_number ?? 0)) + 1
              : 1
          }
          category={competition?.category ?? undefined}
          onSubmit={handleCreateMatch}
          onClose={() => setShowForm(false)}
        />
      )}
      {editing && (
        <MatchForm
          initial={editing}
          category={competition?.category ?? undefined}
          onSubmit={handleUpdateMatch}
          onClose={() => setEditing(null)}
        />
      )}

      {sharePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 p-4"
          onClick={() => setSharePreview(null)}
        >
          <div
            className="flex w-full max-w-lg flex-col rounded-xl border border-amber-300 bg-white p-4 shadow-xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-amber-950">ตัวอย่างรูปก่อนบันทึก</h2>
              <button
                onClick={() => setSharePreview(null)}
                className="text-amber-500 hover:text-amber-950 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto rounded-lg border border-amber-200 min-h-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sharePreview.url} alt="ตัวอย่างรูปสรุปสถิติที่จะบันทึก" className="block w-full h-auto" />
            </div>
            <p className="mt-2 text-xs text-amber-500 shrink-0">
              ตรวจสอบข้อมูลในรูปให้เรียบร้อยก่อนกด &ldquo;บันทึกรูป&rdquo; — ไฟล์จะถูกดาวน์โหลดเป็น {sharePreview.filename}
            </p>
            <div className="mt-3 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setSharePreview(null)}
                className="px-4 py-2 rounded-md text-amber-700 hover:bg-amber-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmShareSave}
                className="px-4 py-2 rounded-md bg-amber-600 text-white hover:bg-amber-500"
              >
                💾 บันทึกรูป (.jpg)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
