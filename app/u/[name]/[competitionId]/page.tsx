'use client'

import { use, useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  getCompetition,
  listMatches,
  createMatch,
  updateMatch,
  updateCompetition,
  deleteMatch,
  type MatchInput,
  type CompetitionInput,
} from '@/lib/api'
import type { Competition, Match } from '@/lib/types'
import { useSession } from '@/lib/session'
import StatsSummary from '@/components/StatsSummary'
import StatsCharts from '@/components/StatsCharts'
import MatchTable from '@/components/MatchTable'
import MatchForm from '@/components/MatchForm'
import CompetitionForm from '@/components/CompetitionForm'
import {
  buildCompetitionShareCanvas,
  canvasToDataUrl,
  downloadDataUrl,
  type ShareFormat,
} from '@/lib/shareCard'

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
  const [editingComp, setEditingComp] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [sharePreview, setSharePreview] = useState<{ previewUrl: string; baseName: string } | null>(null)
  const [saveFormat, setSaveFormat] = useState<ShareFormat>('jpeg')
  const shareCanvasRef = useRef<HTMLCanvasElement | null>(null)

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

  async function handleUpdateCompetition(fields: CompetitionInput) {
    if (!session || !competition) throw new Error('กรุณาเข้าสู่ระบบ')
    await updateCompetition(session.token, competition.id, fields)
    setEditingComp(false)
    await reload()
  }

  async function handleShare() {
    if (!competition) return
    setShareError(null)
    setSharing(true)
    try {
      const canvas = await buildCompetitionShareCanvas(competition, matches ?? [], decodedName)
      shareCanvasRef.current = canvas
      const previewUrl = canvasToDataUrl(canvas, 'jpeg')
      const safeName = competition.name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'competition'
      setSharePreview({ previewUrl, baseName: safeName })
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'สร้างรูปไม่สำเร็จ')
    } finally {
      setSharing(false)
    }
  }

  function handleSaveImage() {
    const canvas = shareCanvasRef.current
    if (!canvas || !sharePreview) return
    const ext = saveFormat === 'png' ? 'png' : 'jpg'
    const dataUrl = canvasToDataUrl(canvas, saveFormat)
    downloadDataUrl(dataUrl, `${sharePreview.baseName}-stats.${ext}`)
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
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold">{competition?.name ?? '...'}</h1>
            {competition && (
              <p className="text-sm text-amber-600 mt-0.5">
                {[competition.game, competition.category].filter(Boolean).join(' · ') || 'ไม่ระบุเกม/ประเภท'}
              </p>
            )}
            {competition && competition.decklog && (
              <p className="mt-2 text-sm text-amber-900 whitespace-pre-wrap">{competition.decklog}</p>
            )}

            {/* Attachment cards */}
            {competition && (competition.attachments?.length > 0
              ? competition.attachments
              : (competition.decklog_image || competition.notes)
                ? [{ image: competition.decklog_image ?? null, note: competition.notes ?? '', cardsIn: [], cardsOut: [] }]
                : []
            ).map((att, idx) => {
              const hasCards = (att.cardsIn?.length ?? 0) > 0 || (att.cardsOut?.length ?? 0) > 0
              return (att.image || att.note || hasCards) ? (
                <div key={idx} className="mt-3 rounded-lg border border-amber-200 bg-white p-3">
                  <div className="flex gap-4">
                    {/* Left: image */}
                    {att.image && (
                      <div className="shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.image}
                          alt="Deck"
                          onClick={() => setLightboxSrc(att.image!)}
                          className="max-h-44 w-auto rounded-md border border-amber-300 object-contain cursor-zoom-in hover:opacity-90 transition"
                        />
                      </div>
                    )}

                    {/* Right: cards (2-col grid) on top, note full-width below */}
                    {(hasCards || att.note) && (
                      <div className="min-w-0 flex-1 space-y-3 text-sm">
                        {hasCards && (
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            {(att.cardsIn?.length ?? 0) > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1.5">Cards In</p>
                                <ul className="space-y-1">
                                  {att.cardsIn!.map((row, i) => (
                                    <li key={i} className="flex items-center gap-2 text-amber-900">
                                      <span className="shrink-0 w-5 text-right font-semibold text-amber-500 text-xs">{row.key}</span>
                                      <span>{row.value}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {(att.cardsOut?.length ?? 0) > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1.5">Cards Out</p>
                                <ul className="space-y-1">
                                  {att.cardsOut!.map((row, i) => (
                                    <li key={i} className="flex items-center gap-2 text-amber-900">
                                      <span className="shrink-0 w-5 text-right font-semibold text-red-400 text-xs">{row.key}</span>
                                      <span>{row.value}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        {att.note && (
                          <p className={`text-amber-800 whitespace-pre-wrap leading-relaxed ${hasCards ? 'border-t border-amber-100 pt-3' : ''}`}>
                            {att.note}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : null
            })}
          </div>

          {/* Action buttons */}
          {isOwner && (
            <div className="shrink-0 flex flex-col gap-2">
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-500 transition"
              >
                + บันทึกแมตช์ใหม่
              </button>
              <button
                onClick={() => setEditingComp(true)}
                className="px-4 py-2 rounded-md border border-amber-400 text-amber-800 text-sm hover:bg-amber-50 transition"
              >
                ✏️ แก้ไขงานแข่ง
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

      {/* Edit competition modal */}
      {editingComp && competition && (
        <CompetitionForm
          initial={competition}
          onSubmit={handleUpdateCompetition}
          onClose={() => setEditingComp(false)}
        />
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

      {sharePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSharePreview(null)}
        >
          <div
            className="flex w-full max-w-2xl flex-col rounded-xl border border-amber-300 bg-white p-4 shadow-xl max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-3 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-amber-950">ตัวอย่างรูปสรุปสถิติ</h2>
              <button
                onClick={() => setSharePreview(null)}
                className="text-amber-400 hover:text-amber-900 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Preview image */}
            <div className="overflow-y-auto rounded-lg border border-amber-200 min-h-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sharePreview.previewUrl}
                alt="ตัวอย่างรูปสรุปสถิติ"
                className="block w-full h-auto"
              />
            </div>

            {/* Format picker + save */}
            <div className="mt-3 shrink-0 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-amber-700 shrink-0">บันทึกเป็น:</span>
                <div className="flex gap-2">
                  {([
                    { fmt: 'jpeg' as ShareFormat, label: 'JPG', desc: 'เล็ก เหมาะส่ง LINE / social' },
                    { fmt: 'png'  as ShareFormat, label: 'PNG', desc: 'คุณภาพสูง ข้อความคมชัด' },
                  ]).map(({ fmt, label, desc }) => (
                    <button
                      key={fmt}
                      onClick={() => setSaveFormat(fmt)}
                      className={`flex flex-col items-start px-3 py-2 rounded-lg border text-left transition ${
                        saveFormat === fmt
                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                          : 'border-amber-200 text-amber-700 hover:border-amber-400'
                      }`}
                    >
                      <span className="text-sm font-semibold">{label}</span>
                      <span className="text-xs text-amber-500">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSharePreview(null)}
                  className="px-4 py-2 rounded-md text-amber-700 hover:bg-amber-50 text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveImage}
                  className="px-5 py-2 rounded-md bg-amber-600 text-white hover:bg-amber-500 text-sm font-medium"
                >
                  💾 บันทึกรูป ({saveFormat === 'png' ? 'PNG' : 'JPG'})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
