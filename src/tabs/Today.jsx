import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const WEIGHT_GOAL = 75

const MORNING_ITEMS = [
  { id: 'electrolytes', label: 'Electrolytes' },
  { id: 'morning_skincare', label: 'Morning Skincare' },
  { id: 'read', label: 'Read 10–15 mins' },
  { id: 'journal', label: 'Journal' },
]

const EVENING_ITEMS = [
  { id: 'read_eve', label: 'Read 10–15 mins' },
  { id: 'evening_skincare', label: 'Evening Skincare' },
]

const PRE_RUN_ITEMS = [
  { id: 'electrolyte_tablet', label: 'Electrolyte tablet in water (60 min before)' },
  { id: 'snack', label: 'Banana or light snack (30 min before)' },
  { id: 'shoes', label: 'Running shoes laced' },
  { id: 'watch', label: 'Watch/Whoop charged and on wrist' },
  { id: 'headphones', label: 'Headphones charged (if needed)' },
  { id: 'route', label: 'Route planned — shaded or coastal if hot' },
  { id: 'sunscreen', label: 'Sunscreen if before 6pm' },
  { id: 'phone', label: 'Phone charged with location sharing on if running alone' },
]

function toDateStr(d) { return d.toISOString().split('T')[0] }

function getWeekRange() {
  const now = new Date()
  const dow = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dow + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { monday: toDateStr(monday), sunday: toDateStr(sunday) }
}

function WeightChart({ entries }) {
  if (!entries.length) return null
  const W = 480, H = 140, PAD = { t: 16, r: 16, b: 32, l: 40 }
  const allVals = [...entries.map(e => e.weight), WEIGHT_GOAL]
  const minV = Math.min(...allVals) - 1
  const maxV = Math.max(...allVals) + 1
  const n = entries.length
  const xScale = i => PAD.l + (i / Math.max(n - 1, 1)) * (W - PAD.l - PAD.r)
  const yScale = v => PAD.t + ((maxV - v) / (maxV - minV)) * (H - PAD.t - PAD.b)
  const linePath = entries.map((e, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(e.weight).toFixed(1)}`).join(' ')
  const goalY = yScale(WEIGHT_GOAL).toFixed(1)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: 'DM Mono, monospace' }}>
      <line x1={PAD.l} y1={goalY} x2={W - PAD.r} y2={goalY} stroke="#7EC8A4" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
      <text x={W - PAD.r + 4} y={Number(goalY) + 4} fontSize="9" fill="#7EC8A4" opacity="0.8">75</text>
      <path d={linePath} fill="none" stroke="#E8D5A3" strokeWidth="1.5" />
      {entries.map((e, i) => (
        <g key={e.date}>
          <circle cx={xScale(i)} cy={yScale(e.weight)} r="3" fill="#E8D5A3" />
          <text x={xScale(i)} y={yScale(e.weight) - 7} textAnchor="middle" fontSize="9" fill="#E8D5A3">{e.weight}</text>
        </g>
      ))}
      {entries.map((e, i) => (
        <text key={e.date + 'l'} x={xScale(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="#666660">{e.date.slice(5)}</text>
      ))}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#222220" strokeWidth="1" />
    </svg>
  )
}

export default function Today() {
  const today = toDateStr(new Date())
  const { monday, sunday } = getWeekRange()

  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [morningDone, setMorningDone] = useState({})
  const [eveningDone, setEveningDone] = useState({})
  const [preRunDone, setPreRunDone] = useState({})
  const [preRunOpen, setPreRunOpen] = useState(true)
  const [sessions, setSessions] = useState([])
  const [sessionDone, setSessionDone] = useState({})
  const [runData, setRunData] = useState({})
  const [weeklyKm, setWeeklyKm] = useState(null)
  const [weightEntries, setWeightEntries] = useState([])
  const [newWeight, setNewWeight] = useState('')
  const [weightLoading, setWeightLoading] = useState(false)
  const [newSession, setNewSession] = useState('')
  const [newSessionIsRun, setNewSessionIsRun] = useState(false)
  const [addingSession, setAddingSession] = useState(false)

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase.from('daily_tasks').select('*').eq('date', today).order('position')
    if (data) setTasks(data)
  }, [today])

  const fetchRoutines = useCallback(async () => {
    const { data } = await supabase.from('routine_completions').select('*').eq('date', today)
    if (data) {
      const m = {}, e = {}, p = {}
      data.forEach(r => {
        if (r.type === 'morning') m[r.item_id] = r.done
        else if (r.type === 'evening') e[r.item_id] = r.done
        else if (r.type === 'pre_run') p[r.item_id] = r.done
      })
      setMorningDone(m); setEveningDone(e); setPreRunDone(p)
    }
  }, [today])

  const fetchSessions = useCallback(async () => {
    const { data: sess } = await supabase.from('sessions').select('*').eq('date', today).order('sort_order')
    if (!sess) return
    setSessions(sess)
    const ids = sess.map(s => s.id)
    if (!ids.length) return
    const { data: comps } = await supabase.from('session_completions').select('*').in('session_uuid', ids)
    if (comps) {
      const done = {}, run = {}
      comps.forEach(c => {
        done[c.session_uuid] = c.done
        if (c.run_distance || c.run_pace || c.run_hr) {
          run[c.session_uuid] = { distance: c.run_distance ?? '', pace: c.run_pace ?? '', hr: c.run_hr ?? '' }
        }
      })
      setSessionDone(done); setRunData(run)
    }
  }, [today])

  const fetchWeeklyKm = useCallback(async () => {
    const { data } = await supabase.from('session_completions').select('run_distance').gte('date', monday).lte('date', sunday).eq('done', true).not('run_distance', 'is', null)
    if (data) setWeeklyKm(data.reduce((s, r) => s + (parseFloat(r.run_distance) || 0), 0))
  }, [monday, sunday])

  const fetchWeight = useCallback(async () => {
    const { data } = await supabase.from('weight_logs').select('*').order('date', { ascending: false }).limit(10)
    if (data) setWeightEntries([...data].reverse())
  }, [])

  useEffect(() => {
    fetchTasks(); fetchRoutines(); fetchSessions(); fetchWeeklyKm(); fetchWeight()
  }, [fetchTasks, fetchRoutines, fetchSessions, fetchWeeklyKm, fetchWeight])

  async function addTask() {
    const text = newTask.trim()
    if (!text || tasks.length >= 3) return
    const { data } = await supabase.from('daily_tasks').insert({ date: today, text, done: false, position: tasks.length }).select().single()
    if (data) { setTasks(prev => [...prev, data]); setNewTask('') }
  }

  async function toggleTask(id, done) {
    await supabase.from('daily_tasks').update({ done: !done }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !done } : t))
  }

  async function deleteTask(id) {
    await supabase.from('daily_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function toggleRoutine(type, itemId) {
    const map = type === 'morning' ? morningDone : type === 'evening' ? eveningDone : preRunDone
    const setter = type === 'morning' ? setMorningDone : type === 'evening' ? setEveningDone : setPreRunDone
    const newDone = !map[itemId]
    setter(prev => ({ ...prev, [itemId]: newDone }))
    await supabase.from('routine_completions').upsert({ date: today, type, item_id: itemId, done: newDone }, { onConflict: 'date,type,item_id' })
  }

  async function addSession() {
    const label = newSession.trim()
    if (!label) return
    const { data } = await supabase.from('sessions').insert({ date: today, label, is_run: newSessionIsRun, sort_order: sessions.length }).select().single()
    if (data) { setSessions(prev => [...prev, data]); setNewSession(''); setNewSessionIsRun(false); setAddingSession(false) }
  }

  async function deleteSession(id) {
    await supabase.from('sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
    setSessionDone(prev => { const n = { ...prev }; delete n[id]; return n })
    setRunData(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  async function toggleSession(session) {
    const newDone = !sessionDone[session.id]
    setSessionDone(prev => ({ ...prev, [session.id]: newDone }))
    const rd = runData[session.id] || {}
    await supabase.from('session_completions').upsert({
      session_uuid: session.id, date: today, done: newDone,
      run_distance: rd.distance ? parseFloat(rd.distance) : null,
      run_pace: rd.pace || null, run_hr: rd.hr ? parseInt(rd.hr) : null,
    }, { onConflict: 'session_uuid' })
    fetchWeeklyKm()
  }

  async function commitRunData(sessionId) {
    if (!sessionDone[sessionId]) return
    const rd = runData[sessionId] || {}
    await supabase.from('session_completions').upsert({
      session_uuid: sessionId, date: today, done: true,
      run_distance: rd.distance ? parseFloat(rd.distance) : null,
      run_pace: rd.pace || null, run_hr: rd.hr ? parseInt(rd.hr) : null,
    }, { onConflict: 'session_uuid' })
    fetchWeeklyKm()
  }

  async function logWeight() {
    const w = parseFloat(newWeight)
    if (!w || w < 30 || w > 200) return
    setWeightLoading(true)
    await supabase.from('weight_logs').upsert({ date: today, weight: w }, { onConflict: 'date' })
    await fetchWeight(); setNewWeight(''); setWeightLoading(false)
  }

  const hasRunToday = sessions.some(s => s.is_run)
  const preRunChecked = PRE_RUN_ITEMS.filter(i => preRunDone[i.id]).length
  const latestWeight = weightEntries.length ? weightEntries[weightEntries.length - 1].weight : null
  const kgToGoal = latestWeight ? (latestWeight - WEIGHT_GOAL).toFixed(1) : null
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()

  const CheckBox = ({ done, onClick, color = 'bg-gold border-gold' }) => (
    <div onClick={onClick} className={`w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${done ? color : 'border-dark-border hover:border-stone'}`}>
      {done && <span className="text-[10px] text-surface font-bold">✓</span>}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Today</h2>
        <p className="section-sub">{dateStr}</p>
      </div>

      {/* Top 3 Tasks */}
      <div className="card">
        <p className="card-label mb-3">TOP 3 TASKS</p>
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-3">
              <CheckBox done={task.done} onClick={() => toggleTask(task.id, task.done)} />
              <span className={`flex-1 text-sm ${task.done ? 'line-through text-stone' : 'text-ivory'}`}>{task.text}</span>
              <button onClick={() => deleteTask(task.id)} className="text-stone hover:text-coral text-xs">✕</button>
            </div>
          ))}
        </div>
        {tasks.length < 3 && (
          <div className="flex gap-2 mt-3">
            <input className="input-field flex-1 text-sm" placeholder={`Task ${tasks.length + 1} of 3`} value={newTask}
              onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} />
            <button onClick={addTask} className="btn-primary text-sm px-3">Add</button>
          </div>
        )}
        {tasks.length === 0 && !newTask && <p className="text-stone text-xs mt-2">No tasks yet — add up to 3 for today.</p>}
      </div>

      {/* Routines */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <p className="card-label mb-3">MORNING ROUTINE</p>
          <div className="space-y-2">
            {MORNING_ITEMS.map(item => (
              <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                <CheckBox done={morningDone[item.id]} onClick={() => toggleRoutine('morning', item.id)} color="bg-sage border-sage" />
                <span className={`text-sm ${morningDone[item.id] ? 'text-stone line-through' : 'text-ivory'}`}>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="card">
          <p className="card-label mb-3">EVENING ROUTINE</p>
          <div className="space-y-2">
            {EVENING_ITEMS.map(item => (
              <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                <CheckBox done={eveningDone[item.id]} onClick={() => toggleRoutine('evening', item.id)} color="bg-sage border-sage" />
                <span className={`text-sm ${eveningDone[item.id] ? 'text-stone line-through' : 'text-ivory'}`}>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Pre-Run Checklist */}
      {hasRunToday && (
        <div className="card">
          <button className="flex items-center justify-between w-full" onClick={() => setPreRunOpen(o => !o)}>
            <div className="flex items-center gap-3">
              <p className="card-label">PRE-RUN CHECKLIST</p>
              <span className="text-[10px] text-stone">{preRunChecked}/{PRE_RUN_ITEMS.length}</span>
              {preRunChecked === PRE_RUN_ITEMS.length && <span className="text-[10px] text-sage">READY</span>}
            </div>
            <span className="text-stone text-xs">{preRunOpen ? '▲' : '▼'}</span>
          </button>
          {preRunOpen && (
            <div className="mt-3 space-y-2">
              {PRE_RUN_ITEMS.map(item => (
                <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                  <CheckBox done={preRunDone[item.id]} onClick={() => toggleRoutine('pre_run', item.id)} />
                  <span className={`text-sm leading-snug ${preRunDone[item.id] ? 'text-stone line-through' : 'text-ivory'}`}>{item.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Today's Sessions */}
      <div className="card">
        <div className="flex items-baseline justify-between mb-3">
          <p className="card-label">TODAY'S SESSIONS</p>
          {weeklyKm !== null && weeklyKm > 0 && (
            <span className="text-xs text-stone">Week: <span className="text-gold font-mono">{weeklyKm.toFixed(1)} km</span></span>
          )}
        </div>

        {sessions.length === 0 && !addingSession && (
          <p className="text-stone text-sm mb-3">No sessions yet — add one below or plan from the Training tab.</p>
        )}

        <div className="space-y-3">
          {sessions.map(session => (
            <div key={session.id} className="space-y-2">
              <div className="flex items-center gap-3">
                <CheckBox done={sessionDone[session.id]} onClick={() => toggleSession(session)} />
                <span className={`flex-1 text-sm ${sessionDone[session.id] ? 'text-stone line-through' : 'text-ivory'}`}>{session.label}</span>
                {session.is_run && <span className="text-[10px] text-coral">RUN</span>}
                <button onClick={() => deleteSession(session.id)} className="text-stone hover:text-coral text-xs">✕</button>
              </div>
              {session.is_run && sessionDone[session.id] && (
                <div className="ml-7 grid grid-cols-3 gap-2">
                  {[
                    { key: 'distance', label: 'DISTANCE (km)', placeholder: '0.00', type: 'number', step: '0.01' },
                    { key: 'pace', label: 'AVG PACE (/km)', placeholder: '5:30', type: 'text' },
                    { key: 'hr', label: 'AVG HR (bpm)', placeholder: '145', type: 'number' },
                  ].map(({ key, label, placeholder, type, step }) => (
                    <div key={key}>
                      <p className="text-[10px] text-stone mb-1">{label}</p>
                      <input className="input-field w-full text-sm" placeholder={placeholder} type={type} step={step}
                        value={runData[session.id]?.[key] ?? ''}
                        onChange={e => setRunData(prev => ({ ...prev, [session.id]: { ...(prev[session.id] || {}), [key]: e.target.value } }))}
                        onBlur={() => commitRunData(session.id)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {addingSession ? (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <input className="input-field flex-1 text-sm" placeholder="Session name" value={newSession}
                onChange={e => setNewSession(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSession()} autoFocus />
              <button onClick={addSession} className="btn-primary text-sm px-3">Add</button>
              <button onClick={() => setAddingSession(false)} className="text-stone hover:text-ivory text-xs px-2">✕</button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newSessionIsRun} onChange={e => setNewSessionIsRun(e.target.checked)} className="accent-gold" />
              <span className="text-xs text-stone">This is a run session</span>
            </label>
          </div>
        ) : (
          <button onClick={() => setAddingSession(true)} className="mt-3 text-xs text-stone hover:text-gold transition-colors">+ Add session</button>
        )}
      </div>

      {/* Weight Log */}
      <div className="card">
        <p className="card-label mb-3">WEIGHT LOG</p>
        <div className="flex items-end gap-4 mb-4">
          <div>
            {latestWeight ? (
              <>
                <p className="card-value font-serif">{latestWeight} <span className="text-sm text-stone">kg</span></p>
                <p className={`text-xs mt-0.5 ${kgToGoal > 0 ? 'text-coral' : 'text-sage'}`}>
                  {kgToGoal > 0 ? `${kgToGoal} kg to goal` : `${Math.abs(kgToGoal)} kg below goal`}
                </p>
              </>
            ) : <p className="text-stone text-sm">No entries yet</p>}
          </div>
          <div className="flex gap-2 ml-auto">
            <input className="input-field w-24 text-sm" placeholder="kg" value={newWeight}
              onChange={e => setNewWeight(e.target.value)} onKeyDown={e => e.key === 'Enter' && logWeight()} type="number" step="0.1" />
            <button onClick={logWeight} disabled={weightLoading} className="btn-primary text-sm px-3">{weightLoading ? '…' : 'Log'}</button>
          </div>
        </div>
        <div className="bg-subtle rounded-lg p-3">
          <WeightChart entries={weightEntries} />
          {!weightEntries.length && <p className="text-stone text-xs text-center py-4">Log your weight to see the chart</p>}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-stone">
          <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t border-dashed border-sage" />75 kg goal</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t border-gold" />Your weight</span>
        </div>
      </div>
    </div>
  )
}
