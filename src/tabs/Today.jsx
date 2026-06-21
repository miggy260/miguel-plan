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

// Sessions indexed by JS day-of-week (0=Sun)
const SESSIONS_BY_DOW = {
  1: [
    { id: 'legs_strength', label: 'Legs Strength', isRun: false },
    { id: 'run_5km', label: '5km Run', isRun: true },
    { id: 'sauna', label: 'Sauna', isRun: false },
  ],
  2: [
    { id: 'push1', label: 'Push 1', isRun: false },
    { id: 'run_5_5km', label: '5.5km Easy Run', isRun: true },
    { id: 'sauna', label: 'Sauna', isRun: false },
  ],
  3: [
    { id: 'pull1', label: 'Pull 1', isRun: false },
  ],
  4: [
    { id: 'james_session', label: 'James Session', isRun: false },
    { id: 'tempo_run_8_4', label: 'Tempo Run 8.4km', isRun: true },
  ],
  5: [
    { id: 'push2', label: 'Push 2', isRun: false },
    { id: 'sauna', label: 'Sauna', isRun: false },
  ],
  6: [
    { id: 'push2_sat', label: 'Push 2', isRun: false },
    { id: 'long_run_9_5', label: '9.5km Long Run', isRun: true },
  ],
  0: [
    { id: 'pull2', label: 'Pull 2', isRun: false },
  ],
}

function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

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

// ── Weight chart (SVG, last 10 entries) ──────────────────────────────────────
function WeightChart({ entries }) {
  if (!entries.length) return null
  const W = 480, H = 140, PAD = { t: 16, r: 16, b: 32, l: 40 }
  const vals = entries.map(e => e.weight)
  const allVals = [...vals, WEIGHT_GOAL]
  const minV = Math.min(...allVals) - 1
  const maxV = Math.max(...allVals) + 1
  const n = entries.length
  const xScale = i => PAD.l + (i / Math.max(n - 1, 1)) * (W - PAD.l - PAD.r)
  const yScale = v => PAD.t + ((maxV - v) / (maxV - minV)) * (H - PAD.t - PAD.b)

  const linePath = entries.map((e, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(e.weight).toFixed(1)}`).join(' ')
  const goalY = yScale(WEIGHT_GOAL).toFixed(1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: 'DM Mono, monospace' }}>
      {/* goal line */}
      <line x1={PAD.l} y1={goalY} x2={W - PAD.r} y2={goalY} stroke="#7EC8A4" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
      <text x={W - PAD.r + 4} y={Number(goalY) + 4} fontSize="9" fill="#7EC8A4" opacity="0.8">75</text>

      {/* weight line */}
      <path d={linePath} fill="none" stroke="#E8D5A3" strokeWidth="1.5" />

      {/* dots + labels */}
      {entries.map((e, i) => (
        <g key={e.date}>
          <circle cx={xScale(i)} cy={yScale(e.weight)} r="3" fill="#E8D5A3" />
          <text x={xScale(i)} y={yScale(e.weight) - 7} textAnchor="middle" fontSize="9" fill="#E8D5A3">{e.weight}</text>
        </g>
      ))}

      {/* x-axis labels */}
      {entries.map((e, i) => (
        <text key={e.date + 'l'} x={xScale(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="#666660">
          {e.date.slice(5)}
        </text>
      ))}

      {/* y-axis */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#222220" strokeWidth="1" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Today() {
  const today = toDateStr(new Date())
  const dow = new Date().getDay()
  const todaySessions = SESSIONS_BY_DOW[dow] || []
  const { monday, sunday } = getWeekRange()

  // Tasks
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')

  // Routines
  const [morningDone, setMorningDone] = useState({})
  const [eveningDone, setEveningDone] = useState({})
  const [preRunDone, setPreRunDone] = useState({})
  const [preRunOpen, setPreRunOpen] = useState(true)

  // Sessions
  const [sessionDone, setSessionDone] = useState({})
  const [runData, setRunData] = useState({}) // { session_id: { distance, pace, hr } }

  // Weekly km
  const [weeklyKm, setWeeklyKm] = useState(null)

  // Weight
  const [weightEntries, setWeightEntries] = useState([])
  const [newWeight, setNewWeight] = useState('')
  const [weightLoading, setWeightLoading] = useState(false)

  // ── Fetch all today's data ──────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('date', today)
      .order('position')
    if (data) setTasks(data)
  }, [today])

  const fetchRoutines = useCallback(async () => {
    const { data } = await supabase
      .from('routine_completions')
      .select('*')
      .eq('date', today)
    if (data) {
      const m = {}, e = {}, p = {}
      data.forEach(r => {
        if (r.type === 'morning') m[r.item_id] = r.done
        else if (r.type === 'evening') e[r.item_id] = r.done
        else if (r.type === 'pre_run') p[r.item_id] = r.done
      })
      setMorningDone(m)
      setEveningDone(e)
      setPreRunDone(p)
    }
  }, [today])

  const fetchSessions = useCallback(async () => {
    const { data } = await supabase
      .from('session_completions')
      .select('*')
      .eq('date', today)
    if (data) {
      const done = {}, run = {}
      data.forEach(s => {
        done[s.session_id] = s.done
        if (s.run_distance || s.run_pace || s.run_hr) {
          run[s.session_id] = { distance: s.run_distance ?? '', pace: s.run_pace ?? '', hr: s.run_hr ?? '' }
        }
      })
      setSessionDone(done)
      setRunData(run)
    }
  }, [today])

  const fetchWeeklyKm = useCallback(async () => {
    const { data } = await supabase
      .from('session_completions')
      .select('run_distance')
      .gte('date', monday)
      .lte('date', sunday)
      .eq('done', true)
      .not('run_distance', 'is', null)
    if (data) {
      const total = data.reduce((sum, r) => sum + (parseFloat(r.run_distance) || 0), 0)
      setWeeklyKm(total)
    }
  }, [monday, sunday])

  const fetchWeight = useCallback(async () => {
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(10)
    if (data) setWeightEntries([...data].reverse())
  }, [])

  useEffect(() => {
    fetchTasks()
    fetchRoutines()
    fetchSessions()
    fetchWeeklyKm()
    fetchWeight()
  }, [fetchTasks, fetchRoutines, fetchSessions, fetchWeeklyKm, fetchWeight])

  // ── Task actions ────────────────────────────────────────────────────────────
  async function addTask() {
    const text = newTask.trim()
    if (!text || tasks.length >= 3) return
    const { data } = await supabase
      .from('daily_tasks')
      .insert({ date: today, text, done: false, position: tasks.length })
      .select()
      .single()
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

  // ── Routine toggle ──────────────────────────────────────────────────────────
  async function toggleRoutine(type, itemId) {
    const stateMap = type === 'morning' ? morningDone : type === 'evening' ? eveningDone : preRunDone
    const setter = type === 'morning' ? setMorningDone : type === 'evening' ? setEveningDone : setPreRunDone
    const newDone = !stateMap[itemId]

    setter(prev => ({ ...prev, [itemId]: newDone }))

    await supabase
      .from('routine_completions')
      .upsert({ date: today, type, item_id: itemId, done: newDone }, { onConflict: 'date,type,item_id' })
  }

  // ── Session toggle + run data ───────────────────────────────────────────────
  async function toggleSession(sessionId) {
    const newDone = !sessionDone[sessionId]
    setSessionDone(prev => ({ ...prev, [sessionId]: newDone }))

    const rd = runData[sessionId] || {}
    await supabase.from('session_completions').upsert({
      date: today,
      session_id: sessionId,
      done: newDone,
      run_distance: rd.distance ? parseFloat(rd.distance) : null,
      run_pace: rd.pace || null,
      run_hr: rd.hr ? parseInt(rd.hr) : null,
    }, { onConflict: 'date,session_id' })

    fetchWeeklyKm()
  }

  async function saveRunData(sessionId, field, value) {
    setRunData(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), [field]: value } }))
  }

  async function commitRunData(sessionId) {
    if (!sessionDone[sessionId]) return
    const rd = runData[sessionId] || {}
    await supabase.from('session_completions').upsert({
      date: today,
      session_id: sessionId,
      done: true,
      run_distance: rd.distance ? parseFloat(rd.distance) : null,
      run_pace: rd.pace || null,
      run_hr: rd.hr ? parseInt(rd.hr) : null,
    }, { onConflict: 'date,session_id' })
    fetchWeeklyKm()
  }

  // ── Weight log ──────────────────────────────────────────────────────────────
  async function logWeight() {
    const w = parseFloat(newWeight)
    if (!w || w < 30 || w > 200) return
    setWeightLoading(true)
    await supabase
      .from('weight_logs')
      .upsert({ date: today, weight: w }, { onConflict: 'date' })
    await fetchWeight()
    setNewWeight('')
    setWeightLoading(false)
  }

  const hasRunToday = todaySessions.some(s => s.isRun)
  const preRunChecked = PRE_RUN_ITEMS.filter(i => preRunDone[i.id]).length

  const latestWeight = weightEntries.length ? weightEntries[weightEntries.length - 1].weight : null
  const kgToGoal = latestWeight ? (latestWeight - WEIGHT_GOAL).toFixed(1) : null

  // ── Render ──────────────────────────────────────────────────────────────────
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).toUpperCase()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Today</h2>
        <p className="section-sub">{dateStr}</p>
      </div>

      {/* ── Top 3 Tasks ── */}
      <div className="card">
        <p className="card-label mb-3">TOP 3 TASKS</p>
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-3">
              <button
                onClick={() => toggleTask(task.id, task.done)}
                className={`w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors ${
                  task.done ? 'bg-gold border-gold' : 'border-dark-border'
                }`}
              >
                {task.done && <span className="text-[10px] text-surface font-bold">✓</span>}
              </button>
              <span className={`flex-1 text-sm ${task.done ? 'line-through text-stone' : 'text-ivory'}`}>
                {task.text}
              </span>
              <button onClick={() => deleteTask(task.id)} className="text-stone hover:text-coral text-xs transition-colors">✕</button>
            </div>
          ))}
        </div>

        {tasks.length < 3 && (
          <div className="flex gap-2 mt-3">
            <input
              className="input-field flex-1 text-sm"
              placeholder={`Task ${tasks.length + 1} of 3`}
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
            />
            <button onClick={addTask} className="btn-primary text-sm px-3">Add</button>
          </div>
        )}
        {tasks.length === 0 && !newTask && (
          <p className="text-stone text-xs mt-2">No tasks yet — add up to 3 for today.</p>
        )}
      </div>

      {/* ── Routines ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <p className="card-label mb-3">MORNING ROUTINE</p>
          <div className="space-y-2">
            {MORNING_ITEMS.map(item => (
              <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => toggleRoutine('morning', item.id)}
                  className={`w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                    morningDone[item.id] ? 'bg-sage border-sage' : 'border-dark-border group-hover:border-stone'
                  }`}
                >
                  {morningDone[item.id] && <span className="text-[10px] text-surface font-bold">✓</span>}
                </div>
                <span className={`text-sm transition-colors ${morningDone[item.id] ? 'text-stone line-through' : 'text-ivory'}`}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="card-label mb-3">EVENING ROUTINE</p>
          <div className="space-y-2">
            {EVENING_ITEMS.map(item => (
              <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => toggleRoutine('evening', item.id)}
                  className={`w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                    eveningDone[item.id] ? 'bg-sage border-sage' : 'border-dark-border group-hover:border-stone'
                  }`}
                >
                  {eveningDone[item.id] && <span className="text-[10px] text-surface font-bold">✓</span>}
                </div>
                <span className={`text-sm transition-colors ${eveningDone[item.id] ? 'text-stone line-through' : 'text-ivory'}`}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pre-Run Checklist ── */}
      {hasRunToday && (
        <div className="card">
          <button
            className="flex items-center justify-between w-full"
            onClick={() => setPreRunOpen(o => !o)}
          >
            <div className="flex items-center gap-3">
              <p className="card-label">PRE-RUN CHECKLIST</p>
              <span className="text-[10px] text-stone">{preRunChecked}/{PRE_RUN_ITEMS.length}</span>
              {preRunChecked === PRE_RUN_ITEMS.length && (
                <span className="text-[10px] text-sage">READY</span>
              )}
            </div>
            <span className="text-stone text-xs">{preRunOpen ? '▲' : '▼'}</span>
          </button>

          {preRunOpen && (
            <div className="mt-3 space-y-2">
              {PRE_RUN_ITEMS.map(item => (
                <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                  <div
                    onClick={() => toggleRoutine('pre_run', item.id)}
                    className={`w-4 h-4 mt-0.5 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                      preRunDone[item.id] ? 'bg-gold border-gold' : 'border-dark-border group-hover:border-stone'
                    }`}
                  >
                    {preRunDone[item.id] && <span className="text-[10px] text-surface font-bold">✓</span>}
                  </div>
                  <span className={`text-sm leading-snug transition-colors ${preRunDone[item.id] ? 'text-stone line-through' : 'text-ivory'}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Today's Sessions ── */}
      <div className="card">
        <div className="flex items-baseline justify-between mb-3">
          <p className="card-label">TODAY'S SESSIONS</p>
          {weeklyKm !== null && (
            <span className="text-xs text-stone">
              Week: <span className="text-gold font-mono">{weeklyKm.toFixed(1)} km</span>
            </span>
          )}
        </div>

        {todaySessions.length === 0 ? (
          <p className="text-stone text-sm">Rest day.</p>
        ) : (
          <div className="space-y-3">
            {todaySessions.map(session => (
              <div key={session.id} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => toggleSession(session.id)}
                    className={`w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                      sessionDone[session.id] ? 'bg-gold border-gold' : 'border-dark-border hover:border-stone'
                    }`}
                  >
                    {sessionDone[session.id] && <span className="text-[10px] text-surface font-bold">✓</span>}
                  </div>
                  <span className={`text-sm ${sessionDone[session.id] ? 'text-stone line-through' : 'text-ivory'}`}>
                    {session.label}
                  </span>
                </div>

                {session.isRun && sessionDone[session.id] && (
                  <div className="ml-7 grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-stone mb-1">DISTANCE (km)</p>
                      <input
                        className="input-field w-full text-sm"
                        placeholder="0.00"
                        value={runData[session.id]?.distance ?? ''}
                        onChange={e => saveRunData(session.id, 'distance', e.target.value)}
                        onBlur={() => commitRunData(session.id)}
                        type="number"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-stone mb-1">AVG PACE (/km)</p>
                      <input
                        className="input-field w-full text-sm"
                        placeholder="5:30"
                        value={runData[session.id]?.pace ?? ''}
                        onChange={e => saveRunData(session.id, 'pace', e.target.value)}
                        onBlur={() => commitRunData(session.id)}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-stone mb-1">AVG HR (bpm)</p>
                      <input
                        className="input-field w-full text-sm"
                        placeholder="145"
                        value={runData[session.id]?.hr ?? ''}
                        onChange={e => saveRunData(session.id, 'hr', e.target.value)}
                        onBlur={() => commitRunData(session.id)}
                        type="number"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Weight Log ── */}
      <div className="card">
        <p className="card-label mb-3">WEIGHT LOG</p>

        <div className="flex items-end gap-4 mb-4">
          <div>
            {latestWeight && (
              <>
                <p className="card-value font-serif">{latestWeight} <span className="text-sm text-stone">kg</span></p>
                <p className={`text-xs mt-0.5 ${kgToGoal > 0 ? 'text-coral' : 'text-sage'}`}>
                  {kgToGoal > 0 ? `${kgToGoal} kg to goal` : `${Math.abs(kgToGoal)} kg below goal`}
                </p>
              </>
            )}
            {!latestWeight && <p className="text-stone text-sm">No entries yet</p>}
          </div>
          <div className="flex gap-2 ml-auto">
            <input
              className="input-field w-24 text-sm"
              placeholder="kg"
              value={newWeight}
              onChange={e => setNewWeight(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && logWeight()}
              type="number"
              step="0.1"
            />
            <button onClick={logWeight} disabled={weightLoading} className="btn-primary text-sm px-3">
              {weightLoading ? '…' : 'Log'}
            </button>
          </div>
        </div>

        <div className="bg-subtle rounded-lg p-3">
          <WeightChart entries={weightEntries} />
          {!weightEntries.length && (
            <p className="text-stone text-xs text-center py-4">Log your weight to see the chart</p>
          )}
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-stone">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t border-dashed border-sage" />
            75 kg goal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t border-gold" />
            Your weight
          </span>
        </div>
      </div>
    </div>
  )
}
