import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Users, UploadCloud, GraduationCap, BookOpen, CheckCircle,
  AlertCircle, FileText, Search, LogOut, Menu, Trash2, ClipboardList,
  Lock, Unlock, Clock, X, Shield, RefreshCw, ChevronLeft, ChevronRight,
  Layers, BarChart2
} from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { QRCodeSVG } from 'qrcode.react'
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode'
import ScrollToTop from './ScrollToTop'
import TimetablePanel from './TimetablePanel'

// Sub-modules import
import FacultyModule from './admin/FacultyModule'
import StudentsModule from './admin/StudentsModule'
import BatchManagementModule from './admin/BatchManagementModule'

import DocumentsModule from './admin/DocumentsModule'
import ReportsModule from './admin/ReportsModule'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001'
const SQUAD_NAMES = ['Surya', 'Chandra', 'Mangal', 'Budh', 'Guru', 'Shukra', 'Shani', 'Rahu', 'Ketu', 'Agni']

// ─── Utility hooks ────────────────────────────────────────────────────────────
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

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
          {t.type === 'warning' && <AlertCircle size={18} className="toast-icon" />}
          <span style={{ fontSize: 14, fontWeight: 500 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 50
function usePagination(items) {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const paginated = useMemo(() => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [items, page])
  const reset = useCallback(() => setPage(1), [])
  return { page, setPage, totalPages, paginated, total: items.length, reset }
}

function PaginationBar({ page, totalPages, total, setPage }) {
  if (totalPages <= 1) return null
  const start = (page - 1) * PAGE_SIZE + 1, end = Math.min(page * PAGE_SIZE, total)
  const nums = []; let lo = Math.max(1, page - 2), hi = Math.min(totalPages, page + 2)
  for (let i = lo; i <= hi; i++) nums.push(i)
  return (
    <div className="pagination">
      <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={13} /></button>
      {lo > 1 && <><button className="pagination-btn" onClick={() => setPage(1)}>1</button>{lo > 2 && <span style={{ color: 'var(--text-4)', padding: '0 4px' }}>…</span>}</>}
      {nums.map(n => <button key={n} className={`pagination-btn ${n === page ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>)}
      {hi < totalPages && <><span style={{ color: 'var(--text-4)', padding: '0 4px' }}>…</span><button className="pagination-btn" onClick={() => setPage(totalPages)}>{totalPages}</button></>}
      <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={13} /></button>
      <span className="pagination-info">Showing {start}–{end} of {total}</span>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, size = '' }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size ? 'modal-' + size : ''}`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn-icon" onClick={onClose} style={{ border: 'none', padding: 4 }}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

// ─── Label helper ─────────────────────────────────────────────────────────────
const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
    {children}
  </label>
)

// ─── Main AdminDashboard ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null')

  // UI state
  const [activeTab, setActiveTab] = useState('faculty')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  // Data
  const [users, setUsers] = useState([])
  const [documents, setDocuments] = useState([])

  // Search
  const [facultySearch, setFacultySearch] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedSchool, setSelectedSchool] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedDivision, setSelectedDivision] = useState('')
  const [selectedPanel, setSelectedPanel] = useState('')

  const debouncedFacultySearch = useDebounce(facultySearch)
  const debouncedStudentSearch = useDebounce(studentSearch)

  // Forms / Modals
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false)
  const [facultyForm, setFacultyForm] = useState({ name: '', email: '', department: '', division: '', school: '', panel: '', is_primary: false, gender: '' })
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)
  const [studentForm, setStudentForm] = useState({ name: '', email: '', prn: '', department: '', semester: '', division: '', school: '', panel: '', gender: '' })
  const [isLtcModalOpen, setIsLtcModalOpen] = useState(false)
  const [ltcForm, setLtcForm] = useState({ name: '', email: '', role_type: 'member' })
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false)
  const [resetConfirmationInput, setResetConfirmationInput] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  // Custom Selector Dropdown Overrides
  const [isCustomStudentSchool, setIsCustomStudentSchool] = useState(false)
  const [isCustomStudentDept, setIsCustomStudentDept] = useState(false)
  const [isCustomStudentDiv, setIsCustomStudentDiv] = useState(false)
  const [isCustomFacultyDiv, setIsCustomFacultyDiv] = useState(false)
  const [isCustomFacultySchool, setIsCustomFacultySchool] = useState(false)
  const [isCustomFacultyDept, setIsCustomFacultyDept] = useState(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [feedbackList, setFeedbackList] = useState([])
  const [selectedUserForFeedback, setSelectedUserForFeedback] = useState(null)

  // Bulk upload
  const [bulkData, setBulkData] = useState({ faculty: [], students: [], errors: [] })
  const [bulkInsuranceData, setBulkInsuranceData] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingInsurance, setIsUploadingInsurance] = useState(false)
  const [jobProgress, setJobProgress] = useState(null)
  const [showProgressModal, setShowProgressModal] = useState(false)


  // Doc form
  const [docForm, setDocForm] = useState({ name: '', url: '', target_role: 'all' })

  // Squad
  const [isShuffling, setIsShuffling] = useState(false)
  const [selectedSquad, setSelectedSquad] = useState('Surya')
  const [squadViewTab, setSquadViewTab] = useState('master')

  // QR Scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannedUser, setScannedUser] = useState(null)
  const [scanMode, setScanMode] = useState('camera')
  const [scanFileImage, setScanFileImage] = useState(null)
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false)
  const [slipStudent, setSlipStudent] = useState(null)

  const { toasts, toast } = useToast()

  // ── Resize ──
  useEffect(() => {
    const h = () => { setIsMobile(window.innerWidth <= 768); if (window.innerWidth > 768) setIsSidebarOpen(false) }
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // ── Auth guard + initial fetch ──
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') { navigate('/login'); return }
    fetchUsers(); fetchDocuments()
  }, [])

  // ─── API helpers ───────────────────────────────────────────────────────────
  const apiFetch = useCallback(async (url, opts = {}) => {
    const res = await fetch(`${API}${url}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) }
    })
    if (res.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); return null }
    return res
  }, [token])

  const fetchUsers = useCallback(async () => {
    const res = await apiFetch('/api/admin/users')
    if (!res) return
    const data = await res.json()
    if (res.ok) { setUsers(data.users || []) }
  }, [apiFetch])

  const fetchDocuments = useCallback(async () => {
    const res = await apiFetch('/api/documents')
    if (!res) return
    const data = await res.json()
    if (res.ok) setDocuments(data.documents || [])
  }, [apiFetch])


  // ─── Memoized lists ────────────────────────────────────────────────────────
  const faculties = useMemo(() => users.filter(u => u.role === 'faculty' && (
    !debouncedFacultySearch ||
    u.name.toLowerCase().includes(debouncedFacultySearch.toLowerCase()) ||
    u.email.toLowerCase().includes(debouncedFacultySearch.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(debouncedFacultySearch.toLowerCase())
  )), [users, debouncedFacultySearch])

  const availableSchools = useMemo(() => [...new Set(users.filter(u => u.role === 'student' && u.school).map(u => u.school))].sort(), [users])
  const availableDepartments = useMemo(() => [...new Set(users.filter(u => u.role === 'student' && u.department && (!selectedSchool || u.school === selectedSchool)).map(u => u.department))].sort(), [users, selectedSchool])
  const availableDivisions = useMemo(() => [...new Set(users.filter(u => u.role === 'student' && u.division && (!selectedSchool || u.school === selectedSchool) && (!selectedDepartment || u.department === selectedDepartment)).map(u => u.division))].sort(), [users, selectedSchool, selectedDepartment])
  const availablePanels = useMemo(() => [...new Set(users.filter(u => u.role === 'student' && u.panel).map(u => u.panel))].sort(), [users])

  const students = useMemo(() => users.filter(u => {
    if (u.role !== 'student') return false
    const q = debouncedStudentSearch.toLowerCase()
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !(u.department || '').toLowerCase().includes(q) && !(u.prn || '').toLowerCase().includes(q)) return false
    if (selectedSchool && u.school !== selectedSchool) return false
    if (selectedDepartment && u.department !== selectedDepartment) return false
    if (selectedDivision && u.division !== selectedDivision) return false
    if (selectedPanel && u.panel !== selectedPanel) return false
    return true
  }), [users, debouncedStudentSearch, selectedSchool, selectedDepartment, selectedDivision, selectedPanel])

  const ltcMembers = useMemo(() => users.filter(u => u.role === 'ltc_member'), [users])

  const counts = useMemo(() => {
    return {
      faculty: users.filter(u => u.role === 'faculty').length,
      students: users.filter(u => u.role === 'student').length,
      ltc: users.filter(u => u.role === 'ltc_member').length,
      documents: documents.length
    }
  }, [users, documents])

  // Pagination instances
  const facultyPg = usePagination(faculties)
  const studentPg = usePagination(students)

  // ─── Auth / Nav ────────────────────────────────────────────────────────────
  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/') }

  // ─── Faculty handlers ──────────────────────────────────────────────────────
  const handleAddFaculty = async (e) => {
    e.preventDefault()
    const res = await apiFetch('/api/admin/faculty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(facultyForm)
    })
    if (!res) return
    const data = await res.json()
    if (res.ok) {
      toast(data.message, 'success')
      setIsFacultyModalOpen(false)
      setFacultyForm({ name: '', email: '', department: '', division: '', school: '', panel: '', is_primary: false, gender: '' })
      setIsCustomFacultyDiv(false)
      setIsCustomFacultySchool(false)
      setIsCustomFacultyDept(false)
      fetchUsers()
    } else { toast(data.message || 'Failed to add faculty', 'error') }
  }

  const handleDeleteUser = async (id, role) => {
    if (!window.confirm(`Permanently delete this ${role} from the master database?`)) return
    const res = await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (!res) return
    const data = await res.json()
    toast(data.message, res.ok ? 'success' : 'error')
    if (res.ok) fetchUsers()
  }

  // ─── Student handlers ──────────────────────────────────────────────────────
  const handleAddStudent = async (e) => {
    e.preventDefault()
    const res = await apiFetch('/api/users/student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentForm)
    })
    if (!res) return
    const data = await res.json()
    if (res.ok) {
      toast(data.message, 'success')
      setIsStudentModalOpen(false)
      setStudentForm({ name: '', email: '', prn: '', department: '', semester: '', division: '', school: '', panel: '', gender: '' })
      setIsCustomStudentSchool(false)
      setIsCustomStudentDept(false)
      setIsCustomStudentDiv(false)
      fetchUsers()
    } else { toast(data.message || 'Failed to add student', 'error') }
  }

  const handleUpdatePanel = async (userId, panel) => {
    const res = await apiFetch('/api/admin/update-panel', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, panel })
    })
    if (res?.ok) { toast('Panel updated', 'success'); fetchUsers() } else toast('Failed to update panel', 'error')
  }

  const handleUpdateInsurance = async (userId, ins) => {
    const res = await apiFetch('/api/admin/insurance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, insurance: ins === 'true' })
    })
    if (res?.ok) { toast('Insurance updated', 'success'); fetchUsers() } else toast('Failed to update insurance', 'error')
  }

  const handleToggleStudentBatch = async (userId, inBatch) => {
    const res = await apiFetch('/api/admin/toggle-student-batch', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, in_batch: inBatch })
    })
    if (res?.ok) { toast(inBatch ? 'Added to batch' : 'Removed from batch', 'success'); fetchUsers() }
    else { const d = await res.json(); toast(d.message || 'Failed', 'error') }
  }

  // ─── LTC Member ────────────────────────────────────────────────────────────
  const handleAddLtcMember = async (e) => {
    e.preventDefault()
    const res = await apiFetch('/api/admin/bulk-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: [{ name: ltcForm.name, email: ltcForm.email, role: 'ltc_member', department: ltcForm.role_type }] })
    })
    if (!res) return
    const data = await res.json()
    if (res.ok) { toast('LTC Member added.', 'success'); setIsLtcModalOpen(false); setLtcForm({ name: '', email: '', role_type: 'member' }); fetchUsers() }
    else toast(data.message || 'Failed to add LTC Member', 'error')
  }

  // ─── Documents ─────────────────────────────────────────────────────────────
  const handleUploadDocument = async (e) => {
    e.preventDefault()
    const res = await apiFetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docForm)
    })
    if (res?.ok) {
      toast('Document uploaded for ' + docForm.target_role, 'success')
      setDocForm({ name: '', url: '', target_role: 'all' })
      fetchDocuments()
    }
  }

  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Delete this document?')) return
    const res = await apiFetch(`/api/documents/${id}`, { method: 'DELETE' })
    if (res?.ok) { toast('Document deleted.', 'success'); fetchDocuments() }
  }

  // ─── Bulk Upload ───────────────────────────────────────────────────────────
  const parseData = useCallback((parsedData) => {
    const parsedFaculties = [], parsedStudents = [], parseErrors = []
    parsedData.forEach((row, index) => {
      const norm = {}
      for (const key in row) { norm[key.replace(/^\uFEFF/, '').toLowerCase().trim()] = row[key] }
      const role = (norm.role || '').toLowerCase()
      const name = norm.name || norm.full_name
      if (!name || !norm.email || !role) { parseErrors.push(`Row ${index + 1}: Missing name, email, or role.`); return }
      norm.name = name
      if (role === 'faculty') parsedFaculties.push(norm)
      else if (role === 'student') parsedStudents.push(norm)
      else parseErrors.push(`Row ${index + 1}: Invalid role "${role}"`)
    })
    setBulkData({ faculty: parsedFaculties, students: parsedStudents, errors: parseErrors })
  }, [])

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return
    setBulkData({ faculty: [], students: [], errors: [] })
    const name = file.name.toLowerCase()
    if (name.endsWith('.csv')) { Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => parseData(r.data), error: () => toast('CSV parse error', 'error') }) }
    else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const reader = new FileReader()
      reader.onload = evt => { const wb = XLSX.read(evt.target.result, { type: 'binary' }); parseData(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])) }
      reader.readAsBinaryString(file)
    } else toast('Unsupported format. Upload CSV or XLSX.', 'error')
    e.target.value = null
  }

  const submitBulkUpload = async () => {
    const all = [...bulkData.faculty, ...bulkData.students]
    if (!all.length) { toast('No valid data to upload.', 'warning'); return }
    setIsUploading(true)
    setShowProgressModal(true)
    setJobProgress(null)
    
    try {
      const res = await apiFetch('/api/admin/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: all })
      })
      if (!res) throw new Error('Network error or session expired.')
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to start bulk upload.')
      }

      const jobId = data.jobId

      const intervalId = setInterval(async () => {
        try {
          const pollRes = await apiFetch(`/api/admin/upload-jobs/${jobId}`)
          if (!pollRes) {
            clearInterval(intervalId)
            setIsUploading(false)
            setShowProgressModal(false)
            return
          }
          const pollData = await pollRes.json()
          
          if (pollRes.ok && pollData.job) {
            setJobProgress(pollData.job)
            
            if (pollData.job.status === 'completed' || pollData.job.status === 'failed') {
              clearInterval(intervalId)
              setIsUploading(false)
              if (pollData.job.status === 'completed') {
                toast(`Bulk upload finished! Success: ${pollData.job.success_count}, Failed: ${pollData.job.failed_count}`, 'success')
              } else {
                toast('Bulk upload job failed.', 'error')
              }
            }
          } else {
            clearInterval(intervalId)
            setIsUploading(false)
            toast('Failed to query upload status.', 'error')
            setShowProgressModal(false)
          }
        } catch (err) {
          clearInterval(intervalId)
          setIsUploading(false)
          toast('Polling status error: ' + err.message, 'error')
          setShowProgressModal(false)
        }
      }, 750)

    } catch (err) {
      setIsUploading(false)
      setShowProgressModal(false)
      toast(err.message || 'Upload error', 'error')
    }
  }

  const processInsuranceData = (data) => {
    if (!data?.length) { toast('Empty insurance file.', 'warning'); return }
    const formatted = data.map(row => {
      const r = {}
      for (let k in row) { if (k) r[k.replace(/^\uFEFF/, '').toLowerCase().trim().replace(/['"`]+/g, '')] = row[k] }
      return r
    })
    setBulkInsuranceData(formatted)
  }

  const handleInsuranceFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return
    setBulkInsuranceData([])
    const name = file.name.toLowerCase()
    if (name.endsWith('.csv')) Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => processInsuranceData(r.data), error: () => toast('CSV parse error', 'error') })
    else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const reader = new FileReader()
      reader.onload = evt => { const wb = XLSX.read(evt.target.result, { type: 'binary' }); processInsuranceData(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])) }
      reader.readAsBinaryString(file)
    }
    e.target.value = null
  }

  const submitBulkInsurance = async () => {
    if (!bulkInsuranceData.length) { toast('No insurance data to upload.', 'warning'); return }
    setIsUploadingInsurance(true)
    try {
      const res = await apiFetch('/api/admin/bulk-insurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: bulkInsuranceData })
      })
      if (!res) return
      const data = await res.json()
      toast(data.message, res.ok ? 'success' : 'error')
      if (res.ok) { setBulkInsuranceData([]); fetchUsers() }
    } finally { setIsUploadingInsurance(false) }
  }

  // ─── Feedback ──────────────────────────────────────────────────────────────
  const handleViewFeedback = async (userId, userName) => {
    setSelectedUserForFeedback({ id: userId, name: userName })
    setIsFeedbackModalOpen(true)
    const res = await apiFetch(`/api/admin/feedback?user_id=${userId}`)
    if (res?.ok) { const d = await res.json(); setFeedbackList(d.feedback || []) }
  }

  // ─── QR Scanner ────────────────────────────────────────────────────────────
  const processCode = async (decodedText, scannerInstance) => {
    try {
      let barcode = decodedText
      try { const u = new URL(decodedText); if (u.searchParams.has('barcode')) barcode = u.searchParams.get('barcode') } catch (e) { }
      const res = await fetch(`${API}/api/admin/user-by-barcode?barcode=${barcode}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) setScannedUser(data.user)
      else { toast(data.message || 'Invalid QR', 'error'); if (scannerInstance) scannerInstance.resume() }
    } catch (err) { toast('Scan error: ' + err.message, 'error'); if (scannerInstance) scannerInstance.resume() }
  }

  useEffect(() => {
    let scanner
    if (isScannerOpen && scanMode === 'camera' && !scannedUser) {
      scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [0] }, false)
      scanner.render(async (text) => { scanner.pause(); await processCode(text, scanner) }, () => { })
    }
    return () => { if (scanner) scanner.clear().catch(() => { }) }
  }, [isScannerOpen, scanMode, scannedUser])

  const handleFileScan = async () => {
    if (!scanFileImage) return
    try {
      const h = new Html5Qrcode('qr-reader-file-dummy')
      const text = await h.scanFile(scanFileImage, true)
      processCode(text, null)
    } catch { toast('No valid QR Code found in image.', 'error') }
  }

  // ─── Reset Database ────────────────────────────────────────────────────────
  const handleResetDatabase = async () => {
    setIsResetting(true)
    try {
      const res = await apiFetch('/api/admin/reset-database', { method: 'POST' })
      if (!res) return
      const data = await res.json()
      toast(data.message, res.ok ? 'success' : 'error')
      if (res.ok) {
        fetchUsers()
        fetchDocuments()
        setIsResetConfirmModalOpen(false)
        setResetConfirmationInput('')
      }
    } catch (err) {
      toast('Failed to reset database.', 'error')
    } finally {
      setIsResetting(false)
    }
  }

  // ─── Sidebar nav item ──────────────────────────────────────────────────────
  const NavItem = ({ tab, icon, label, badgeCount }) => (
    <button
      className={`sidebar-item ${activeTab === tab ? 'active' : ''}`}
      onClick={() => { setActiveTab(tab); if (isMobile) setIsSidebarOpen(false) }}
    >
      <span className="sidebar-item-content">
        {icon}
        <span>{label}</span>
      </span>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="sidebar-badge">{badgeCount}</span>
      )}
    </button>
  )

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-layout">
      <ScrollToTop />

      {/* Overlay */}
      {isMobile && isSidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <div className="sidebar" style={{
        position: isMobile ? 'fixed' : 'sticky',
        top: 0, left: 0, bottom: 0, zIndex: 1000, height: '100vh',
        transform: isMobile && !isSidebarOpen ? 'translateX(-100%)' : 'none',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
      }}>
        <div className="sidebar-header">
          <div className="sidebar-brand-container">
            <img src="/ltc.png" alt="LTC Logo" className="sidebar-brand-logo" />
          </div>
          {isMobile && (
            <button className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)} aria-label="Close Sidebar">
              <X size={14} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', padding: '8px 12px 0', display: 'block' }}>admin</span>
          <p className="sidebar-section-label" style={{ paddingTop: '8px' }}>Management</p>
          <NavItem tab="faculty" icon={<BookOpen size={16} />} label="Master Faculty" />
          <NavItem tab="students" icon={<GraduationCap size={16} />} label="Master Students" />
          <NavItem tab="batches" icon={<Layers size={16} />} label="Batch Management" />
          <NavItem tab="ltcmembers" icon={<Users size={16} />} label="LTC Members" />

          <div className="sidebar-separator" />
          <p className="sidebar-section-label">Tools</p>
          <NavItem tab="timetable" icon={<Clock size={16} />} label="Immersion Timetable" />
          <NavItem tab="bulk" icon={<UploadCloud size={16} />} label="Bulk Upload" />
          <NavItem tab="documents" icon={<FileText size={16} />} label="Documents & SOPs" />
          <NavItem tab="reports" icon={<BarChart2 size={16} />} label="Reports & Logs" />
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-item logout" style={{ color: '#ef4444' }} onClick={handleResetDatabase}>
            <Trash2 size={16} /> Reset Database
          </button>
          <button className="sidebar-item logout" onClick={handleLogout}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="main-content">
        {/* Mobile topbar */}
        {isMobile && (
          <div className="mobile-topbar">
            <button className="btn btn-outline btn-icon" style={{ border: 'none' }} onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h1 style={{ fontSize: 17, margin: 0, fontWeight: 800 }}>Admin Portal</h1>
          </div>
        )}

        {/* ── Timetable ── */}
        {activeTab === 'timetable' && <TimetablePanel />}

        {/* ── Batch Management (New) ── */}
        {activeTab === 'batches' && (
          <BatchManagementModule token={token} />
        )}

        {/* ── Master Faculty Tab ── */}
        {activeTab === 'faculty' && (
          <FacultyModule
            faculties={faculties}
            facultyPg={facultyPg}
            facultySearch={facultySearch}
            setFacultySearch={setFacultySearch}
            setIsFacultyModalOpen={setIsFacultyModalOpen}
            handleUpdatePanel={handleUpdatePanel}
            handleViewFeedback={handleViewFeedback}
            handleDeleteUser={handleDeleteUser}
            fetchUsers={fetchUsers}
            PaginationBar={PaginationBar}
          />
        )}

        {/* ── Master Students Tab ── */}
        {activeTab === 'students' && (
          <StudentsModule
            users={users}
            students={students}
            studentPg={studentPg}
            studentSearch={studentSearch}
            setStudentSearch={setStudentSearch}
            selectedSchool={selectedSchool}
            setSelectedSchool={setSelectedSchool}
            selectedDepartment={selectedDepartment}
            setSelectedDepartment={setSelectedDepartment}
            selectedDivision={selectedDivision}
            setSelectedDivision={setSelectedDivision}
            selectedPanel={selectedPanel}
            setSelectedPanel={setSelectedPanel}
            availableSchools={availableSchools}
            availableDepartments={availableDepartments}
            availableDivisions={availableDivisions}
            availablePanels={availablePanels}
            setIsStudentModalOpen={setIsStudentModalOpen}
            handleUpdatePanel={handleUpdatePanel}
            handleUpdateInsurance={handleUpdateInsurance}
            handleToggleStudentBatch={handleToggleStudentBatch}
            handleViewFeedback={handleViewFeedback}
            handleDeleteUser={handleDeleteUser}
            fetchUsers={fetchUsers}
            PaginationBar={PaginationBar}
          />
        )}

        {/* ── LTC Members Tab ── */}
        {activeTab === 'ltcmembers' && (
          <div className="animate-fade-in">
            <div className="page-header">
              <div className="page-header-left">
                <h2 className="page-title">LTC Members</h2>
                <p className="page-subtitle">{ltcMembers.length} members</p>
              </div>
              <div className="page-header-right">
                <button className="btn btn-outline btn-sm" onClick={fetchUsers}><RefreshCw size={14} /></button>
                <button className="btn" onClick={() => setIsLtcModalOpen(true)}><Plus size={16} /> Add LTC Member</button>
              </div>
            </div>
            <div className="glass-card">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role Type</th><th>Actions</th></tr></thead>
                  <tbody>
                    {ltcMembers.length === 0 ? (
                      <tr><td colSpan={5}><div className="empty-state" style={{ padding: '40px 0' }}><Users size={36} /><p>No LTC members yet.</p></div></td></tr>
                    ) : ltcMembers.map(u => (
                      <tr key={u.id}>
                        <td style={{ color: 'var(--text-4)', fontWeight: 600 }}>#{u.id}</td>
                        <td><div style={{ fontWeight: 700 }}>{u.name}</div></td>
                        <td style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{u.email}</td>
                        <td><span className="badge badge-blue">{u.department || 'member'}</span></td>
                        <td>
                          <button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => handleDeleteUser(u.id, 'ltc_member')}>
                            <Trash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Bulk Upload Tab ── */}
        {activeTab === 'bulk' && (
          <div className="animate-fade-in">
            <div className="page-header">
              <div className="page-header-left">
                <h2 className="page-title">Bulk Upload</h2>
                <p className="page-subtitle">Upload CSV/XLSX to add students and faculty to the master database</p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 24 }}>
              {/* Users upload */}
              <div className="glass-card">
                <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Upload Users (Students / Faculty)</h3>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
                  CSV/XLSX must have columns: <code>name</code>, <code>email</code>, <code>role</code> (student/faculty), and optionally <code>prn</code>, <code>department</code>, <code>semester</code>, <code>school</code>, <code>panel</code>, <code>gender</code>, <code>nri</code>
                </p>
                <label className="btn btn-outline" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
                  <UploadCloud size={16} /> Choose File (CSV / XLSX)
                  <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>

                {(bulkData.faculty.length > 0 || bulkData.students.length > 0 || bulkData.errors.length > 0) && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                      {bulkData.faculty.length > 0 && <span className="badge badge-blue">{bulkData.faculty.length} Faculty</span>}
                      {bulkData.students.length > 0 && <span className="badge badge-green">{bulkData.students.length} Students</span>}
                      {bulkData.errors.length > 0 && <span className="badge badge-red">{bulkData.errors.length} Errors</span>}
                    </div>
                    {bulkData.errors.length > 0 && (
                      <div className="alert alert-danger" style={{ marginBottom: 16, flexDirection: 'column', alignItems: 'flex-start' }}>
                        <strong>Validation Errors:</strong>
                        <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
                          {bulkData.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                          {bulkData.errors.length > 5 && <li>…and {bulkData.errors.length - 5} more</li>}
                        </ul>
                      </div>
                    )}
                    <button className="btn" onClick={submitBulkUpload} disabled={isUploading || (bulkData.faculty.length === 0 && bulkData.students.length === 0)}>
                      {isUploading ? <><div className="spinner spinner-sm" />Uploading…</> : `Upload ${bulkData.faculty.length + bulkData.students.length} Users`}
                    </button>
                  </div>
                )}
              </div>

              <Modal open={showProgressModal} onClose={() => {
                if (jobProgress && (jobProgress.status === 'completed' || jobProgress.status === 'failed')) {
                  setShowProgressModal(false)
                  setJobProgress(null)
                }
              }} title="Bulk Upload Progress" size="lg">
                {jobProgress ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {jobProgress.status === 'processing' ? 'Processing records...' :
                         jobProgress.status === 'completed' ? 'Upload Completed!' :
                         jobProgress.status === 'failed' ? 'Upload Failed' : 'Initializing...'}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                        {jobProgress.processed_records} / {jobProgress.total_records}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${jobProgress.total_records > 0 ? (jobProgress.processed_records / jobProgress.total_records) * 100 : 0}%`,
                        height: '100%',
                        background: jobProgress.status === 'failed' ? 'var(--danger)' : 'var(--primary)',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>

                    {/* Stats Counter */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#166534' }}>{jobProgress.success_count}</div>
                        <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>Success</div>
                      </div>
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#991b1b' }}>{jobProgress.failed_count}</div>
                        <div style={{ fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>Failed</div>
                      </div>
                    </div>

                    {/* Errors List */}
                    {jobProgress.errors && jobProgress.errors.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>Row-level Errors / Warnings ({jobProgress.errors.length})</h4>
                        <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, background: '#f8fafc' }}>
                          <table className="data-table data-table-compact" style={{ margin: 0 }}>
                            <thead>
                              <tr>
                                <th>Row Target</th>
                                <th>Error Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jobProgress.errors.map((err, idx) => (
                                <tr key={idx}>
                                  <td style={{ fontWeight: 600, fontSize: 12 }}><code style={{ background: '#e2e8f0', padding: '2px 4px', borderRadius: 4 }}>{err.row}</code></td>
                                  <td style={{ color: 'var(--danger)', fontSize: 12 }}>{err.error}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Footer Controls */}
                    {(jobProgress.status === 'completed' || jobProgress.status === 'failed') && (
                      <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0, marginTop: 12 }}>
                        <button className="btn btn-primary" onClick={() => {
                          setShowProgressModal(false)
                          setJobProgress(null)
                          fetchUsers()
                          setActiveTab('faculty')
                        }}>Done</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 12 }}>
                    <div className="spinner" />
                    <span style={{ color: 'var(--text-3)', fontSize: 14, fontWeight: 600 }}>Uploading & parsing file...</span>
                  </div>
                )}
              </Modal>

            </div>
          </div>
        )}

        {/* ── Documents Tab ── */}
        {activeTab === 'documents' && (
          <DocumentsModule
            documents={documents}
            docForm={docForm}
            setDocForm={setDocForm}
            handleUploadDocument={handleUploadDocument}
            handleDeleteDocument={handleDeleteDocument}
            Label={Label}
          />
        )}

        {/* ── Reports Tab ── */}
        {activeTab === 'reports' && (
          <ReportsModule token={token} toast={toast} />
        )}
      </div>

      {/* ── Modals ── */}

      {/* Add Faculty Modal */}
      <Modal open={isFacultyModalOpen} onClose={() => { setIsFacultyModalOpen(false); setIsCustomFacultyDiv(false); setIsCustomFacultySchool(false); setIsCustomFacultyDept(false); }} title="Add Faculty Member">
        <form onSubmit={handleAddFaculty} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><Label>Full Name *</Label><input required className="input-field input-field-rect" placeholder="Dr. Jane Smith" value={facultyForm.name} onChange={e => setFacultyForm(f => ({ ...f, name: e.target.value }))} style={{ marginBottom: 0 }} /></div>
          <div><Label>Email *</Label><input required type="email" className="input-field input-field-rect" placeholder="jane@university.edu" value={facultyForm.email} onChange={e => setFacultyForm(f => ({ ...f, email: e.target.value }))} style={{ marginBottom: 0 }} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Label>Division</Label>
              {isCustomFacultyDiv ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input required className="input-field input-field-rect" placeholder="Enter division" value={facultyForm.division} onChange={e => setFacultyForm(f => ({ ...f, division: e.target.value }))} style={{ marginBottom: 0, flex: 1 }} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setIsCustomFacultyDiv(false); setFacultyForm(f => ({ ...f, division: '' })); }} style={{ padding: '0 8px' }}>Select</button>
                </div>
              ) : (
                <select className="input-field" value={facultyForm.division} onChange={e => {
                  if (e.target.value === 'custom') {
                    setIsCustomFacultyDiv(true);
                    setFacultyForm(f => ({ ...f, division: '' }));
                  } else {
                    setFacultyForm(f => ({ ...f, division: e.target.value }));
                  }
                }} style={{ marginBottom: 0, borderRadius: 12 }}>
                  <option value="">Select Division</option>
                  {availableDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                  <option value="custom">+ Add Custom Division</option>
                </select>
              )}
            </div>
            <div>
              <Label>School</Label>
              {isCustomFacultySchool ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input required className="input-field input-field-rect" placeholder="Enter school" value={facultyForm.school} onChange={e => setFacultyForm(f => ({ ...f, school: e.target.value }))} style={{ marginBottom: 0, flex: 1 }} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setIsCustomFacultySchool(false); setFacultyForm(f => ({ ...f, school: '' })); }} style={{ padding: '0 8px' }}>Select</button>
                </div>
              ) : (
                <select className="input-field" value={facultyForm.school} onChange={e => {
                  if (e.target.value === 'custom') {
                    setIsCustomFacultySchool(true);
                    setFacultyForm(f => ({ ...f, school: '' }));
                  } else {
                    setFacultyForm(f => ({ ...f, school: e.target.value }));
                  }
                }} style={{ marginBottom: 0, borderRadius: 12 }}>
                  <option value="">Select School</option>
                  {availableSchools.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="custom">+ Add Custom School</option>
                </select>
              )}
            </div>
          </div>
          <div>
            <Label>Department</Label>
            {isCustomFacultyDept ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input required className="input-field input-field-rect" placeholder="Enter department" value={facultyForm.department} onChange={e => setFacultyForm(f => ({ ...f, department: e.target.value }))} style={{ marginBottom: 0, flex: 1 }} />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => { setIsCustomFacultyDept(false); setFacultyForm(f => ({ ...f, department: '' })); }} style={{ padding: '0 8px' }}>Select</button>
              </div>
            ) : (
              <select className="input-field" value={facultyForm.department} onChange={e => {
                if (e.target.value === 'custom') {
                  setIsCustomFacultyDept(true);
                  setFacultyForm(f => ({ ...f, department: '' }));
                } else {
                  setFacultyForm(f => ({ ...f, department: e.target.value }));
                }
              }} style={{ marginBottom: 0, borderRadius: 12 }}>
                <option value="">Select Department</option>
                {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                <option value="custom">+ Add Custom Dept</option>
              </select>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Label>Panel</Label>
              <select className="input-field" value={facultyForm.panel} onChange={e => setFacultyForm(f => ({ ...f, panel: e.target.value }))} style={{ marginBottom: 0, borderRadius: 12 }}>
                <option value="">None</option>
                {['PA','PB','PC','PD','ALL'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <Label>Gender</Label>
              <select className="input-field" value={facultyForm.gender} onChange={e => setFacultyForm(f => ({ ...f, gender: e.target.value }))} style={{ marginBottom: 0, borderRadius: 12 }}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            <input type="checkbox" checked={facultyForm.is_primary} onChange={e => setFacultyForm(f => ({ ...f, is_primary: e.target.checked }))} />
            Primary Faculty
          </label>
          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0, marginTop: 8 }}>
            <button type="button" className="btn btn-outline" onClick={() => { setIsFacultyModalOpen(false); setIsCustomFacultyDiv(false); setIsCustomFacultySchool(false); setIsCustomFacultyDept(false); }}>Cancel</button>
            <button type="submit" className="btn">Add Faculty</button>
          </div>
        </form>
      </Modal>

      {/* Add Student Modal */}
      <Modal open={isStudentModalOpen} onClose={() => { setIsStudentModalOpen(false); setIsCustomStudentSchool(false); setIsCustomStudentDept(false); setIsCustomStudentDiv(false); }} title="Add Student">
        <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><Label>Full Name *</Label><input required className="input-field input-field-rect" placeholder="Rahul Sharma" value={studentForm.name} onChange={e => setStudentForm(f => ({ ...f, name: e.target.value }))} style={{ marginBottom: 0 }} /></div>
            <div><Label>Email *</Label><input required type="email" className="input-field input-field-rect" placeholder="rahul@mit.edu" value={studentForm.email} onChange={e => setStudentForm(f => ({ ...f, email: e.target.value }))} style={{ marginBottom: 0 }} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><Label>PRN</Label><input className="input-field input-field-rect" placeholder="e.g. 2019CS001" value={studentForm.prn} onChange={e => setStudentForm(f => ({ ...f, prn: e.target.value }))} style={{ marginBottom: 0 }} /></div>
            <div><Label>Semester</Label><input className="input-field input-field-rect" placeholder="e.g. 5" value={studentForm.semester} onChange={e => setStudentForm(f => ({ ...f, semester: e.target.value }))} style={{ marginBottom: 0 }} /></div>
            <div>
              <Label>Division</Label>
              {isCustomStudentDiv ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input required className="input-field input-field-rect" placeholder="Div" value={studentForm.division} onChange={e => setStudentForm(f => ({ ...f, division: e.target.value }))} style={{ marginBottom: 0, flex: 1 }} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setIsCustomStudentDiv(false); setStudentForm(f => ({ ...f, division: '' })); }} style={{ padding: '0 4px', fontSize: 11 }}>Select</button>
                </div>
              ) : (
                <select className="input-field" value={studentForm.division} onChange={e => {
                  if (e.target.value === 'custom') {
                    setIsCustomStudentDiv(true);
                    setStudentForm(f => ({ ...f, division: '' }));
                  } else {
                    setStudentForm(f => ({ ...f, division: e.target.value }));
                  }
                }} style={{ marginBottom: 0, borderRadius: 12 }}>
                  <option value="">Select</option>
                  {availableDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                  <option value="custom">+ Add New</option>
                </select>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Label>School</Label>
              {isCustomStudentSchool ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input required className="input-field input-field-rect" placeholder="Enter school" value={studentForm.school} onChange={e => setStudentForm(f => ({ ...f, school: e.target.value }))} style={{ marginBottom: 0, flex: 1 }} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setIsCustomStudentSchool(false); setStudentForm(f => ({ ...f, school: '' })); }} style={{ padding: '0 8px' }}>Select</button>
                </div>
              ) : (
                <select className="input-field" value={studentForm.school} onChange={e => {
                  if (e.target.value === 'custom') {
                    setIsCustomStudentSchool(true);
                    setStudentForm(f => ({ ...f, school: '' }));
                  } else {
                    setStudentForm(f => ({ ...f, school: e.target.value }));
                  }
                }} style={{ marginBottom: 0, borderRadius: 12 }}>
                  <option value="">Select School</option>
                  {availableSchools.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="custom">+ Add Custom School</option>
                </select>
              )}
            </div>
            <div>
              <Label>Department</Label>
              {isCustomStudentDept ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input required className="input-field input-field-rect" placeholder="Enter department" value={studentForm.department} onChange={e => setStudentForm(f => ({ ...f, department: e.target.value }))} style={{ marginBottom: 0, flex: 1 }} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setIsCustomStudentDept(false); setStudentForm(f => ({ ...f, department: '' })); }} style={{ padding: '0 8px' }}>Select</button>
                </div>
              ) : (
                <select className="input-field" value={studentForm.department} onChange={e => {
                  if (e.target.value === 'custom') {
                    setIsCustomStudentDept(true);
                    setStudentForm(f => ({ ...f, department: '' }));
                  } else {
                    setStudentForm(f => ({ ...f, department: e.target.value }));
                  }
                }} style={{ marginBottom: 0, borderRadius: 12 }}>
                  <option value="">Select Dept</option>
                  {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                  <option value="custom">+ Add Custom Dept</option>
                </select>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Label>Panel</Label>
              <select className="input-field" value={studentForm.panel} onChange={e => setStudentForm(f => ({ ...f, panel: e.target.value }))} style={{ marginBottom: 0, borderRadius: 12 }}>
                <option value="">None</option>
                {['PA','PB','PC','PD'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <Label>Gender</Label>
              <select className="input-field" value={studentForm.gender} onChange={e => setStudentForm(f => ({ ...f, gender: e.target.value }))} style={{ marginBottom: 0, borderRadius: 12 }}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0, marginTop: 8 }}>
            <button type="button" className="btn btn-outline" onClick={() => { setIsStudentModalOpen(false); setIsCustomStudentSchool(false); setIsCustomStudentDept(false); setIsCustomStudentDiv(false); }}>Cancel</button>
            <button type="submit" className="btn">Add Student</button>
          </div>
        </form>
      </Modal>

      {/* Add LTC Member Modal */}
      <Modal open={isLtcModalOpen} onClose={() => setIsLtcModalOpen(false)} title="Add LTC Member">
        <form onSubmit={handleAddLtcMember} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><Label>Full Name *</Label><input required className="input-field input-field-rect" placeholder="Vijay Patil" value={ltcForm.name} onChange={e => setLtcForm(f => ({ ...f, name: e.target.value }))} style={{ marginBottom: 0 }} /></div>
          <div><Label>Email *</Label><input required type="email" className="input-field input-field-rect" placeholder="vijay@ltc.edu" value={ltcForm.email} onChange={e => setLtcForm(f => ({ ...f, email: e.target.value }))} style={{ marginBottom: 0 }} /></div>
          <div>
            <Label>Role Type</Label>
            <select className="input-field" value={ltcForm.role_type} onChange={e => setLtcForm(f => ({ ...f, role_type: e.target.value }))} style={{ marginBottom: 0, borderRadius: 12 }}>
              <option value="member">Member</option>
              <option value="coordinator">Coordinator</option>
              <option value="volunteer">Volunteer</option>
            </select>
          </div>
          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0, marginTop: 8 }}>
            <button type="button" className="btn btn-outline" onClick={() => setIsLtcModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn">Add LTC Member</button>
          </div>
        </form>
      </Modal>

      {/* Feedback Modal */}
      <Modal open={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} title={`Feedback — ${selectedUserForFeedback?.name || ''}`} size="lg">
        {feedbackList.length === 0
          ? <div className="empty-state"><p>No feedback submitted yet.</p></div>
          : feedbackList.map((f, i) => (
            <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                <span className="badge badge-blue">{f.category}</span>
                <span style={{ fontSize: 12, color: 'var(--text-4)', marginLeft: 'auto' }}>{new Date(f.created_at).toLocaleDateString()}</span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 4px 0' }}>{f.feedback_text}</p>
              {f.additional_notes && <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>Note: {f.additional_notes}</p>}
            </div>
          ))
        }
      </Modal>

      {/* Reset Database Confirmation Modal */}
      <Modal open={isResetConfirmModalOpen} onClose={() => { setIsResetConfirmModalOpen(false); setResetConfirmationInput(''); }} title="Dangerous Action: Reset Database">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '14px', borderRadius: '12px', color: '#b91c1c', fontSize: '13.5px', lineHeight: 1.5 }}>
            <strong>WARNING:</strong> This will permanently delete ALL students, faculty, batches, squads, documents, and timetable schedules. This action is irreversible.
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text-2)', margin: 0 }}>
            To confirm, please type <strong>RESET DATABASE</strong> in the input field below:
          </p>
          <input
            className="input-field input-field-rect"
            placeholder="RESET DATABASE"
            value={resetConfirmationInput}
            onChange={e => setResetConfirmationInput(e.target.value)}
            style={{ marginBottom: 0 }}
          />
          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0, marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => { setIsResetConfirmModalOpen(false); setResetConfirmationInput(''); }}
              disabled={isResetting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleResetDatabase}
              disabled={resetConfirmationInput !== 'RESET DATABASE' || isResetting}
            >
              {isResetting ? 'Resetting...' : 'Permanently Reset Database'}
            </button>
          </div>
        </div>
      </Modal>

      <div id="qr-reader-file-dummy" style={{ display: 'none' }} />
      <ToastContainer toasts={toasts} />
    </div>
  )
}
