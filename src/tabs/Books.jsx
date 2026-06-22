import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_LABELS = {
  reading:       'Reading',
  finished:      'Finished',
  want_to_read:  'Want to Read',
}

const STATUS_COLORS = {
  reading:      'text-gold',
  finished:     'text-sage',
  want_to_read: 'text-stone',
}

const STATUS_BG = {
  reading:      'bg-gold',
  finished:     'bg-sage',
  want_to_read: 'bg-subtle',
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n === value ? null : n)}
          className={`text-base transition-colors ${n <= value ? 'text-gold' : 'text-stone hover:text-gold'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function BookCard({ book, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...book })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const payload = {
      title:       form.title.trim(),
      author:      form.author?.trim() || null,
      status:      form.status,
      started_at:  form.started_at || null,
      finished_at: form.finished_at || null,
      rating:      form.rating || null,
      notes:       form.notes?.trim() || null,
    }
    const { data } = await supabase.from('books').update(payload).eq('id', book.id).select().single()
    if (data) onUpdate(data)
    setSaving(false)
    setEditing(false)
  }

  async function cycleStatus() {
    const order = ['want_to_read', 'reading', 'finished']
    const next = order[(order.indexOf(book.status) + 1) % order.length]
    const patch = { status: next }
    if (next === 'reading' && !book.started_at) patch.started_at = new Date().toISOString().split('T')[0]
    if (next === 'finished' && !book.finished_at) patch.finished_at = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('books').update(patch).eq('id', book.id).select().single()
    if (data) onUpdate(data)
  }

  return (
    <div className="border border-dark-border rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-subtle transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <button
          onClick={e => { e.stopPropagation(); cycleStatus() }}
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_BG[book.status]} transition-colors`}
          title={`Status: ${STATUS_LABELS[book.status]} — click to advance`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ivory truncate">{book.title}</p>
          {book.author && <p className="text-[10px] text-stone truncate">{book.author}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {book.rating && (
            <span className="text-xs text-gold">{'★'.repeat(book.rating)}</span>
          )}
          <span className={`text-[10px] ${STATUS_COLORS[book.status]}`}>{STATUS_LABELS[book.status].toUpperCase()}</span>
          <span className="text-stone text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-dark-border p-3 space-y-3">
          {!editing ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {book.started_at && (
                  <div>
                    <p className="text-[10px] text-stone mb-0.5">STARTED</p>
                    <p className="text-ivory">{book.started_at}</p>
                  </div>
                )}
                {book.finished_at && (
                  <div>
                    <p className="text-[10px] text-stone mb-0.5">FINISHED</p>
                    <p className="text-ivory">{book.finished_at}</p>
                  </div>
                )}
              </div>
              {book.rating && (
                <div>
                  <p className="text-[10px] text-stone mb-1">RATING</p>
                  <p className="text-gold">{'★'.repeat(book.rating)}{'☆'.repeat(5 - book.rating)}</p>
                </div>
              )}
              {book.notes && (
                <div>
                  <p className="text-[10px] text-stone mb-1">NOTES</p>
                  <p className="text-xs text-ivory leading-relaxed whitespace-pre-wrap">{book.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setForm({ ...book }); setEditing(true) }}
                  className="text-xs text-stone hover:text-gold transition-colors">Edit</button>
                <button onClick={() => onDelete(book.id)}
                  className="text-xs text-stone hover:text-coral transition-colors ml-auto">Delete</button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-stone mb-1">TITLE</p>
                <input className="input-field w-full text-sm" value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <p className="text-[10px] text-stone mb-1">AUTHOR</p>
                <input className="input-field w-full text-sm" value={form.author || ''}
                  onChange={e => setForm(p => ({ ...p, author: e.target.value }))} />
              </div>
              <div>
                <p className="text-[10px] text-stone mb-1">STATUS</p>
                <select className="input-field w-full text-sm" value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="want_to_read">Want to Read</option>
                  <option value="reading">Reading</option>
                  <option value="finished">Finished</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-stone mb-1">STARTED</p>
                  <input className="input-field w-full text-sm" type="date" value={form.started_at || ''}
                    onChange={e => setForm(p => ({ ...p, started_at: e.target.value }))} />
                </div>
                <div>
                  <p className="text-[10px] text-stone mb-1">FINISHED</p>
                  <input className="input-field w-full text-sm" type="date" value={form.finished_at || ''}
                    onChange={e => setForm(p => ({ ...p, finished_at: e.target.value }))} />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-stone mb-1">RATING</p>
                <StarRating value={form.rating} onChange={r => setForm(p => ({ ...p, rating: r }))} />
              </div>
              <div>
                <p className="text-[10px] text-stone mb-1">NOTES</p>
                <textarea className="input-field w-full text-sm resize-none" rows={3}
                  value={form.notes || ''}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="btn-primary text-sm px-4">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="text-xs text-stone hover:text-ivory transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Books() {
  const [books, setBooks] = useState([])
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', author: '', status: 'want_to_read', started_at: '', finished_at: '', rating: null, notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchBooks = useCallback(async () => {
    const { data } = await supabase.from('books').select('*').order('created_at', { ascending: false })
    if (data) setBooks(data)
  }, [])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  async function addBook() {
    if (!form.title.trim()) return
    setSaving(true)
    const { data } = await supabase.from('books').insert({
      title:       form.title.trim(),
      author:      form.author.trim() || null,
      status:      form.status,
      started_at:  form.started_at || null,
      finished_at: form.finished_at || null,
      rating:      form.rating || null,
      notes:       form.notes.trim() || null,
    }).select().single()
    if (data) setBooks(prev => [data, ...prev])
    setForm({ title: '', author: '', status: 'want_to_read', started_at: '', finished_at: '', rating: null, notes: '' })
    setSaving(false)
    setAdding(false)
  }

  async function deleteBook(id) {
    await supabase.from('books').delete().eq('id', id)
    setBooks(prev => prev.filter(b => b.id !== id))
  }

  function updateBook(updated) {
    setBooks(prev => prev.map(b => b.id === updated.id ? updated : b))
  }

  const filtered = filter === 'all' ? books : books.filter(b => b.status === filter)
  const counts = {
    all:          books.length,
    reading:      books.filter(b => b.status === 'reading').length,
    finished:     books.filter(b => b.status === 'finished').length,
    want_to_read: books.filter(b => b.status === 'want_to_read').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Books</h2>
        <p className="section-sub">READING LOG · {counts.finished} FINISHED · {counts.reading} READING</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="card-label mb-1">FINISHED</p>
          <p className="card-value font-serif text-2xl text-sage">{counts.finished}</p>
        </div>
        <div className="card text-center">
          <p className="card-label mb-1">READING</p>
          <p className="card-value font-serif text-2xl text-gold">{counts.reading}</p>
        </div>
        <div className="card text-center">
          <p className="card-label mb-1">WANT TO</p>
          <p className="card-value font-serif text-2xl text-stone">{counts.want_to_read}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-dark-border pb-3">
        {[
          { key: 'all', label: `All (${counts.all})` },
          { key: 'reading', label: 'Reading' },
          { key: 'finished', label: 'Finished' },
          { key: 'want_to_read', label: 'Want to Read' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              filter === key ? 'bg-gold text-surface font-medium' : 'text-stone hover:text-ivory'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Add book */}
      {!adding ? (
        <button onClick={() => setAdding(true)} className="btn-primary w-full">+ Add Book</button>
      ) : (
        <div className="card space-y-3">
          <p className="card-label">NEW BOOK</p>
          <div>
            <p className="text-[10px] text-stone mb-1">TITLE *</p>
            <input className="input-field w-full text-sm" placeholder="Book title"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addBook()} autoFocus />
          </div>
          <div>
            <p className="text-[10px] text-stone mb-1">AUTHOR</p>
            <input className="input-field w-full text-sm" placeholder="Author name"
              value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} />
          </div>
          <div>
            <p className="text-[10px] text-stone mb-1">STATUS</p>
            <select className="input-field w-full text-sm" value={form.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option value="want_to_read">Want to Read</option>
              <option value="reading">Reading</option>
              <option value="finished">Finished</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-stone mb-1">STARTED</p>
              <input className="input-field w-full text-sm" type="date" value={form.started_at}
                onChange={e => setForm(p => ({ ...p, started_at: e.target.value }))} />
            </div>
            <div>
              <p className="text-[10px] text-stone mb-1">FINISHED</p>
              <input className="input-field w-full text-sm" type="date" value={form.finished_at}
                onChange={e => setForm(p => ({ ...p, finished_at: e.target.value }))} />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-stone mb-1">RATING</p>
            <StarRating value={form.rating} onChange={r => setForm(p => ({ ...p, rating: r }))} />
          </div>
          <div>
            <p className="text-[10px] text-stone mb-1">NOTES</p>
            <textarea className="input-field w-full text-sm resize-none" rows={2} placeholder="Thoughts, quotes…"
              value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={addBook} disabled={saving} className="btn-primary text-sm px-4">
              {saving ? 'Adding…' : 'Add'}
            </button>
            <button onClick={() => setAdding(false)} className="text-xs text-stone hover:text-ivory transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Book list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-stone text-sm text-center py-6">
            {filter === 'all' ? 'No books yet — add your first one.' : `No books with status "${STATUS_LABELS[filter]}".`}
          </p>
        )}
        {filtered.map(book => (
          <BookCard key={book.id} book={book} onUpdate={updateBook} onDelete={deleteBook} />
        ))}
      </div>
    </div>
  )
}
