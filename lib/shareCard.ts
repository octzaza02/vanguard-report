// Generates a shareable "stat card" image (.jpg) rendered client-side via Canvas API.
// Landscape layout: left = comp name + stats + match list; right (top) = deck image + name.

import type { Competition, Match, MatchResult } from './types'

const W = 1500
const PAD = 56

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
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
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
        let rest = words.slice(i).join(' ')
        while (ctx.measureText(rest + '…').width > maxWidth && rest.length > 1) rest = rest.slice(0, -1)
        ctx.fillText(rest + (rest.length < words.slice(i).join(' ').length ? '…' : ''), x, y + lines * lineHeight)
        return lines + 1
      }
    } else {
      line = test
    }
  }
  if (line) { ctx.fillText(line, x, y + lines * lineHeight); lines++ }
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

// ── Layout constants ──────────────────────────────────────────────
const RIGHT_W = 390            // right column width (deck image + name)
const COL_GAP = 48             // gap between left and right columns
const LEFT_W = W - PAD * 2 - COL_GAP - RIGHT_W  // left column width ≈ 952

const HEADER_H = 96            // brand header height
const DIVIDER_GAP = 40         // space between divider and body content

const COMP_NAME_LINE_H = 68
const COMP_NAME_BLOCK = COMP_NAME_LINE_H * 2 + 8   // reserve 2 lines
const STAT_CELL_H = 124
const STATS_BOTTOM_GAP = 32
const PIE_RADIUS = 66
const PIE_TOP_GAP = 36
const PIE_SECTION_H = PIE_RADIUS * 2 + PIE_TOP_GAP + 28
const LEFT_COL_BODY_H = COMP_NAME_BLOCK + STAT_CELL_H + STATS_BOTTOM_GAP + PIE_SECTION_H

const DECK_IMG_H = RIGHT_W     // square deck image
const DECK_NAME_H = 56         // deck name text below image

const MATCH_TITLE_H = 64
const MATCH_HEADER_H = 48
const MATCH_ROW_H = 54
const MATCH_BOTTOM_GAP = 36
const FOOTER_H = 80

export async function buildCompetitionShareImage(
  competition: Competition,
  matches: Match[],
  ownerName: string
): Promise<string> {
  // Determine deck image source: prefer decklog_image (synced from first attachment)
  const deckImageSrc: string | null =
    competition.decklog_image ??
    (competition.attachments?.length > 0 ? (competition.attachments[0]?.image ?? null) : null)

  const hasDeckImg = !!deckImageSrc
  const deckName = competition.decklog?.trim() || ''

  // Right column height
  const rightColH =
    (hasDeckImg ? DECK_IMG_H + 16 : 0) +
    (deckName ? DECK_NAME_H : 0)

  const bodyH = Math.max(LEFT_COL_BODY_H, rightColH)

  // Match rows
  const matchRowsH = matches.length > 0 ? matches.length * MATCH_ROW_H : 72
  const matchSectionH = MATCH_TITLE_H + MATCH_HEADER_H + matchRowsH + MATCH_BOTTOM_GAP

  const H = PAD + HEADER_H + DIVIDER_GAP + bodyH + 56 + matchSectionH + FOOTER_H + PAD

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
  roundRect(ctx, 20, 20, W - 40, H - 40, 28)
  ctx.stroke()

  let y = PAD

  // ── Header ──────────────────────────────────────────────────────
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = COLORS.dim
  ctx.font = '600 28px system-ui, "Noto Sans Thai", sans-serif'
  ctx.fillText('🏆 Player Card Battle Report', PAD, y + 50)
  ctx.textAlign = 'right'
  ctx.fillText(`โดย ${ownerName}`, W - PAD, y + 50)
  ctx.textAlign = 'left'
  y += HEADER_H

  // Divider
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()
  y += DIVIDER_GAP

  // ── Body ─────────────────────────────────────────────────────────
  const bodyTop = y
  const leftX = PAD
  const rightX = PAD + LEFT_W + COL_GAP

  // LEFT: Competition name
  ctx.fillStyle = COLORS.title
  ctx.font = '700 54px system-ui, "Noto Sans Thai", sans-serif'
  wrapText(ctx, competition.name, leftX, bodyTop, LEFT_W, COMP_NAME_LINE_H, 2)

  // LEFT: Stats (4 cells — total, win, loss, draw)
  const statsY = bodyTop + COMP_NAME_BLOCK
  const total = matches.length
  const wins = matches.filter((m) => m.result === 'win').length
  const losses = matches.filter((m) => m.result === 'loss').length
  const draws = matches.filter((m) => m.result === 'draw').length
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  const stats = [
    { label: 'แข่งทั้งหมด', value: String(total), color: COLORS.title },
    { label: 'ชนะ', value: String(wins), color: COLORS.win },
    { label: 'แพ้', value: String(losses), color: COLORS.loss },
    { label: 'เสมอ', value: String(draws), color: COLORS.draw },
  ]
  const statGap = 16
  const statCellW = (LEFT_W - statGap * (stats.length - 1)) / stats.length

  stats.forEach((s, i) => {
    const sx = leftX + i * (statCellW + statGap)

    ctx.fillStyle = COLORS.cardBg
    roundRect(ctx, sx, statsY, statCellW, STAT_CELL_H, 14)
    ctx.fill()
    ctx.strokeStyle = COLORS.border
    ctx.lineWidth = 2
    roundRect(ctx, sx, statsY, statCellW, STAT_CELL_H, 14)
    ctx.stroke()

    ctx.fillStyle = s.color
    ctx.font = '700 44px system-ui, "Noto Sans Thai", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(s.value, sx + statCellW / 2, statsY + 60)

    ctx.fillStyle = COLORS.dim
    ctx.font = '400 22px system-ui, "Noto Sans Thai", sans-serif'
    ctx.fillText(s.label, sx + statCellW / 2, statsY + 96)
    ctx.textAlign = 'left'
  })

  // LEFT: Pie (donut) chart + legend
  const pieTopY = statsY + STAT_CELL_H + PIE_TOP_GAP
  const pieCX = leftX + PIE_RADIUS + 8
  const pieCY = pieTopY + PIE_RADIUS
  const pieSlices = [
    { value: wins,   color: COLORS.win,  label: 'ชนะ' },
    { value: losses, color: COLORS.loss, label: 'แพ้' },
    { value: draws,  color: '#a16207',   label: 'เสมอ' },
  ]

  if (total > 0) {
    let startAngle = -Math.PI / 2
    pieSlices.forEach((s) => {
      if (s.value === 0) return
      const sliceAngle = (s.value / total) * Math.PI * 2
      ctx.fillStyle = s.color
      ctx.beginPath()
      ctx.moveTo(pieCX, pieCY)
      ctx.arc(pieCX, pieCY, PIE_RADIUS, startAngle, startAngle + sliceAngle)
      ctx.closePath()
      ctx.fill()
      startAngle += sliceAngle
    })
    // Donut hole
    ctx.fillStyle = COLORS.bg
    ctx.beginPath()
    ctx.arc(pieCX, pieCY, PIE_RADIUS * 0.46, 0, Math.PI * 2)
    ctx.fill()
    // Win rate in centre
    ctx.fillStyle = COLORS.win
    ctx.font = '700 24px system-ui, "Noto Sans Thai", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${winRate}%`, pieCX, pieCY + 9)
    ctx.textAlign = 'left'
  } else {
    ctx.strokeStyle = COLORS.border
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(pieCX, pieCY, PIE_RADIUS, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Legend beside the pie
  const legX = pieCX + PIE_RADIUS + 32
  const legStartY = pieCY - (pieSlices.length - 1) * 25
  pieSlices.forEach((s, i) => {
    const ly = legStartY + i * 52
    // Colour dot
    ctx.fillStyle = s.color
    ctx.beginPath()
    ctx.arc(legX + 10, ly, 10, 0, Math.PI * 2)
    ctx.fill()
    // Label + count
    ctx.fillStyle = COLORS.title
    ctx.font = '600 26px system-ui, "Noto Sans Thai", sans-serif'
    ctx.fillText(`${s.label}  ${s.value}`, legX + 28, ly + 9)
    // Percentage
    const pct = total > 0 ? Math.round((s.value / total) * 100) : 0
    ctx.fillStyle = COLORS.dim
    ctx.font = '400 22px system-ui, "Noto Sans Thai", sans-serif'
    ctx.fillText(`${pct}%`, legX + 180, ly + 9)
  })

  // RIGHT: Deck image
  let rightY = bodyTop
  if (hasDeckImg) {
    try {
      const img = await loadImage(deckImageSrc!)
      roundRect(ctx, rightX, rightY, RIGHT_W, DECK_IMG_H, 16)
      ctx.save()
      ctx.clip()
      drawCoverImage(ctx, img, rightX, rightY, RIGHT_W, DECK_IMG_H)
      ctx.restore()
      ctx.strokeStyle = COLORS.accentBorder
      ctx.lineWidth = 2
      roundRect(ctx, rightX, rightY, RIGHT_W, DECK_IMG_H, 16)
      ctx.stroke()
      rightY += DECK_IMG_H + 16
    } catch { /* ignore */ }
  }

  // RIGHT: Deck name
  if (deckName) {
    ctx.fillStyle = COLORS.title
    ctx.font = '600 28px system-ui, "Noto Sans Thai", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(truncateText(ctx, deckName, RIGHT_W), rightX + RIGHT_W / 2, rightY + 36)
    ctx.textAlign = 'left'
  }

  y = bodyTop + bodyH + 56

  // ── Match list ───────────────────────────────────────────────────
  ctx.fillStyle = COLORS.title
  ctx.font = '700 32px system-ui, "Noto Sans Thai", sans-serif'
  ctx.fillText(`รายการแมตช์ (${matches.length})`, PAD, y + 38)
  y += MATCH_TITLE_H

  // Column layout
  const CONTENT_W = W - PAD * 2
  const cols = {
    round:    { x: PAD,            w: 72,               label: 'รอบ' },
    date:     { x: PAD + 80,       w: 210,              label: 'วันที่' },
    opponent: { x: PAD + 308,      w: 380,              label: 'คู่แข่ง' },
    first:    { x: PAD + 706,      w: 170,              label: 'เริ่ม' },
    result:   { x: PAD + 896,      w: 110,              label: 'ผล' },
    score:    { x: PAD + 1026,     w: CONTENT_W - 1026, label: 'คะแนน' },
  }

  // Divider above headers
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()

  // Column headers
  y += 6
  ctx.fillStyle = COLORS.dim
  ctx.font = '600 22px system-ui, "Noto Sans Thai", sans-serif'
  Object.values(cols).forEach((c) => ctx.fillText(c.label, c.x, y + 28))
  y += MATCH_HEADER_H

  // Header underline
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()

  if (matches.length === 0) {
    ctx.fillStyle = COLORS.dim
    ctx.font = '400 26px system-ui, "Noto Sans Thai", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('ยังไม่มีแมตช์ที่บันทึกไว้', W / 2, y + 44)
    ctx.textAlign = 'left'
    y += 72
  } else {
    const sorted = [...matches].sort((a, b) => (a.round_number ?? 0) - (b.round_number ?? 0))
    sorted.forEach((m, i) => {
      const rowTop = y + i * MATCH_ROW_H
      const rowMidY = rowTop + MATCH_ROW_H / 2 + 9

      if (i % 2 === 1) {
        ctx.fillStyle = COLORS.rowAlt
        ctx.fillRect(PAD, rowTop, W - PAD * 2, MATCH_ROW_H)
      }

      ctx.fillStyle = COLORS.title
      ctx.font = '400 26px system-ui, "Noto Sans Thai", sans-serif'
      ctx.fillText(String(m.round_number ?? '—'), cols.round.x, rowMidY)

      ctx.fillStyle = COLORS.text
      ctx.font = '400 24px system-ui, "Noto Sans Thai", sans-serif'
      ctx.fillText(truncateText(ctx, m.match_date, cols.date.w - 16), cols.date.x, rowMidY)

      ctx.fillStyle = COLORS.text
      ctx.font = '400 26px system-ui, "Noto Sans Thai", sans-serif'
      ctx.fillText(truncateText(ctx, m.opponent || '—', cols.opponent.w - 16), cols.opponent.x, rowMidY)

      ctx.fillStyle = COLORS.dim
      ctx.fillText(
        m.went_first === true ? 'เริ่มก่อน' : m.went_first === false ? 'เริ่มหลัง' : '—',
        cols.first.x, rowMidY
      )

      ctx.fillStyle = RESULT_COLOR[m.result]
      ctx.font = '700 26px system-ui, "Noto Sans Thai", sans-serif'
      ctx.fillText(RESULT_LABEL[m.result], cols.result.x, rowMidY)

      ctx.fillStyle = COLORS.text
      ctx.font = '400 26px system-ui, "Noto Sans Thai", sans-serif'
      ctx.fillText(truncateText(ctx, m.score || '—', cols.score.w - 16), cols.score.x, rowMidY)
    })
    y += matches.length * MATCH_ROW_H
  }

  y += MATCH_BOTTOM_GAP

  // ── Footer ───────────────────────────────────────────────────────
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()

  ctx.fillStyle = COLORS.faint
  ctx.font = '400 22px system-ui, "Noto Sans Thai", sans-serif'
  const dateStr = new Date().toISOString().slice(0, 10)
  ctx.fillText(`สร้างเมื่อ ${dateStr} · Player Card Battle Report`, PAD, y + 42)

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
