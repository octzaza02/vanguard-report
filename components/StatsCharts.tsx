'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { Match } from '@/lib/types'

const RESULT_COLORS: Record<string, string> = {
  win: '#d97706',
  loss: '#ef4444',
  draw: '#fbbf24',
}
const RESULT_LABELS: Record<string, string> = { win: 'ชนะ', loss: 'แพ้', draw: 'เสมอ' }

export default function StatsCharts({ matches }: { matches: Match[] }) {
  if (matches.length === 0) return null

  const pieData = (['win', 'loss', 'draw'] as const)
    .map((r) => ({ key: r, name: RESULT_LABELS[r], value: matches.filter((m) => m.result === r).length }))
    .filter((d) => d.value > 0)

  // Trend: cumulative win rate over time (oldest -> newest)
  const sorted = [...matches].sort((a, b) => a.match_date.localeCompare(b.match_date) || a.created_at.localeCompare(b.created_at))
  let wins = 0
  const trendData = sorted.map((m, idx) => {
    if (m.result === 'win') wins += 1
    return {
      index: idx + 1,
      date: m.match_date,
      winRate: Math.round((wins / (idx + 1)) * 100),
    }
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-amber-900 mb-2">สัดส่วนผลการแข่งขัน</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                {pieData.map((d) => (
                  <Cell key={d.key} fill={RESULT_COLORS[d.key]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #fcd34d', color: '#451a03' }} labelStyle={{ color: '#451a03' }} />
              <Legend wrapperStyle={{ color: '#78350f' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-amber-900 mb-2">เทรนด์อัตราชนะสะสม</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
              <XAxis dataKey="index" tick={{ fontSize: 12, fill: '#92400e' }} stroke="#d97706" label={{ value: 'แมตช์ที่', position: 'insideBottom', offset: -2, fontSize: 12, fill: '#92400e' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#92400e' }} stroke="#d97706" unit="%" />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid #fcd34d', color: '#451a03' }}
                labelStyle={{ color: '#451a03' }}
                formatter={(value) => [`${value}%`, 'อัตราชนะสะสม']}
                labelFormatter={(label, payload) => (payload?.[0]?.payload ? `แมตช์ #${label} (${payload[0].payload.date})` : label)}
              />
              <Line type="monotone" dataKey="winRate" stroke="#d97706" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
