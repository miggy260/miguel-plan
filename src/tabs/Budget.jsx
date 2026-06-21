import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SALARY = 1800
const SAVINGS_TARGET = 1200
const SPEND_BUDGET = 600

const CATEGORIES = ['Food', 'Gym', 'Transport', 'Going Out', 'Subscriptions', 'Other']

const CAT_COLORS = {
  Food: '#E8D5A3',
  Gym: '#7EC8A4',
  Transport: '#E87C5A',
  'Going Out': '#9B8FD4',
  Subscriptions: '#6BAED6',
  Other: '#666660',
}

function toDateStr(d) { return d.toISOString().split('T')[0] }

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: toDateStr(start), end: toDateStr(end) }
}

// ── Donut chart for category breakdown ───────────────────────────────────────
function DonutChart({ data, total }) {
  if (!total) return null
  const R = 54, CX = 70, CY = 70, STROKE = 18
  const circ = 2 * Math.PI * R
  let offset = 0
  const slices = data.map(({ cat, amount }) => {
    const pct = amount / total
    const slice = { cat, pct, offset }
    offset += pct
    return slice
  })

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1E1E1A" strokeWidth={STROKE} />
      {slices.map(({ cat, pct, offset }) => (
        <circle
          key={cat}
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={CAT_COLORS[cat]}
          strokeWidth={STROKE}
          strokeDasharray={`${(pct * circ).toFixed(2)} ${circ}`}
          strokeDashoffset={(-offset * circ + circ / 4).toFixed(2)}
        />
      ))}
      <text x={CX} y={CY - 5} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#F0EDE6"
        style={{ fontFamily: 'DM Mono, monospace' }}>
        €{total.toFixed(0)}
      </text>
      <text x={CX} y={CY + 10} textAnchor="middle" fontSize="8" fill="#666660"
        style={{ fontFamily: 'DM Mono, monospace' }}>
        SPENT
      </text>
    </svg>
  )
}

export default function Budget() {
  const today = toDateStr(new Date())
  const { start: monthStart, end: monthEnd } = getMonthRange()
  const monthLabel = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase()

  // Transactions
  const [transactions, setTransactions] = useState([])
  const [form, setForm] = useState({ date: today, amount: '', category: 'Food', description: '' })
  const [saving, setSaving] = useState(false)

  // Investments
  const [investments, setInvestments] = useState([])
  const [invForm, setInvForm] = useState({ date: today, amount: '', type: 'VOO', note: '' })
  const [invSaving, setInvSaving] = useState(false)

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase
      .from('budget_transactions')
      .select('*')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: false })
    if (data) setTransactions(data)
  }, [monthStart, monthEnd])

  const fetchInvestments = useCallback(async () => {
    const { data } = await supabase
      .from('investments')
      .select('*')
      .order('date', { ascending: false })
    if (data) setInvestments(data)
  }, [])

  useEffect(() => {
    fetchTransactions()
    fetchInvestments()
  }, [fetchTransactions, fetchInvestments])

  async function addTransaction() {
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) return
    setSaving(true)
    await supabase.from('budget_transactions').insert({
      date: form.date,
      amount,
      category: form.category,
      description: form.description.trim() || null,
    })
    await fetchTransactions()
    setForm(prev => ({ ...prev, amount: '', description: '' }))
    setSaving(false)
  }

  async function deleteTransaction(id) {
    await supabase.from('budget_transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  async function addInvestment() {
    const amount = parseFloat(invForm.amount)
    if (!amount || amount <= 0) return
    setInvSaving(true)
    await supabase.from('investments').insert({
      date: invForm.date,
      amount,
      type: invForm.type,
      note: invForm.note.trim() || null,
    })
    await fetchInvestments()
    setInvForm(prev => ({ ...prev, amount: '', note: '' }))
    setInvSaving(false)
  }

  async function deleteInvestment(id) {
    await supabase.from('investments').delete().eq('id', id)
    setInvestments(prev => prev.filter(i => i.id !== id))
  }

  // ── Derived numbers ──────────────────────────────────────────────────────────
  const totalSpent = transactions.reduce((s, t) => s + parseFloat(t.amount), 0)
  const remaining = SPEND_BUDGET - totalSpent
  const remainingPct = Math.max(0, remaining / SPEND_BUDGET)

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    amount: transactions.filter(t => t.category === cat).reduce((s, t) => s + parseFloat(t.amount), 0),
  })).filter(c => c.amount > 0)

  const vooTotal = investments.filter(i => i.type === 'VOO').reduce((s, i) => s + parseFloat(i.amount), 0)
  const savingsTotal = investments.filter(i => i.type === 'Savings').reduce((s, i) => s + parseFloat(i.amount), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Budget</h2>
        <p className="section-sub">€1,800 SALARY · €1,200 SAVED · €600 SPENDING</p>
      </div>

      {/* ── Monthly overview ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="card-label mb-1">SALARY</p>
          <p className="card-value font-serif text-xl">€{SALARY.toLocaleString()}</p>
        </div>
        <div className="card text-center">
          <p className="card-label mb-1">SPENT</p>
          <p className={`card-value font-serif text-xl ${totalSpent > SPEND_BUDGET ? 'text-coral' : 'text-ivory'}`}>
            €{totalSpent.toFixed(0)}
          </p>
          <p className="text-[10px] text-stone mt-0.5">of €{SPEND_BUDGET}</p>
        </div>
        <div className="card text-center">
          <p className="card-label mb-1">REMAINING</p>
          <p className={`card-value font-serif text-xl ${remaining < 0 ? 'text-coral' : 'text-sage'}`}>
            €{Math.abs(remaining).toFixed(0)}
          </p>
          <p className="text-[10px] text-stone mt-0.5">{remaining < 0 ? 'over budget' : 'left'}</p>
        </div>
      </div>

      {/* ── Spend bar ── */}
      <div className="card">
        <div className="flex justify-between text-[10px] text-stone mb-2">
          <span>{monthLabel}</span>
          <span>{((totalSpent / SPEND_BUDGET) * 100).toFixed(0)}% used</span>
        </div>
        <div className="h-2 bg-subtle rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, (totalSpent / SPEND_BUDGET) * 100)}%`,
              background: totalSpent > SPEND_BUDGET ? '#E87C5A' : '#E8D5A3',
            }}
          />
        </div>
      </div>

      {/* ── Category breakdown ── */}
      {byCategory.length > 0 && (
        <div className="card">
          <p className="card-label mb-4">BREAKDOWN</p>
          <div className="flex gap-4 items-center">
            <DonutChart data={byCategory} total={totalSpent} />
            <div className="flex-1 space-y-2">
              {byCategory.map(({ cat, amount }) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[cat] }} />
                  <span className="text-xs text-stone flex-1">{cat}</span>
                  <span className="text-xs text-ivory font-mono">€{amount.toFixed(0)}</span>
                  <span className="text-[10px] text-stone w-8 text-right">{((amount / totalSpent) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Add transaction ── */}
      <div className="card">
        <p className="card-label mb-3">ADD TRANSACTION</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-[10px] text-stone mb-1">DATE</p>
            <input className="input-field w-full text-sm" type="date" value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <p className="text-[10px] text-stone mb-1">AMOUNT (€)</p>
            <input className="input-field w-full text-sm" type="number" step="0.01" placeholder="0.00"
              value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addTransaction()} />
          </div>
          <div>
            <p className="text-[10px] text-stone mb-1">CATEGORY</p>
            <select className="input-field w-full text-sm" value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[10px] text-stone mb-1">DESCRIPTION</p>
            <input className="input-field w-full text-sm" placeholder="Optional"
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addTransaction()} />
          </div>
        </div>
        <button onClick={addTransaction} disabled={saving} className="btn-primary w-full">
          {saving ? 'Adding…' : 'Add Transaction'}
        </button>
      </div>

      {/* ── Transaction log ── */}
      {transactions.length > 0 && (
        <div className="card">
          <p className="card-label mb-3">TRANSACTIONS — {monthLabel}</p>
          <div className="space-y-2">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center gap-3 py-1.5 border-b border-dark-border last:border-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[t.category] || '#666660' }} />
                <span className="text-[10px] text-stone w-12 flex-shrink-0">{t.date.slice(5)}</span>
                <span className="text-xs text-stone flex-shrink-0">{t.category}</span>
                <span className="text-xs text-ivory flex-1 truncate">{t.description || ''}</span>
                <span className="text-sm text-ivory font-mono flex-shrink-0">€{parseFloat(t.amount).toFixed(2)}</span>
                <button onClick={() => deleteTransaction(t.id)} className="text-stone hover:text-coral text-xs flex-shrink-0">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VOO / Savings tracker ── */}
      <div className="card">
        <p className="card-label mb-3">INVESTMENTS</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-subtle rounded-lg p-3">
            <p className="text-[10px] text-stone mb-1">VOO TOTAL</p>
            <p className="card-value font-serif text-xl text-gold">€{vooTotal.toLocaleString('en', { minimumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-subtle rounded-lg p-3">
            <p className="text-[10px] text-stone mb-1">SAVINGS TOTAL</p>
            <p className="card-value font-serif text-xl text-sage">€{savingsTotal.toLocaleString('en', { minimumFractionDigits: 0 })}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-[10px] text-stone mb-1">DATE</p>
            <input className="input-field w-full text-sm" type="date" value={invForm.date}
              onChange={e => setInvForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <p className="text-[10px] text-stone mb-1">AMOUNT (€)</p>
            <input className="input-field w-full text-sm" type="number" step="0.01" placeholder="0.00"
              value={invForm.amount} onChange={e => setInvForm(p => ({ ...p, amount: e.target.value }))} />
          </div>
          <div>
            <p className="text-[10px] text-stone mb-1">TYPE</p>
            <select className="input-field w-full text-sm" value={invForm.type}
              onChange={e => setInvForm(p => ({ ...p, type: e.target.value }))}>
              <option>VOO</option>
              <option>Savings</option>
            </select>
          </div>
          <div>
            <p className="text-[10px] text-stone mb-1">NOTE</p>
            <input className="input-field w-full text-sm" placeholder="Optional"
              value={invForm.note} onChange={e => setInvForm(p => ({ ...p, note: e.target.value }))} />
          </div>
        </div>
        <button onClick={addInvestment} disabled={invSaving} className="btn-primary w-full mb-4">
          {invSaving ? 'Adding…' : 'Log Investment'}
        </button>

        {investments.length > 0 && (
          <div className="space-y-2">
            {investments.slice(0, 10).map(i => (
              <div key={i.id} className="flex items-center gap-3 py-1.5 border-b border-dark-border last:border-0">
                <span className={`text-[10px] font-mono flex-shrink-0 ${i.type === 'VOO' ? 'text-gold' : 'text-sage'}`}>{i.type}</span>
                <span className="text-[10px] text-stone w-12 flex-shrink-0">{i.date.slice(5)}</span>
                <span className="text-xs text-ivory flex-1 truncate">{i.note || ''}</span>
                <span className="text-sm text-ivory font-mono flex-shrink-0">€{parseFloat(i.amount).toFixed(2)}</span>
                <button onClick={() => deleteInvestment(i.id)} className="text-stone hover:text-coral text-xs flex-shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
