import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Plus, Users, GraduationCap, MapPin, Calendar, ChevronRight, Edit2, Trash2, Upload, Download, Search, X, CheckCircle, AlertCircle, RefreshCw, Lock, Unlock, UserCheck, UserX, Shield, ChevronLeft, ChevronDown, FileText } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001'
const SQUAD_NAMES = ['Surya', 'Chandra', 'Mangal', 'Budh', 'Guru', 'Shukra', 'Shani', 'Rahu', 'Ketu', 'Agni']
const SQUAD_COLORS = {
  Surya: '#f59e0b', Chandra: '#8b5cf6', Mangal: '#ef4444', Budh: '#10b981',
  Guru: '#f97316', Shukra: '#ec4899', Shani: '#64748b', Rahu: '#1e293b',
  Ketu: '#06b6d4', Agni: '#dc2626'
}

// ─── Toast Hook ───────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([])
  const toast = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])
  return { toasts, toast }
}

function ToastContainer({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' && <CheckCircle size={18} className="toast-icon" />}
          {t.type === 'error' && <AlertCircle size={18} className="toast-icon" />}
          <span style={{ fontSize: '14px', fontWeight: '500' }}>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Pagination Component ─────────────────────────────────────────────────────
function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null
  const { page, pages, total, limit } = pagination
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  const pageNums = []
  let lo = Math.max(1, page - 2), hi = Math.min(pages, page + 2)
  for (let i = lo; i <= hi; i++) pageNums.push(i)

  return (
    <div className="pagination">
      <button className="pagination-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft size={14} />
      </button>
      {lo > 1 && <><button className="pagination-btn" onClick={() => onPageChange(1)}>1</button>{lo > 2 && <span style={{ color: 'var(--text-4)', padding: '0 4px' }}>…</span>}</>}
      {pageNums.map(n => (
        <button key={n} className={`pagination-btn ${n === page ? 'active' : ''}`} onClick={() => onPageChange(n)}>{n}</button>
      ))}
      {hi < pages && <><span style={{ color: 'var(--text-4)', padding: '0 4px' }}>…</span><button className="pagination-btn" onClick={() => onPageChange(pages)}>{pages}</button></>}
      <button className="pagination-btn" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
        <ChevronRight size={14} />
      </button>
      <span className="pagination-info">Showing {start}–{end} of {total}</span>
    </div>
  )
}

// ─── Modal Wrapper ────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, size = '' }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn-icon" onClick={onClose} style={{ border: 'none', padding: 4 }}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

// ─── Batch Form Modal ─────────────────────────────────────────────────────────
function BatchFormModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({ name: '', location: '', start_date: '', end_date: '', status: 'upcoming', description: '', batch_code: '', year: String(new Date().getFullYear()), capacity: '' })
  
  useEffect(() => { 
    if (initial) {
      setForm({
        name: initial.name || '',
        location: initial.location || '',
        start_date: initial.start_date || '',
        end_date: initial.end_date || '',
        status: initial.status || 'upcoming',
        description: initial.description || '',
        batch_code: initial.batch_code || '',
        year: initial.year || String(new Date().getFullYear()),
        capacity: initial.capacity || ''
      })
    } else { 
      setForm({ name: '', location: '', start_date: '', end_date: '', status: 'upcoming', description: '', batch_code: '', year: String(new Date().getFullYear()), capacity: '' }) 
    } 
  }, [initial, open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Batch' : 'Create New Batch'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Batch Name *</label>
            <input className="input-field input-field-rect" placeholder="e.g. LTC Nashik" value={form.name} onChange={e => set('name', e.target.value)} style={{ marginBottom: 0 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Year *</label>
            <input type="number" className="input-field input-field-rect" placeholder="e.g. 2026" value={form.year} onChange={e => set('year', e.target.value)} style={{ marginBottom: 0 }} />
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Batch Code</label>
            <input className="input-field input-field-rect" placeholder="Auto-generated if blank" value={form.batch_code} onChange={e => set('batch_code', e.target.value)} style={{ marginBottom: 0 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Capacity (Max Students)</label>
            <input type="number" className="input-field input-field-rect" placeholder="e.g. 250" value={form.capacity} onChange={e => set('capacity', e.target.value)} style={{ marginBottom: 0 }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Location</label>
          <input className="input-field input-field-rect" placeholder="e.g. MIT Campus, Pune" value={form.location} onChange={e => set('location', e.target.value)} style={{ marginBottom: 0 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Start Date</label>
            <input type="date" className="input-field input-field-rect" value={form.start_date} onChange={e => set('start_date', e.target.value)} style={{ marginBottom: 0 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>End Date</label>
            <input type="date" className="input-field input-field-rect" value={form.end_date} onChange={e => set('end_date', e.target.value)} style={{ marginBottom: 0 }} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Status</label>
          <select className="input-field input-field-rect" value={form.status} onChange={e => set('status', e.target.value)} style={{ marginBottom: 0, borderRadius: 12 }}>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Description</label>
          <textarea className="input-field" placeholder="Optional notes about this batch..." value={form.description} onChange={e => set('description', e.target.value)} style={{ marginBottom: 0, minHeight: 80, borderRadius: 12 }} />
        </div>
      </div>
      <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0, marginTop: 20 }}>
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={() => onSave(form)} disabled={!form.name.trim()}>{initial ? 'Save Changes' : 'Create Batch'}</button>
      </div>
    </Modal>
  )
}

// ─── Batch Students Tab ───────────────────────────────────────────────────────
function BatchStudentsTab({ batchId, token, toast }) {
  const [students, setStudents] = useState([])
  const [pagination, setPagination] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fetchStudents = useCallback(async (pg = 1, q = search) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/batches/${batchId}/students?page=${pg}&limit=50&search=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) { setStudents(data.students); setPagination(data.pagination) }
    } finally { setLoading(false) }
  }, [batchId, token, search])

  useEffect(() => { fetchStudents(1, '') }, [batchId])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchStudents(1, search) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const handleRemove = async (studentId) => {
    if (!window.confirm('Remove this student from the batch? Their master record will be preserved.')) return
    await fetch(`${API}/api/admin/batches/${batchId}/students/${studentId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    })
    toast('Student removed from batch.', 'success')
    fetchStudents(page, search)
  }

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const name = file.name.toLowerCase()
    const parse = (records) => processBulkUpload(records)

    if (name.endsWith('.csv')) {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => parse(r.data), error: () => toast('CSV parse error', 'error') })
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const reader = new FileReader()
      reader.onload = evt => {
        const wb = XLSX.read(evt.target.result, { type: 'binary' })
        parse(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]))
      }
      reader.readAsBinaryString(file)
    }
    e.target.value = null
  }

  const processBulkUpload = async (records) => {
    setUploading(true)
    try {
      const res = await fetch(`${API}/api/admin/batches/${batchId}/bulk-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ records })
      })
      const data = await res.json()
      toast(`${data.studentsAdded} students added. ${data.notFound} not matched (or newly created).`, data.notFound > 0 ? 'warning' : 'success')
      fetchStudents(1, search)
    } finally { setUploading(false) }
  }

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(students.map(s => ({
      Name: s.name, Email: s.email, PRN: s.prn, Department: s.department,
      School: s.school, Semester: s.semester, Squad: s.squad || '', Room: s.room || '',
      Gender: s.gender, NRI: s.nri ? 'Yes' : 'No', Insured: s.insured ? 'Yes' : 'No',
      Barcode: s.barcode || ''
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Students')
    XLSX.writeFile(wb, `batch_${batchId}_students.xlsx`)
    toast('Exported successfully', 'success')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrapper" style={{ margin: 0, flex: 1, minWidth: 200 }}>
          <Search className="search-icon" size={16} />
          <input className="input-field" placeholder="Search by name, email, PRN…" value={search}
            onChange={e => setSearch(e.target.value)} style={{ marginBottom: 0 }} />
        </div>
        <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
          <Upload size={14} /> {uploading ? 'Uploading…' : 'Bulk Upload'}
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleBulkUpload} style={{ display: 'none' }} />
        </label>
        <button className="btn btn-outline btn-sm" onClick={handleExport}><Download size={14} /> Export</button>
        <button className="btn btn-outline btn-sm" onClick={() => fetchStudents(page, search)}><RefreshCw size={14} /></button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr>
            <th>Name</th><th>PRN / LTC ID</th><th>Email</th><th>School / Dept</th>
            <th>Squad</th><th>NRI</th><th>Insured</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><div className="loading-center" style={{ minHeight: 80 }}><div className="spinner spinner-sm" /></div></td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={8}><div className="empty-state" style={{ padding: '40px 0' }}><GraduationCap size={36} /><p>No students found. Upload a CSV/XLSX to add students.</p></div></td></tr>
            ) : students.map(s => (
              <tr key={s.id}>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13.5 }}>{s.name}</div>
                  {s.red_flag && <span className="badge badge-red" style={{ marginTop: 3 }}>🚩 Flagged</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <code style={{ fontSize: 12, color: 'var(--text-3)' }}>{s.prn || '—'}</code>
                    {s.ltc_id && (
                      <span className="badge badge-blue" style={{ fontSize: 10, alignSelf: 'flex-start', background: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                        LTC ID: {s.ltc_id}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{s.email}</td>
                <td style={{ fontSize: 12.5 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-2)' }}>{s.school || '—'}</div>
                  <div style={{ color: 'var(--text-4)', fontSize: 11.5 }}>{s.department}</div>
                </td>
                <td>
                  {s.squad
                    ? <span className="badge" style={{ background: (SQUAD_COLORS[s.squad] + '22') || 'var(--primary-bg)', color: SQUAD_COLORS[s.squad] || 'var(--primary)' }}>{s.squad}</span>
                    : <span style={{ color: 'var(--text-4)', fontSize: 12 }}>—</span>}
                </td>
                <td>{s.nri ? <span className="badge badge-nri">NRI</span> : <span style={{ color: 'var(--text-4)', fontSize: 12 }}>Regular</span>}</td>
                <td>{s.insured ? <span className="badge badge-green">✓ Yes</span> : <span className="badge badge-red">✗ No</span>}</td>
                <td>
                  <button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => handleRemove(s.id)}>
                    <UserX size={12} /> Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} onPageChange={p => { setPage(p); fetchStudents(p, search) }} />
    </div>
  )
}

// ─── Batch Faculty Tab ────────────────────────────────────────────────────────
function BatchFacultyTab({ batchId, token, toast }) {
  const [faculty, setFaculty] = useState([])
  const [allFaculty, setAllFaculty] = useState([])
  const [search, setSearch] = useState('')
  const [addSearch, setAddSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchFaculty = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/batches/${batchId}/faculty`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) setFaculty(data.faculty)
    } finally { setLoading(false) }
  }, [batchId, token])

  const fetchAll = async () => {
    const res = await fetch(`${API}/api/admin/faculty-list?limit=200&search=${encodeURIComponent(addSearch)}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (res.ok) setAllFaculty(data.faculty)
  }

  useEffect(() => { fetchFaculty() }, [batchId])
  useEffect(() => { if (showAddModal) fetchAll() }, [showAddModal, addSearch])

  const handleAdd = async (fid) => {
    await fetch(`${API}/api/admin/batches/${batchId}/faculty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ faculty_ids: [fid] })
    })
    toast('Faculty added to batch.', 'success')
    fetchFaculty()
  }

  const handleRemove = async (fid) => {
    if (!window.confirm('Remove this faculty from batch? Master record preserved.')) return
    await fetch(`${API}/api/admin/batches/${batchId}/faculty/${fid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    toast('Faculty removed from batch.', 'success')
    fetchFaculty()
  }

  const inBatch = useMemo(() => new Set(faculty.map(f => f.id)), [faculty])
  const filtered = useMemo(() => faculty.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.email.toLowerCase().includes(search.toLowerCase())
  ), [faculty, search])

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrapper" style={{ margin: 0, flex: 1, minWidth: 200 }}>
          <Search className="search-icon" size={16} />
          <input className="input-field" placeholder="Search faculty…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 0 }} />
        </div>
        <button className="btn btn-sm" onClick={() => setShowAddModal(true)}><Plus size={14} /> Assign Faculty</button>
        <button className="btn btn-outline btn-sm" onClick={fetchFaculty}><RefreshCw size={14} /></button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Panel</th><th>Type</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="loading-center" style={{ minHeight: 80 }}><div className="spinner spinner-sm" /></div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state" style={{ padding: '40px 0' }}><Users size={36} /><p>No faculty assigned yet.</p></div></td></tr>
            ) : filtered.map(f => (
              <tr key={f.id}>
                <td><div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13.5 }}>{f.name}</div></td>
                <td style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{f.email}</td>
                <td style={{ fontSize: 12.5 }}>{f.department}</td>
                <td>{f.panel ? <span className="badge badge-blue">{f.panel}</span> : <span style={{ color: 'var(--text-4)', fontSize: 12 }}>—</span>}</td>
                <td>{f.is_primary ? <span className="badge badge-blue">Primary</span> : <span className="badge badge-gray">Secondary</span>}</td>
                <td>
                  <button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => handleRemove(f.id)}>
                    <UserX size={12} /> Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Assign Faculty to Batch" size="lg">
        <div className="search-wrapper" style={{ maxWidth: '100%' }}>
          <Search className="search-icon" size={16} />
          <input className="input-field" placeholder="Search master faculty…" value={addSearch} onChange={e => setAddSearch(e.target.value)} style={{ marginBottom: 0 }} />
        </div>
        <div className="table-wrapper" style={{ marginTop: 16 }}>
          <table className="data-table data-table-compact">
            <thead><tr><th>Name</th><th>Department</th><th>Panel</th><th>Action</th></tr></thead>
            <tbody>
              {allFaculty.map(f => (
                <tr key={f.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{f.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-4)' }}>{f.email}</div>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{f.department}</td>
                  <td>{f.panel ? <span className="badge badge-blue">{f.panel}</span> : '—'}</td>
                  <td>
                    {inBatch.has(f.id)
                      ? <span className="badge badge-green"><CheckCircle size={10} /> Added</span>
                      : <button className="btn btn-sm" onClick={() => handleAdd(f.id)}><Plus size={12} /> Add</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  )
}

// ─── Squad Allocation Tab ─────────────────────────────────────────────────────
function SquadAllocationTab({ batchId, token, toast }) {
  const [data, setData] = useState({ locked: false, students: [], faculty: [], squadNames: SQUAD_NAMES })
  const [loading, setLoading] = useState(false)
  const [allocating, setAllocating] = useState(false)
  const [selectedSquad, setSelectedSquad] = useState(SQUAD_NAMES[0])
  const [search, setSearch] = useState('')

  const fetchSquads = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/batches/${batchId}/squads`, { headers: { Authorization: `Bearer ${token}` } })
      const d = await res.json()
      if (res.ok) setData(d)
    } finally { setLoading(false) }
  }
  useEffect(() => { fetchSquads() }, [batchId])

  const handleAutoAllocate = async () => {
    if (!window.confirm('Auto-allocate all students into 10 squads? This will overwrite existing assignments.')) return
    setAllocating(true)
    try {
      const res = await fetch(`${API}/api/admin/batches/${batchId}/auto-allocate-squads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const d = await res.json()
      toast(d.message, res.ok ? 'success' : 'error')
      if (res.ok) fetchSquads()
    } finally { setAllocating(false) }
  }

  const handleLockToggle = async () => {
    const locked = !data.locked
    const res = await fetch(`${API}/api/admin/batches/${batchId}/lock-squads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ locked })
    })
    const d = await res.json()
    toast(d.message, res.ok ? 'success' : 'error')
    if (res.ok) fetchSquads()
  }

  const handleSquadChange = async (studentId, squad) => {
    if (data.locked) { toast('Unlock squad allocation first.', 'warning'); return }
    await fetch(`${API}/api/admin/batches/${batchId}/student-squad`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ student_id: studentId, squad })
    })
    toast('Squad updated.', 'success')
    fetchSquads()
  }

  const squadStats = useMemo(() => {
    const stats = {}
    SQUAD_NAMES.forEach(s => { stats[s] = { students: 0, faculty: 0 } })
    data.students.forEach(s => { if (s.squad && stats[s.squad]) stats[s.squad].students++ })
    data.faculty.forEach(f => { if (f.squad && stats[f.squad]) stats[f.squad].faculty++ })
    return stats
  }, [data])

  const squadStudents = useMemo(() =>
    data.students.filter(s => s.squad === selectedSquad && (!search || s.name.toLowerCase().includes(search.toLowerCase())))
  , [data.students, selectedSquad, search])

  const squadFaculty = useMemo(() =>
    data.faculty.filter(f => f.squad === selectedSquad)
  , [data.faculty, selectedSquad])

  const unassigned = data.students.filter(s => !s.squad)

  return (
    <div>
      <div className="squad-actions-header">
        <button className="btn btn-sm btn-auto-allocate" onClick={handleAutoAllocate} disabled={allocating || data.locked}>
          {allocating ? <><div className="spinner spinner-sm" />Allocating…</> : <><RefreshCw size={14} />Auto Allocate 10 Squads</>}
        </button>
        <button className={`btn btn-sm ${data.locked ? 'btn-unlock-allocation' : 'btn-lock-allocation'}`} onClick={handleLockToggle}>
          {data.locked ? <><Unlock size={14} />Unlock</> : <><Lock size={14} />Lock Allocation</>}
        </button>
        {data.locked && <span className="badge badge-orange"><Lock size={10} /> Allocation Locked</span>}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>
          {data.students.length} students · {unassigned.length} unassigned
        </span>
      </div>

      <div className="squads-grid">
        {SQUAD_NAMES.map(sq => (
          <div key={sq} className={`squad-card ${selectedSquad === sq ? 'selected' : ''}`}
            style={{ '--squad-color': SQUAD_COLORS[sq] || 'var(--primary)' }}
            onClick={() => setSelectedSquad(sq)}>
            <div className="squad-card-header">
              <div className="squad-badge">
                {sq.substring(0, 2)}
              </div>
              <div className="squad-card-title">{sq}</div>
            </div>
            <div className="squad-stats-row">
              <div className="squad-stat-item">
                <span className="squad-stat-value">{squadStats[sq]?.students || 0}</span>
                <span className="squad-stat-label">Students</span>
              </div>
              <div className="squad-stat-item">
                <span className="squad-stat-value">{squadStats[sq]?.faculty || 0}</span>
                <span className="squad-stat-label">Faculty</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <div className="squad-detail-header">
          <div className="squad-badge" style={{ background: SQUAD_COLORS[selectedSquad] || 'var(--primary)', width: 40, height: 40, fontSize: 14 }}>{selectedSquad.substring(0, 2)}</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{selectedSquad} Squad</h3>
          <div className="search-wrapper" style={{ margin: 0, marginLeft: 'auto', maxWidth: 260 }}>
            <Search className="search-icon" size={14} />
            <input className="input-field" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 0, paddingLeft: 40 }} />
          </div>
        </div>

        {/* Allocated Faculty Section */}
        <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Allocated Squad Faculty ({squadFaculty.length})
          </h4>
          {squadFaculty.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {squadFaculty.map(f => (
                <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{f.name}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{f.email}</span>
                  {f.department && (
                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600', marginTop: '2px' }}>
                      Dept: {f.department}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
              No faculty allocated to this squad yet.
            </p>
          )}
        </div>

        <div className="table-wrapper">
          <table className="data-table data-table-compact">
            <thead><tr><th>Name</th><th>PRN</th><th>Gender</th><th>Change Squad</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={4}><div className="loading-center" style={{ minHeight: 60 }}><div className="spinner spinner-sm" /></div></td></tr>
                : squadStudents.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-4)', padding: '24px 0', fontStyle: 'italic' }}>No students in this squad</td></tr>
                  : squadStudents.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td><code style={{ fontSize: 11 }}>{s.prn || '—'}</code></td>
                      <td>{s.gender || '—'}</td>
                      <td>
                        <select disabled={data.locked} value={s.squad || ''} onChange={e => handleSquadChange(s.id, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 12, background: 'white', cursor: data.locked ? 'not-allowed' : 'pointer' }}>
                          {SQUAD_NAMES.map(sq => <option key={sq} value={sq}>{sq}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Batch Detail View ────────────────────────────────────────────────────────
function BatchDetail({ batch, token, toast, onBack, onRefresh }) {
  const [tab, setTab] = useState('students')

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  const statusColor = { active: 'green', upcoming: 'blue', completed: 'gray', archived: 'gray' }[batch.status] || 'gray'

  return (
    <div className="animate-fade-in">
      <div className="batch-detail-header-wrapper">
        <button className="btn btn-outline btn-sm detail-header-back-btn" onClick={onBack}><ChevronLeft size={14} /> All Batches</button>
        
        <div className="detail-header-info">
          <div className="detail-title-row">
            <h2 className="detail-title-text">{batch.name}</h2>
            {batch.batch_code && <span className="badge badge-code">{batch.batch_code}</span>}
            <span className={`badge badge-${statusColor} status-${batch.status}`}>{batch.status}</span>
          </div>
          <div className="detail-meta-row">
            {batch.location && (
              <span className="detail-meta-item">
                <MapPin size={13} className="info-icon" />
                {batch.location}
              </span>
            )}
            {batch.start_date && (
              <span className="detail-meta-item">
                <Calendar size={13} className="info-icon" />
                {formatDate(batch.start_date)} &rarr; {formatDate(batch.end_date)}
              </span>
            )}
            {batch.year && (
              <span className="detail-meta-item">
                <strong>Year:</strong> {batch.year}
              </span>
            )}
          </div>
        </div>

        <div className="detail-metrics-row">
          <div className="detail-metric-card">
            <div className="detail-metric-val">
              {batch.student_count}{batch.capacity ? ` / ${batch.capacity}` : ''}
            </div>
            <div className="detail-metric-lbl">Students</div>
          </div>
          <div className="detail-metric-card">
            <div className="detail-metric-val">{batch.faculty_count}</div>
            <div className="detail-metric-lbl">Faculty</div>
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        {[
          { key: 'students', label: 'Students', icon: <GraduationCap size={13} /> },
          { key: 'faculty', label: 'Faculty', icon: <Users size={13} /> },
          { key: 'squads', label: 'Squad Allocation', icon: <Shield size={13} /> },
        ].map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        {tab === 'students' && <BatchStudentsTab batchId={batch.id} token={token} toast={toast} />}
        {tab === 'faculty' && <BatchFacultyTab batchId={batch.id} token={token} toast={toast} />}
        {tab === 'squads' && <SquadAllocationTab batchId={batch.id} token={token} toast={toast} />}
      </div>
    </div>
  )
}

// ─── Main BatchManagement Component ──────────────────────────────────────────
export default function BatchManagementModule({ token }) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editBatch, setEditBatch] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const { toasts, toast } = useToast()

  const fetchBatches = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/batches`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) setBatches(data.batches)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchBatches() }, [])

  const handleCreate = async (form) => {
    const res = await fetch(`${API}/api/admin/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    toast(data.message, res.ok ? 'success' : 'error')
    if (res.ok) { setShowCreate(false); fetchBatches() }
  }

  const handleEdit = async (form) => {
    const res = await fetch(`${API}/api/admin/batches/${editBatch.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    toast(data.message, res.ok ? 'success' : 'error')
    if (res.ok) { setEditBatch(null); fetchBatches() }
  }

  const handleDelete = async (batch) => {
    if (!window.confirm(`Delete "${batch.name}"? Student and faculty master records will NOT be deleted.`)) return
    const res = await fetch(`${API}/api/admin/batches/${batch.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    toast(data.message, res.ok ? 'success' : 'error')
    if (res.ok) fetchBatches()
  }

  const filtered = useMemo(() => batches.filter(b => {
    const q = search.toLowerCase()
    const matchSearch = !search || b.name.toLowerCase().includes(q) || (b.location || '').toLowerCase().includes(q) || (b.batch_code || '').toLowerCase().includes(q)
    const matchStatus = !filterStatus || b.status === filterStatus
    return matchSearch && matchStatus
  }), [batches, search, filterStatus])

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null

  const statusBadge = (s) => ({
    active: <span className="badge badge-green status-active">Active</span>,
    upcoming: <span className="badge badge-blue status-upcoming">Upcoming</span>,
    completed: <span className="badge badge-gray status-completed">Completed</span>,
    archived: <span className="badge badge-gray status-archived">Archived</span>,
  }[s] || <span className="badge badge-gray">{s}</span>)

  if (selectedBatch) {
    return (
      <>
        <BatchDetail
          batch={selectedBatch}
          token={token}
          toast={toast}
          onBack={() => { setSelectedBatch(null); fetchBatches() }}
          onRefresh={fetchBatches}
        />
        <ToastContainer toasts={toasts} />
      </>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Batch Management</h2>
          <p className="page-subtitle">Create and manage LTC batches, assign students and faculty, allocate squads</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-outline btn-sm" onClick={fetchBatches}><RefreshCw size={14} /></button>
          <button className="btn" onClick={() => setShowCreate(true)}><Plus size={16} /> New Batch</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        {[
          { label: 'Total Batches', value: batches.length, color: 'var(--primary)' },
          { label: 'Active', value: batches.filter(b => b.status === 'active').length, color: 'var(--success)' },
          { label: 'Upcoming', value: batches.filter(b => b.status === 'upcoming').length, color: 'var(--warning)' },
          { label: 'Total Students Enrolled', value: batches.reduce((a, b) => a + parseInt(b.student_count || 0), 0), color: 'var(--primary)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-accent" style={{ background: s.color }} />
            <div className="stat-card-value" style={{ color: s.color, fontSize: 24 }}>{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrapper" style={{ margin: 0, flex: 1, minWidth: 200 }}>
          <Search className="search-icon" size={16} />
          <input className="input-field" placeholder="Search batches…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 0 }} />
        </div>
        <select className="input-field input-field-rect" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ marginBottom: 0, width: 'auto', minWidth: 140, borderRadius: 50, fontSize: 13 }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /><p>Loading batches…</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <GraduationCap size={48} />
          <h3>No batches found</h3>
          <p>Create your first LTC batch to get started. Students and faculty can then be added from the master database.</p>
          <button className="btn" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}><Plus size={16} /> Create Batch</button>
        </div>
      ) : (
        <div className="batches-grid">
          {filtered.map(b => (
            <div key={b.id} className="batch-card" onClick={() => setSelectedBatch(b)}>
              <div className="batch-card-header" style={{ width: '100%' }}>
                <div className="batch-card-title-row">
                  <h3 className="batch-title-text">{b.name}</h3>
                  <div className="batch-badges">
                    {b.batch_code && <span className="badge badge-code">{b.batch_code}</span>}
                    {statusBadge(b.status)}
                  </div>
                </div>
              </div>

              <div className="batch-card-body">
                {b.location && (
                  <div className="batch-info-line">
                    <MapPin size={13} className="info-icon" />
                    <span>{b.location}</span>
                  </div>
                )}
                {b.start_date && (
                  <div className="batch-info-line">
                    <Calendar size={13} className="info-icon" />
                    <span>{formatDate(b.start_date)} &rarr; {formatDate(b.end_date)}</span>
                  </div>
                )}
                {b.year && (
                  <div className="batch-info-line">
                    <span className="info-label">Year:</span>
                    <span className="info-value">{b.year}</span>
                  </div>
                )}
              </div>

              <div className="batch-card-footer">
                <div className="batch-card-metrics">
                  <div className="metric-pill">
                    <span className="metric-val">{b.student_count}{b.capacity ? ` / ${b.capacity}` : ''}</span>
                    <span className="metric-lbl">Students</span>
                  </div>
                  <div className="metric-pill">
                    <span className="metric-val">{b.faculty_count}</span>
                    <span className="metric-lbl">Faculty</span>
                  </div>
                </div>

                <div className="batch-card-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn btn-sm btn-open" onClick={() => setSelectedBatch(b)}>
                    Open Batch
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditBatch({ ...b, start_date: b.start_date?.split('T')[0], end_date: b.end_date?.split('T')[0] })}>
                    <Edit2 size={13} />
                  </button>
                  <button className="btn btn-outline btn-sm btn-del" onClick={() => handleDelete(b)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <BatchFormModal open={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} />
      <BatchFormModal open={!!editBatch} onClose={() => setEditBatch(null)} onSave={handleEdit} initial={editBatch} />

      <ToastContainer toasts={toasts} />
    </div>
  )
}
