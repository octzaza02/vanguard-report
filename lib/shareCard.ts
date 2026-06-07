// Generates a shareable "stat card" image (.jpg) summarizing a competition,
// rendered entirely client-side via the Canvas API (no extra dependencies,
// consistent with the browser-side image processing used elsewhere in the app).

import type { Competition, Match, MatchResult } from './types'

const W = 1080
const PAD = 64

const COLORS = {
  bg: '#fffbeb',
  border: '#fde68a',
  accentBorder: '#d97706',
  title: '#451a03',
  text: '#92400e',
  dim: '#b45309',
  faint: '#d97706',
  win: '#d97706',
  loss: '#ef4444',
  draw: '#78350f',
  cardBg: '#fef3c7',
  rowAlt: '#fef9ec',
}

const RESULT_LABEL: Record<MatchResult, string> = { win: 'ชนะ', loss: 'แพ้', draw: 'เสมอ' }
const RESULT_COLOR: Record<MatchResult, string> = { win: COLORS.win, loss: COLORS.loss, draw: COLORS.draw }

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1)
  }
  return t + '…'
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3
): number {
  const words = text.split(/\s+/)
  let line = ''
  let lines = 0
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i]
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight)
      line = words[i]
      lines++
      if (lines === maxLines - 1) {
        // last allowed line: truncate with ellipsis if needed
        let rest = words.slice(i).join(' ')
        while (ctx.measureText(rest + '…').width > maxWidth && rest.length > 1) {
          rest = rest.slice(0, -1)
        }
        ctx.fillText(rest + (rest.length < words.slice(i).join(' ').length ? '…' : ''), x, y + lines * lineHeight)
        return lines + 1
      }
    } else {
      line = test
    }
  }
  if (line) {
    ctx.fillText(line, x, y + lines * lineHeight)
    lines++
  }
  return lines
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('โหลดรูปไม่สำเร็จ'))
    img.src = src
  })
}

function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height)
  const sw = w / scale
  const sh = h / scale
  const sx = (img.width - sw) / 2
  const sy = (img.height - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

// Layout constants for the match list section
const TITLE_BLOCK_H = 2 * 66 + 8 // reserve up to 2 wrapped lines for the competition name
const DECKLOG_BOX_H = 200
const MATCH_SECTION_TITLE_H = 56
const MATCH_HEADER_ROW_H = 44
const MATCH_ROW_H = 52
const MATCH_LIST_BOTTOM_GAP = 40
const FOOTER_RESERVE = 110
const EMPTY_LIST_H = 64

function matchListHeight(count: number): number {
  const rows = count > 0 ? count * MATCH_ROW_H : EMPTY_LIST_H
  return MATCH_SECTION_TITLE_H + MATCH_HEADER_ROW_H + rows + MATCH_LIST_BOTTOM_GAP
}

export async function buildCompetitionShareImage(
  competition: Competition,
  matches: Match[],
  ownerName: string
): Promise<string> {
  const hasDecklog = !!(competition.decklog || competition.decklog_image)

  // --- Pass 1: compute total canvas height from deterministic section sizes ---
  let H = PAD + 28 // top inset before brand header baseline
  H += 64 // brand header -> divider
  H += 64 // divider -> title
  H += TITLE_BLOCK_H // competition name (reserve 2 lines)
  H += 56 // subtitle
  const gridRows = 2 // 5 stat cells in a 3-column grid => 2 rows
  const cellH = 132
  const gridGap = 20
  H += gridRows * cellH + (gridRows - 1) * gridGap + 56
  if (hasDecklog) H += DECKLOG_BOX_H + 48
  H += matchListHeight(matches.length)
  H += FOOTER_RESERVE

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('ไม่รองรับการสร้างรูปภาพ')

  // Background
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, W, H)

  // Outer border
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 3
  roundRect(ctx, 24, 24, W - 48, H - 48, 24)
  ctx.stroke()

  let cursorY = PAD + 28

  // Header: app brand
  ctx.fillStyle = COLORS.dim
  ctx.font = '600 30px system-ui, "Noto Sans Thai", sans-serif'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('🏆 สถิติการแข่งขัน', PAD, cursorY)

  ctx.textAlign = 'right'
  ctx.fillText(`โดย ${ownerName}`, W - PAD, cursorY)
  ctx.textAlign = 'left'

  cursorY += 64

  // Divider
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, cursorY)
  ctx.lineTo(W - PAD, cursorY)
  ctx.stroke()

  cursorY += 64

  // Title (competition name) - wrap up to 2 lines (space reserved regardless of actual line count)
  const titleTop = cursorY
  ctx.fillStyle = COLORS.title
  ctx.font = '700 56px system-ui, "Noto Sans Thai", sans-serif'
  wrapText(ctx, competition.name, PAD, cursorY, W - PAD * 2, 66, 2)
  cursorY = titleTop + TITLE_BLOCK_H

  // Subtitle: game / category
  const subtitle = [competition.game, competition.category].filter(Boolean).join(' · ') || 'ไม่ระบุเกม/ประเภท'
  ctx.fillStyle = COLORS.dim
  ctx.font = '400 32px system-ui, "Noto Sans Thai", sans-serif'
  ctx.fillText(subtitle, PAD, cursorY)

  cursorY += 56

  // Stats grid
  const total = matches.length
  const wins = matches.filter((m) => m.result === 'win').length
  const losses = matches.filter((m) => m.result === 'loss').length
  const draws = matches.filter((m) => m.result === 'draw').length
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  const stats: { label: string; value: string; color: string }[] = [
    { label: 'แข่งทั้งหมด', value: String(total), color: COLORS.title },
    { label: 'ชนะ', value: String(wins), color: COLORS.win },
    { label: 'แพ้', value: String(losses), color: COLORS.loss },
    { label: 'เสมอ', value: String(draws), color: COLORS.draw },
    { label: 'อัตราชนะ', value: `${winRate}%`, color: COLORS.title },
  ]

  const gridCols = 3
  const cellW = (W - PAD * 2 - gridGap * (gridCols - 1)) / gridCols

  stats.forEach((s, i) => {
    const col = i % gridCols
    const row = Math.floor(i / gridCols)
    const x = PAD + col * (cellW + gridGap)
    const y = cursorY + row * (cellH + gridGap)

    ctx.fillStyle = COLORS.cardBg
    roundRect(ctx, x, y, cellW, cellH, 16)
    ctx.fill()
    ctx.strokeStyle = COLORS.border
    ctx.lineWidth = 2
    roundRect(ctx, x, y, cellW, cellH, 16)
    ctx.stroke()

    ctx.fillStyle = s.color
    ctx.font = '700 48px system-ui, "Noto Sans Thai", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(s.value, x + cellW / 2, y + 64)

    ctx.fillStyle = COLORS.dim
    ctx.font = '400 24px system-ui, "Noto Sans Thai", sans-serif'
    ctx.fillText(s.label, x + cellW / 2, y + 100)
    ctx.textAlign = 'left'
  })

  cursorY += gridRows * cellH + (gridRows - 1) * gridGap + 56

  // Decklog section (if present)
  if (hasDecklog) {
    const boxH = DECKLOG_BOX_H
    ctx.fillStyle = COLORS.cardBg
    roundRect(ctx, PAD, cursorY, W - PAD * 2, boxH, 16)
    ctx.fill()
    ctx.strokeStyle = COLORS.border
    ctx.lineWidth = 2
    roundRect(ctx, PAD, cursorY, W - PAD * 2, boxH, 16)
    ctx.stroke()

    const innerPad = 28
    let textX = PAD + innerPad
    const textMaxW = W - PAD * 2 - innerPad * 2

    if (competition.decklog_image) {
      try {
        const img = await loadImage(competition.decklog_image)
        const imgSize = boxH - innerPad * 2
        roundRect(ctx, PAD + innerPad, cursorY + innerPad, imgSize, imgSize, 12)
        ctx.save()
        ctx.clip()
        drawCoverImage(ctx, img, PAD + innerPad, cursorY + innerPad, imgSize, imgSize)
        ctx.restore()
        ctx.strokeStyle = COLORS.border
        ctx.lineWidth = 2
        roundRect(ctx, PAD + innerPad, cursorY + innerPad, imgSize, imgSize, 12)
        ctx.stroke()
        textX = PAD + innerPad + imgSize + 28
      } catch {
        // ignore image load failure, fall back to text-only layout
      }
    }

    ctx.fillStyle = COLORS.dim
    ctx.font = '600 26px system-ui, "Noto Sans Thai", sans-serif'
    ctx.fillText('Decklog (เด็คที่ใช้)', textX, cursorY + innerPad + 30)

    if (competition.decklog) {
      ctx.fillStyle = COLORS.title
      ctx.font = '400 30px system-ui, "Noto Sans Thai", sans-serif'
      const availW = PAD + (W - PAD * 2) - textX
      wrapText(ctx, competition.decklog, textX, cursorY + innerPad + 76, Math.min(availW, textMaxW), 38, 3)
    }

    cursorY += boxH + 48
  }

  // --- Match list section ---
  ctx.fillStyle = COLORS.title
  ctx.font = '700 32px system-ui, "Noto Sans Thai", sans-serif'
  ctx.fillText(`รายการแมตช์ (${matches.length})`, PAD, cursorY + 32)
  cursorY += MATCH_SECTION_TITLE_H

  // Column layout (content width = W - PAD*2 = 952)
  const col = {
    round: { x: PAD, w: 64, label: 'รอบ', align: 'left' as CanvasTextAlign },
    date: { x: PAD + 64, w: 190, label: 'วันที่', align: 'left' as CanvasTextAlign },
    opponent: { x: PAD + 270, w: 270, label: 'คู่แข่ง', align: 'left' as CanvasTextAlign },
    first: { x: PAD + 556, w: 130, label: 'เริ่ม', align: 'left' as CanvasTextAlign },
    result: { x: PAD + 700, w: 90, label: 'ผล', align: 'left' as CanvasTextAlign },
    score: { x: PAD + 804, w: W - PAD - (PAD + 804), label: 'คะแนน', align: 'left' as CanvasTextAlign },
  }

  // Column headers
  ctx.fillStyle = COLORS.dim
  ctx.font = '600 22px system-ui, "Noto Sans Thai", sans-serif'
  Object.values(col).forEach((c) => ctx.fillText(c.label, c.x, cursorY + 28))
  cursorY += MATCH_HEADER_ROW_H

  // Header underline
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, cursorY)
  ctx.lineTo(W - PAD, cursorY)
  ctx.stroke()

  if (matches.length === 0) {
    ctx.fillStyle = COLORS.dim
    ctx.font = '400 26px system-ui, "Noto Sans Thai", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('ยังไม่มีแมตช์ที่บันทึกไว้', W / 2, cursorY + EMPTY_LIST_H / 2 + 8)
    ctx.textAlign = 'left'
    cursorY += EMPTY_LIST_H
  } else {
    const sorted = [...matches].sort((a, b) => (a.round_number ?? 0) - (b.round_number ?? 0))
    sorted.forEach((m, i) => {
      const rowTop = cursorY + i * MATCH_ROW_H
      const rowMidY = rowTop + MATCH_ROW_H / 2 + 8

      if (i % 2 === 1) {
        ctx.fillStyle = COLORS.rowAlt
        ctx.fillRect(PAD, rowTop, W - PAD * 2, MATCH_ROW_H)
      }

      ctx.font = '400 26px system-ui, "Noto Sans Thai", sans-serif'

      ctx.fillStyle = COLORS.title
      ctx.fillText(String(m.round_number ?? '—'), col.round.x, rowMidY)

      ctx.fillStyle = COLORS.text
      ctx.font = '400 24px system-ui, "Noto Sans Thai", sans-serif'
      ctx.fillText(truncateText(ctx, m.match_date, col.date.w - 16), col.date.x, rowMidY)

      ctx.fillStyle = COLORS.text
      ctx.font = '400 26px system-ui, "Noto Sans Thai", sans-serif'
      ctx.fillText(truncateText(ctx, m.opponent || '—', col.opponent.w - 16), col.opponent.x, rowMidY)

      ctx.fillStyle = COLORS.dim
      ctx.fillText(
        m.went_first === true ? 'เริ่มก่อน' : m.went_first === false ? 'เริ่มหลัง' : '—',
        col.first.x,
        rowMidY
      )

      ctx.fillStyle = RESULT_COLOR[m.result]
      ctx.font = '700 26px system-ui, "Noto Sans Thai", sans-serif'
      ctx.fillText(RESULT_LABEL[m.result], col.result.x, rowMidY)

      ctx.fillStyle = COLORS.text
      ctx.font = '400 26px system-ui, "Noto Sans Thai", sans-serif'
      ctx.fillText(truncateText(ctx, m.score || '—', col.score.w - 12), col.score.x, rowMidY)
    })
    cursorY += matches.length * MATCH_ROW_H
  }

  cursorY += MATCH_LIST_BOTTOM_GAP

  // Footer
  ctx.fillStyle = COLORS.faint
  ctx.font = '400 24px system-ui, "Noto Sans Thai", sans-serif'
  const dateStr = new Date().toISOString().slice(0, 10)
  ctx.fillText(`สร้างเมื่อ ${dateStr} · vanguard report · สถิติการแข่งขัน`, PAD, H - PAD)

  return canvas.toDataURL('image/jpeg', 0.92)
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
