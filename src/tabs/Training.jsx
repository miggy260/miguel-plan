import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toDateStr(d) { return d.toISOString().split('T')[0] }

function getWeekDates() {
  const now = new Date()
  const dow = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dow + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return toDateStr(d)
  })
}

export default function Training() {
  const weekDates = getWeekDates()
  const today = toDateStr(new Date())

  const [sessionsByDate, setSessionsByDate] = useState({})
  const [completionsBySession, setCompletionsBySession] = useState({})
  const [adding, setAdding] = useState(null) // date string
  const [newLabel, setNewLabel] = useState('')
  const [newIsRun, setNewIsRun] = useState(false)

  const fetchWeek = useCallback(async () => {
    const start = weekDates[0], end = weekDates[6]
    const { data: sess } = await supabase.from('sessions').select('*').gte('date', start).lte('date', end).order('sort_order')
    if (!sess) return
    const byDate = {}
    weekDates.forEach(d => { byDate[d] = [] })
    sess.forEach(s => { if (byDate[s.date]) byDate[s.date].push(s) })
    setSessionsByDate(byDate)

    const ids = sess.map(s => s.id)
    if (!ids.length) return
    const { data: comps } = await supabase.from('session_completions').select('*').in('session_uuid', ids)
    if (comps) {
      const map = {}
      comps.forEach(c => { map[c.session_uuid] = c })
      setCompletionsBySession(map)
    }
  }, [weekDates[0]])

  useEffect(() => { fetchWeek() }, [fetchWeek])

  async function addSession(date) {
    const label = newLabel.trim()
    if (!label) return
    const existing = sessionsByDate[date] || []
    const { data } = await supabase.from('sessions').insert({ date, label, is_run: newIsRun, sort_order: existing.length }).select().single()
    if (data) {
      setSessionsByDate(prev => ({ ...prev, [date]: [...(prev[date] || []), data] }))
      setNewLabel(''); setNewIsRun(false); setAdding(null)
    }
  }

  async function deleteSession(date, id) {
    await supabase.from('sessions').delete().eq('id', id)
    setSessionsByDate(prev => ({ ...prev, [date]: prev[date].filter(s => s.id !== id) }))
  }

  const weeklyKm = Object.values(completionsBySession)
    .filter(c => c.done && c.run_distance)
    .reduce((s, c) => s + parseFloat(c.run_distance), 0)

  const totalSessions = Object.values(sessionsByDate).flat().length
  const completedSessions = Object.values(completionsBySession).filter(c => c.done).length

  const weekLabel = new Date(weekDates[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' – ' + new Date(weekDates[6]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Training</h2>
        <p className="section-sub">WEEK PLANNER · {weekLabel.toUpperCase()}</p>
      </div>

      {/* Week stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="card-label mb-1">SESSIONS</p>
          <p className="card-value font-serif text-xl">{completedSessions}<span className="text-stone text-sm">/{totalSessions}</span></p>
        </div>
        <div className="card text-center">
          <p className="card-label mb-1">WEEKLY KM</p>
          <p className="card-value font-serif text-xl text-gold">{weeklyKm.toFixed(1)}</p>
        </div>
        <div className="card text-center">
          <p className="card-label mb-1">COMPLETION</p>
          <p className="card-value font-serif text-xl text-sage">
            {totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Day-by-day planner */}
      <div className="space-y-3">
        {weekDates.map((date, i) => {
          const sessions = sessionsByDate[date] || []
          const isToday = date === today
          const isPast = date < today
          const runKm = sessions
            .filter(s => s.is_run && completionsBySession[s.id]?.done)
            .reduce((sum, s) => sum + (parseFloat(completionsBySession[s.id]?.run_distance) || 0), 0)

          return (
            <div key={date} className={`card ${isToday ? 'border-gold' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className={`card-label ${isToday ? 'text-gold' : ''}`}>{DAYS[i]}</p>
                  <p className="text-[10px] text-stone">{new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                  {isToday && <span className="text-[10px] text-gold">TODAY</span>}
                </div>
                <div className="flex items-center gap-3">
                  {runKm > 0 && <span className="text-[10px] text-coral">{runKm.toFixed(1)} km</span>}
                  <button onClick={() => { setAdding(date); setNewLabel(''); setNewIsRun(false) }}
                    className="text-stone hover:text-gold text-xs transition-colors">+ Add</button>
                </div>
              </div>

              {sessions.length === 0 && adding !== date && (
                <p className="text-stone text-xs">Rest day</p>
              )}

              <div className="space-y-1.5">
                {sessions.map(s => {
                  const comp = completionsBySession[s.id]
                  const done = comp?.done
                  return (
                    <div key={s.id} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-sage' : isPast ? 'bg-coral' : 'bg-subtle border border-dark-border'}`} />
                      <span className={`text-sm flex-1 ${done ? 'text-stone line-through' : 'text-ivory'}`}>{s.label}</span>
                      {s.is_run && <span className="text-[10px] text-coral">RUN</span>}
                      {comp?.run_distance && <span className="text-[10px] text-stone">{comp.run_distance}km</span>}
                      {comp?.run_pace && <span className="text-[10px] text-stone">{comp.run_pace}/km</span>}
                      <button onClick={() => deleteSession(date, s.id)} className="text-stone hover:text-coral text-xs ml-1">✕</button>
                    </div>
                  )
                })}
              </div>

              {adding === date && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <input className="input-field flex-1 text-sm" placeholder="e.g. Easy Run 5km or Push 1"
                      value={newLabel} onChange={e => setNewLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addSession(date)} autoFocus />
                    <button onClick={() => addSession(date)} className="btn-primary text-sm px-3">Add</button>
                    <button onClick={() => setAdding(null)} className="text-stone text-xs px-2">✕</button>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newIsRun} onChange={e => setNewIsRun(e.target.checked)} className="accent-gold" />
                    <span className="text-xs text-stone">Run session (shows distance/pace inputs when checked off)</span>
                  </label>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
