import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

const TODAY = toDateStr(new Date())

const RECOVERY_COLOR = score => {
  if (score === null || score === undefined) return '#666660'
  if (score >= 67) return '#7EC8A4'
  if (score >= 34) return '#E8D5A3'
  return '#E87C5A'
}

// ── Multi-metric SVG chart ────────────────────────────────────────────────────
function WhoopChart({ entries }) {
  if (entries.length < 2) return null
  const W = 480, H = 160, PAD = { t: 20, r: 16, b: 32, l: 36 }

  const xScale = i => PAD.l + (i / (entries.length - 1)) * (W - PAD.l - PAD.r)

  function metricLine(key, min, max, color) {
    const vals = entries.map(e => e[key])
    if (vals.every(v => v == null)) return null
    const yScale = v => v == null ? null : PAD.t + ((max - v) / (max - min)) * (H - PAD.t - PAD.b)
    const points = entries.map((e, i) => ({ x: xScale(i), y: yScale(e[key]) }))
    const d = points
      .filter(p => p.y != null)
      .map((p, i, arr) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ')
    return (
      <g key={key}>
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" opacity="0.85" />
        {points.map((p, i) => p.y != null && (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
        ))}
      </g>
    )
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: 'DM Mono, monospace' }}>
      {/* x-axis labels */}
      {entries.map((e, i) => (
        <text key={e.date} x={xScale(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="#666660">
          {e.date.slice(5)}
        </text>
      ))}
      {/* y-axis line */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#222220" strokeWidth="1" />

      {/* Recovery 0–100 */}
      {metricLine('recovery', 0, 100, '#7EC8A4')}
      {/* Strain 0–21 scaled to 0–100 visually */}
      {entries.every(e => e.strain == null) ? null : (() => {
        const yScale = v => v == null ? null : PAD.t + ((21 - v) / 21) * (H - PAD.t - PAD.b)
        const points = entries.map((e, i) => ({ x: xScale(i), y: yScale(e.strain) }))
        const d = points.filter(p => p.y != null).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
        return (
          <g>
            <path d={d} fill="none" stroke="#E87C5A" strokeWidth="1.5" opacity="0.85" />
            {points.map((p, i) => p.y != null && <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#E87C5A" />)}
          </g>
        )
      })()}
      {/* RHR 30–80 */}
      {metricLine('rhr', 30, 80, '#E8D5A3')}
    </svg>
  )
}

// ── Recovery ring ─────────────────────────────────────────────────────────────
function RecoveryRing({ score }) {
  const r = 28, cx = 36, cy = 36
  const circ = 2 * Math.PI * r
  const pct = score != null ? Math.max(0, Math.min(100, score)) / 100 : 0
  const color = RECOVERY_COLOR(score)
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#222220" strokeWidth="6" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${(pct * circ).toFixed(1)} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill={color}
        style={{ fontFamily: 'DM Mono, monospace' }}>
        {score ?? '—'}
      </text>
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Whoop() {
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState({ recovery: '', hrv: '', rhr: '', sleep_score: '', sleep_hours: '', strain: '' })
  const [saving, setSaving] = useState(false)
  const [savedToday, setSavedToday] = useState(false)

  const fetchEntries = useCallback(async () => {
    const since = toDateStr(new Date(Date.now() - 6 * 86400000))
    const { data } = await supabase
      .from('whoop_logs')
      .select('*')
      .gte('date', since)
      .order('date', { ascending: true })
    if (data) {
      setEntries(data)
      const todayEntry = data.find(e => e.date === TODAY)
      if (todayEntry) {
        setSavedToday(true)
        setForm({
          recovery: todayEntry.recovery ?? '',
          hrv: todayEntry.hrv ?? '',
          rhr: todayEntry.rhr ?? '',
          sleep_score: todayEntry.sleep_score ?? '',
          sleep_hours: todayEntry.sleep_hours ?? '',
          strain: todayEntry.strain ?? '',
        })
      }
    }
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  async function saveLog() {
    setSaving(true)
    const payload = {
      date: TODAY,
      recovery: form.recovery !== '' ? parseInt(form.recovery) : null,
      hrv: form.hrv !== '' ? parseInt(form.hrv) : null,
      rhr: form.rhr !== '' ? parseInt(form.rhr) : null,
      sleep_score: form.sleep_score !== '' ? parseInt(form.sleep_score) : null,
      sleep_hours: form.sleep_hours !== '' ? parseFloat(form.sleep_hours) : null,
      strain: form.strain !== '' ? parseFloat(form.strain) : null,
    }
    await supabase.from('whoop_logs').upsert(payload, { onConflict: 'date' })
    await fetchEntries()
    setSaving(false)
    setSavedToday(true)
  }

  const todayEntry = entries.find(e => e.date === TODAY)
  const field = (key, label, placeholder, step) => (
    <div>
      <p className="text-[10px] text-stone mb-1">{label}</p>
      <input
        className="input-field w-full text-sm"
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
        type="number"
        step={step || '1'}
      />
    </div>
  )

  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).toUpperCase()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Whoop Log</h2>
        <p className="section-sub">{dateStr}</p>
      </div>

      {/* ── Today's log form ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="card-label">TODAY'S LOG</p>
          {savedToday && <span className="text-[10px] text-sage">SAVED</span>}
        </div>

        <div className="flex items-center gap-5 mb-5">
          <RecoveryRing score={form.recovery !== '' ? parseInt(form.recovery) : todayEntry?.recovery ?? null} />
          <div>
            <p className="text-xs text-stone">RECOVERY</p>
            <p className="card-value font-serif text-2xl" style={{ color: RECOVERY_COLOR(form.recovery !== '' ? parseInt(form.recovery) : todayEntry?.recovery ?? null) }}>
              {form.recovery || todayEntry?.recovery || '—'}
              {(form.recovery || todayEntry?.recovery) ? <span className="text-sm text-stone ml-1">/ 100</span> : null}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {field('recovery', 'RECOVERY (0–100)', '75')}
          {field('strain', 'STRAIN (0–21)', '14.2', '0.1')}
          {field('hrv', 'HRV (ms)', '68')}
          {field('rhr', 'RHR (bpm)', '52')}
          {field('sleep_score', 'SLEEP SCORE (0–100)', '83')}
          {field('sleep_hours', 'SLEEP HOURS', '7.5', '0.1')}
        </div>

        <button onClick={saveLog} disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving…' : savedToday ? 'Update Log' : 'Save Log'}
        </button>
      </div>

      {/* ── 7-day chart ── */}
      {entries.length >= 2 && (
        <div className="card">
          <p className="card-label mb-1">LAST 7 DAYS</p>
          <div className="flex gap-4 mb-3 text-[10px] text-stone">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 bg-sage" /> Recovery</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 bg-coral" /> Strain</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 bg-gold" /> RHR</span>
          </div>
          <div className="bg-subtle rounded-lg p-3">
            <WhoopChart entries={entries} />
          </div>
        </div>
      )}

      {/* ── History table ── */}
      {entries.length > 0 && (
        <div className="card">
          <p className="card-label mb-3">HISTORY</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-stone border-b border-dark-border">
                  <th className="text-left pb-2 font-normal">DATE</th>
                  <th className="text-right pb-2 font-normal">REC</th>
                  <th className="text-right pb-2 font-normal">STRAIN</th>
                  <th className="text-right pb-2 font-normal">HRV</th>
                  <th className="text-right pb-2 font-normal">RHR</th>
                  <th className="text-right pb-2 font-normal">SLEEP</th>
                  <th className="text-right pb-2 font-normal">HRS</th>
                </tr>
              </thead>
              <tbody>
                {[...entries].reverse().map(e => (
                  <tr key={e.date} className="border-b border-dark-border last:border-0">
                    <td className="py-2 text-stone">{e.date.slice(5)}</td>
                    <td className="py-2 text-right font-mono" style={{ color: RECOVERY_COLOR(e.recovery) }}>
                      {e.recovery ?? '—'}
                    </td>
                    <td className="py-2 text-right text-ivory">{e.strain ?? '—'}</td>
                    <td className="py-2 text-right text-ivory">{e.hrv ?? '—'}</td>
                    <td className="py-2 text-right text-ivory">{e.rhr ?? '—'}</td>
                    <td className="py-2 text-right text-ivory">{e.sleep_score ?? '—'}</td>
                    <td className="py-2 text-right text-ivory">{e.sleep_hours ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
