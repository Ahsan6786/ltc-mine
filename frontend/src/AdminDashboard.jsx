import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Users, UploadCloud, GraduationCap, BookOpen, CheckCircle,
  AlertCircle, FileText, Search, LogOut, Menu, Trash2, ClipboardList,
  Lock, Unlock, Clock, X, Shield, RefreshCw, ChevronLeft, ChevronRight,
  Layers, BarChart2, Bell, User, Home, Activity, MapPin, Grid,
  Compass, Award, Mail, ChevronDown, UserPlus, Landmark, Network, UserCheck
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
function Modal({ open, onClose, title, children, size = '', hideHeader = false }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size ? 'modal-' + size : ''}`}>
        {!hideHeader && (
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            <button className="btn-icon" onClick={onClose} style={{ border: 'none', padding: 4 }}><X size={18} /></button>
          </div>
        )}
        <div className="modal-body" style={hideHeader ? { padding: '28px' } : {}}>{children}</div>
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

const FormLabel = ({ label, required = false }) => (
  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>
    {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
  </label>
)

// ─── Main AdminDashboard ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null')

  // UI state
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const [mobileSubTool, setMobileSubTool] = useState(null)
  const [mobilePeopleTab, setMobilePeopleTab] = useState('faculty')

  // Data
  const [users, setUsers] = useState([])
  const [documents, setDocuments] = useState([])
  const [batches, setBatches] = useState([])
  const [recentActivities, setRecentActivities] = useState([])

  // Search
  const [facultySearch, setFacultySearch] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedSchool, setSelectedSchool] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedDivision, setSelectedDivision] = useState('')
  const [selectedPanel, setSelectedPanel] = useState('')
  const [facultyDivFilter, setFacultyDivFilter] = useState('')
  const [facultyDeptFilter, setFacultyDeptFilter] = useState('')
  const [facultyTypeFilter, setFacultyTypeFilter] = useState('')

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

  // Bulk upload conflict resolution
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateRecords, setDuplicateRecords] = useState([])
  const [pendingBulkUsers, setPendingBulkUsers] = useState([])


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
    const h = () => {
      setIsMobile(window.innerWidth <= 768)
      setIsDesktop(window.innerWidth >= 1024)
      if (window.innerWidth > 768) setIsSidebarOpen(false)
    }
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
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

  const fetchBatches = useCallback(async () => {
    const res = await apiFetch('/api/admin/batches')
    if (!res) return
    const data = await res.json()
    if (res.ok) setBatches(data.batches || [])
  }, [apiFetch])

  const fetchRecentActivities = useCallback(async () => {
    const res = await apiFetch('/api/admin/audit-logs?page=1&limit=5')
    if (!res) return
    const data = await res.json()
    if (res.ok) setRecentActivities(data.logs || [])
  }, [apiFetch])

  const refreshAllData = useCallback(async () => {
    try {
      await Promise.all([
        fetchUsers(),
        fetchBatches(),
        fetchRecentActivities()
      ])
    } catch (err) {
      console.error('Error refreshing dashboard data:', err)
    }
  }, [fetchUsers, fetchBatches, fetchRecentActivities])

  // ── Auth guard + initial fetch ──
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') { navigate('/login'); return }
    fetchUsers()
    fetchDocuments()
    fetchBatches()
    fetchRecentActivities()
  }, [])

  // Periodically refresh all data to keep counts live and accurate (every 10 seconds)
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return
    const timer = setInterval(() => {
      refreshAllData()
    }, 10000)
    return () => clearInterval(timer)
  }, [currentUser, refreshAllData])


  const faculties = useMemo(() => users.filter(u => {
    if (u.role !== 'faculty') return false
    const q = debouncedFacultySearch.toLowerCase()
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !(u.department || '').toLowerCase().includes(q)) return false
    if (facultyDivFilter && u.division !== facultyDivFilter) return false
    if (facultyDeptFilter && u.department !== facultyDeptFilter) return false
    if (facultyTypeFilter) {
      const isPrimary = u.is_primary ? 'primary' : 'secondary'
      if (isPrimary !== facultyTypeFilter) return false
    }
    return true
  }), [users, debouncedFacultySearch, facultyDivFilter, facultyDeptFilter, facultyTypeFilter])

  const availableFacultyDivisions = useMemo(() => [...new Set(users.filter(u => u.role === 'faculty' && u.division).map(u => u.division))].sort(), [users])
  const availableFacultyDepartments = useMemo(() => [...new Set(users.filter(u => u.role === 'faculty' && u.department).map(u => u.department))].sort(), [users])

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
      refreshAllData()
    } else { toast(data.message || 'Failed to add faculty', 'error') }
  }

  const handleDeleteUser = async (id, role) => {
    if (!window.confirm(`Permanently delete this ${role} from the master database?`)) return
    const res = await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (!res) return
    const data = await res.json()
    toast(data.message, res.ok ? 'success' : 'error')
    if (res.ok) refreshAllData()
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
      refreshAllData()
    } else { toast(data.message || 'Failed to add student', 'error') }
  }

  const handleUpdatePanel = async (userId, panel) => {
    const res = await apiFetch('/api/admin/update-panel', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, panel })
    })
    if (res?.ok) { toast('Panel updated', 'success'); refreshAllData() } else toast('Failed to update panel', 'error')
  }

  const handleUpdateInsurance = async (userId, ins) => {
    const res = await apiFetch('/api/admin/insurance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, insurance: ins === 'true' })
    })
    if (res?.ok) { toast('Insurance updated', 'success'); refreshAllData() } else toast('Failed to update insurance', 'error')
  }

  const handleToggleStudentBatch = async (userId, inBatch) => {
    const res = await apiFetch('/api/admin/toggle-student-batch', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, in_batch: inBatch })
    })
    if (res?.ok) { toast(inBatch ? 'Added to batch' : 'Removed from batch', 'success'); refreshAllData() }
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
    if (res.ok) { toast('LTC Member added.', 'success'); setIsLtcModalOpen(false); setLtcForm({ name: '', email: '', role_type: 'member' }); refreshAllData() }
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
    
    try {
      const checkRes = await apiFetch('/api/admin/bulk-upload/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: all })
      })
      if (!checkRes) throw new Error('Validation failed.')
      const checkData = await checkRes.json()

      if (checkRes.ok && checkData.duplicates && checkData.duplicates.length > 0) {
        setDuplicateRecords(checkData.duplicates)
        setPendingBulkUsers(all)
        setShowDuplicateModal(true)
        setIsUploading(false)
        return
      }

      await executeIngestion(all, 'replace')
    } catch (err) {
      setIsUploading(false)
      toast(err.message || 'Validation error', 'error')
    }
  }

  const executeIngestion = async (users, duplicateAction) => {
    setIsUploading(true)
    setShowProgressModal(true)
    setJobProgress(null)

    try {
      const res = await apiFetch('/api/admin/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users, duplicateAction })
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
                setBulkData({ faculty: [], students: [], errors: [] })
                refreshAllData()
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
      if (res.ok) { setBulkInsuranceData([]); refreshAllData() }
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

  const handleResetDatabase = async () => {
    setIsResetting(true)
    try {
      const res = await apiFetch('/api/admin/reset-database', { method: 'POST' })
      if (!res) return
      const data = await res.json()
      toast(data.message, res.ok ? 'success' : 'error')
      if (res.ok) {
        refreshAllData()
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

  // ─── Mobile Redesign Render Helpers ─────────────────────────────────────────
  const renderMobileDashboard = () => {
    const studCount = users.filter(u => u.role === 'student').length
    const facCount = users.filter(u => u.role === 'faculty').length
    const ltcCount = users.filter(u => u.role === 'ltc_member').length
    const batchCount = batches.length

    return (
      <div className="mobile-dashboard animate-fade-in" style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* SECTION 1: Header */}
        <div className="mobile-dashboard-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #07111f 0%, #112240 100%)',
          padding: '20px',
          borderRadius: '24px',
          color: '#ffffff',
          boxShadow: '0 10px 30px rgba(7, 17, 31, 0.15)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle light leak */}
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.35)', filter: 'blur(30px)' }} />
          
          <div style={{ zIndex: 1 }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
              {getGreeting()}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
              <span className="mobile-pulsing-dot" />
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>System Operational</span>
            </div>
          </div>


        </div>

        {/* SECTION 2: Statistics Cards (2x2 Grid) */}
        <div className="desktop-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: 0 }}>
          <div className="desktop-stat-card blue" onClick={() => setActiveTab('faculty')} style={{ background: "linear-gradient(135deg, rgba(37, 99, 235, 0.88) 0%, rgba(29, 78, 216, 0.92) 100%), url('/c.png') no-repeat center/cover" }}>
            <div className="desktop-stat-header">
              <span className="desktop-stat-title">Faculty</span>
              <div className="desktop-stat-icon-wrap">
                <BookOpen size={20} />
              </div>
            </div>
            <div>
              <div className="desktop-stat-value">{facCount}</div>
              <div className="desktop-stat-footer">
                <span>View Directory &rarr;</span>
              </div>
            </div>
          </div>
          
          <div className="desktop-stat-card purple" onClick={() => setActiveTab('students')} style={{ background: "linear-gradient(135deg, rgba(124, 58, 237, 0.88) 0%, rgba(109, 40, 217, 0.92) 100%), url('/c1.png') no-repeat center/cover" }}>
            <div className="desktop-stat-header">
              <span className="desktop-stat-title">Students</span>
              <div className="desktop-stat-icon-wrap">
                <GraduationCap size={20} />
              </div>
            </div>
            <div>
              <div className="desktop-stat-value">{studCount}</div>
              <div className="desktop-stat-footer">
                <span>View Directory &rarr;</span>
              </div>
            </div>
          </div>

          <div className="desktop-stat-card green" onClick={() => setActiveTab('batches')} style={{ background: "linear-gradient(135deg, rgba(5, 150, 105, 0.88) 0%, rgba(4, 120, 87, 0.92) 100%), url('/c2.png') no-repeat center/cover" }}>
            <div className="desktop-stat-header">
              <span className="desktop-stat-title">Batches</span>
              <div className="desktop-stat-icon-wrap">
                <Layers size={20} />
              </div>
            </div>
            <div>
              <div className="desktop-stat-value">{batchCount}</div>
              <div className="desktop-stat-footer">
                <span>Manage Batches &rarr;</span>
              </div>
            </div>
          </div>

          <div className="desktop-stat-card orange" onClick={() => setActiveTab('ltcmembers')} style={{ background: "linear-gradient(135deg, rgba(234, 88, 12, 0.88) 0%, rgba(194, 65, 12, 0.92) 100%), url('/c3.png') no-repeat center/cover" }}>
            <div className="desktop-stat-header">
              <span className="desktop-stat-title">LTC Members</span>
              <div className="desktop-stat-icon-wrap">
                <Users size={20} />
              </div>
            </div>
            <div>
              <div className="desktop-stat-value">{ltcCount}</div>
              <div className="desktop-stat-footer">
                <span>View Members &rarr;</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Quick Access */}
        <div className="mobile-section-wrapper">
          <h3 className="mobile-section-title">Administrative Tools</h3>
          <div className="mobile-quick-access-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="mobile-quick-card" onClick={() => { setActiveTab('mobile-tools'); setMobileSubTool('bulk'); }}>
              <div className="mobile-quick-icon-wrap" style={{ background: '#ecfeff', color: '#0891b2' }}><UploadCloud size={18} /></div>
              <div className="mobile-quick-info">
                <span className="mobile-quick-label">Bulk Upload</span>
                <span className="mobile-quick-desc">CSV / XLSX files</span>
              </div>
            </div>
            <div className="mobile-quick-card" onClick={() => { setActiveTab('mobile-tools'); setMobileSubTool('timetable'); }}>
              <div className="mobile-quick-icon-wrap" style={{ background: '#f0fdf4', color: '#0d9488' }}><Clock size={18} /></div>
              <div className="mobile-quick-info">
                <span className="mobile-quick-label">Timetable</span>
                <span className="mobile-quick-desc">Immersion schedule</span>
              </div>
            </div>
            <div className="mobile-quick-card" onClick={() => { setActiveTab('mobile-tools'); setMobileSubTool('documents'); }}>
              <div className="mobile-quick-icon-wrap" style={{ background: '#f8fafc', color: '#475569' }}><FileText size={18} /></div>
              <div className="mobile-quick-info">
                <span className="mobile-quick-label">Documents</span>
                <span className="mobile-quick-desc">SOPs & templates</span>
              </div>
            </div>
            <div className="mobile-quick-card" onClick={() => { setActiveTab('mobile-tools'); setMobileSubTool('reports'); }}>
              <div className="mobile-quick-icon-wrap" style={{ background: '#fff1f2', color: '#e11d48' }}><BarChart2 size={18} /></div>
              <div className="mobile-quick-info">
                <span className="mobile-quick-label">Reports</span>
                <span className="mobile-quick-desc">System logs & audit</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Today's Schedule */}
        <div className="mobile-section-wrapper">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 className="mobile-section-title" style={{ margin: 0 }}>Today's Schedule</h3>
            <span onClick={() => { setActiveTab('mobile-tools'); setMobileSubTool('timetable'); }} style={{ color: '#2563eb', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>View Timetable &rarr;</span>
          </div>
          <div className="mobile-schedule-card">
            <div className="mobile-schedule-timeline">
              {MOCK_SCHEDULE.map((sch, idx) => (
                <div key={idx} className="mobile-schedule-timeline-item">
                  <div className="mobile-schedule-time-col">
                    <span className="mobile-schedule-time">{sch.time.split(' ')[0]}</span>
                    <span className="mobile-schedule-ampm">{sch.time.split(' ')[1]}</span>
                  </div>
                  <div className="mobile-schedule-line-col">
                    <div className="mobile-schedule-icon-wrapper" style={{ border: '1.5px solid #e2e8f0', color: '#64748b', backgroundColor: '#f8fafc' }}>
                      {getScheduleIcon(sch.iconName, '#64748b', 11)}
                    </div>
                    {idx < MOCK_SCHEDULE.length - 1 && <span className="mobile-schedule-line" />}
                  </div>
                  <div className="mobile-schedule-content-col">
                    <div className="mobile-schedule-event">{sch.event}</div>
                    <div className="mobile-schedule-meta">
                      <MapPin size={11} />
                      <span>{sch.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderMobilePeople = () => {
    if (users.length === 0) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '20px',
          textAlign: 'center',
          boxSizing: 'border-box'
        }} className="animate-fade-in">
          <div style={{
            background: 'rgba(37, 99, 235, 0.05)',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            color: '#2563eb'
          }}>
            <Users size={40} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>No Data Available</h3>
          <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '280px', margin: '0 auto 24px', lineHeight: '1.5' }}>
            There is currently no people data registered in the portal.
          </p>
          <button 
            className="btn btn-outline" 
            onClick={fetchUsers}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} /> Refresh Data
          </button>
        </div>
      )
    }

    return (
      <div className="mobile-people-wrapper animate-fade-in" style={{ padding: '16px' }}>
        <div className="mobile-subtabs" style={{ display: 'flex', background: '#e2e8f0', padding: '6px', borderRadius: '16px', marginBottom: '20px' }}>
          <button className={`mobile-subtab-btn ${mobilePeopleTab === 'faculty' ? 'active' : ''}`} style={{ flex: 1, background: mobilePeopleTab === 'faculty' ? '#ffffff' : 'none', border: 'none', padding: '12px 10px', borderRadius: '12px', fontSize: '15px', fontWeight: '800', color: mobilePeopleTab === 'faculty' ? '#2563eb' : '#475569', boxShadow: mobilePeopleTab === 'faculty' ? '0 4px 10px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s ease' }} onClick={() => setMobilePeopleTab('faculty')}>Faculty</button>
          <button className={`mobile-subtab-btn ${mobilePeopleTab === 'students' ? 'active' : ''}`} style={{ flex: 1, background: mobilePeopleTab === 'students' ? '#ffffff' : 'none', border: 'none', padding: '12px 10px', borderRadius: '12px', fontSize: '15px', fontWeight: '800', color: mobilePeopleTab === 'students' ? '#2563eb' : '#475569', boxShadow: mobilePeopleTab === 'students' ? '0 4px 10px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s ease' }} onClick={() => setMobilePeopleTab('students')}>Students</button>
          <button className={`mobile-subtab-btn ${mobilePeopleTab === 'ltcmembers' ? 'active' : ''}`} style={{ flex: 1, background: mobilePeopleTab === 'ltcmembers' ? '#ffffff' : 'none', border: 'none', padding: '12px 10px', borderRadius: '12px', fontSize: '15px', fontWeight: '800', color: mobilePeopleTab === 'ltcmembers' ? '#2563eb' : '#475569', boxShadow: mobilePeopleTab === 'ltcmembers' ? '0 4px 10px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s ease' }} onClick={() => setMobilePeopleTab('ltcmembers')}>LTC Members</button>
        </div>

        <div className="mobile-people-content">
          {mobilePeopleTab === 'faculty' && (
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
              hideTitle={true}
            />
          )}

          {mobilePeopleTab === 'students' && (
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
              hideTitle={true}
            />
          )}

          {mobilePeopleTab === 'ltcmembers' && (
            <div className="animate-fade-in">
              <div className="page-header" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{ltcMembers.length} members</span>
                  <button className="btn btn-sm" onClick={() => setIsLtcModalOpen(true)}><Plus size={14} /> Add Member</button>
                </div>
              </div>
              <div className="glass-card" style={{ padding: 0 }}>
                {ltcMembers.length === 0 ? (
                  <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={36} style={{ color: 'var(--text-4)', marginBottom: '12px' }} />
                    <p style={{ color: 'var(--text-3)', fontSize: '14.5px', fontWeight: '600', margin: 0 }}>No members yet.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead><tr><th>Name</th><th>Role</th><th>Actions</th></tr></thead>
                      <tbody>
                        {ltcMembers.map(u => (
                          <tr key={u.id}>
                            <td>
                              <div style={{ fontWeight: 700, fontSize: '13px' }}>{u.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.email}</div>
                            </td>
                            <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{u.department || 'member'}</span></td>
                            <td>
                              <button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: '2px 6px' }} onClick={() => handleDeleteUser(u.id, 'ltc_member')}>
                                <Trash2 size={10} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderMobileTools = () => {
    if (!mobileSubTool) {
      return (
        <div className="mobile-tools-grid animate-fade-in" style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="mobile-tool-large-card" style={{ background: '#ffffff', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer' }} onClick={() => setMobileSubTool('bulk')}>
            <div style={{ background: '#ecfeff', color: '#0891b2', padding: '10px', borderRadius: '12px', alignSelf: 'flex-start', display: 'flex' }}><UploadCloud size={20} /></div>
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Bulk Upload</h4>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Import students & faculty</p>
          </div>
          <div className="mobile-tool-large-card" style={{ background: '#ffffff', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer' }} onClick={() => setMobileSubTool('timetable')}>
            <div style={{ background: '#f0fdf4', color: '#0d9488', padding: '10px', borderRadius: '12px', alignSelf: 'flex-start', display: 'flex' }}><Clock size={20} /></div>
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Timetable</h4>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Immersion schedule</p>
          </div>
          <div className="mobile-tool-large-card" style={{ background: '#ffffff', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer' }} onClick={() => setMobileSubTool('documents')}>
            <div style={{ background: '#f8fafc', color: '#475569', padding: '10px', borderRadius: '12px', alignSelf: 'flex-start', display: 'flex' }}><FileText size={20} /></div>
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Documents & SOPs</h4>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Guidelines & forms</p>
          </div>
          <div className="mobile-tool-large-card" style={{ background: '#ffffff', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer' }} onClick={() => setMobileSubTool('reports')}>
            <div style={{ background: '#fff1f2', color: '#e11d48', padding: '10px', borderRadius: '12px', alignSelf: 'flex-start', display: 'flex' }}><BarChart2 size={20} /></div>
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Reports & Logs</h4>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Audit logs & analytics</p>
          </div>
        </div>
      )
    }

    return (
      <div className="mobile-tool-detail animate-fade-in" style={{ padding: '16px' }}>
        <button onClick={() => setMobileSubTool(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: '700', marginBottom: '16px', padding: 0, cursor: 'pointer' }}>
          &larr; Back to Tools
        </button>

        {mobileSubTool === 'timetable' && <TimetablePanel />}
        {mobileSubTool === 'documents' && (
          <DocumentsModule
            documents={documents}
            docForm={docForm}
            setDocForm={setDocForm}
            handleUploadDocument={handleUploadDocument}
            handleDeleteDocument={handleDeleteDocument}
            Label={Label}
          />
        )}
        {mobileSubTool === 'reports' && <ReportsModule token={token} toast={toast} />}
        {mobileSubTool === 'bulk' && (
          <div className="animate-fade-in">
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, marginTop: 0 }}>Upload Users (Students / Faculty)</h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>
                CSV/XLSX must have columns: <code>name</code>, <code>email</code>, <code>role</code> (student/faculty), and optionally <code>prn</code>, <code>department</code>, <code>semester</code>, <code>school</code>, <code>panel</code>, <code>gender</code>, <code>nri</code>
              </p>
              <label className="btn btn-outline" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
                <UploadCloud size={16} /> Choose File (CSV / XLSX)
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>

              {(bulkData.faculty.length > 0 || bulkData.students.length > 0 || bulkData.errors.length > 0) && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
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
          </div>
        )}
      </div>
    )
  }

  const renderMobileProfile = () => {
    return (
      <div className="mobile-profile animate-fade-in" style={{ padding: '24px 16px' }}>
        <div className="mobile-profile-card" style={{ background: '#ffffff', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '32px', background: '#07111f', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800' }}>AD</div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Super Admin</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{currentUser?.email || 'admin@ltc.edu'}</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
          <button className="btn btn-outline" style={{ borderColor: '#ef4444', color: '#ef4444', justifyContent: 'center', height: '48px', borderRadius: '12px', fontSize: '14px', fontWeight: '700' }} onClick={() => setIsResetConfirmModalOpen(true)}>
            <Trash2 size={16} /> Reset Database
          </button>
          <button className="btn" style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', justifyContent: 'center', height: '48px', borderRadius: '12px', fontSize: '14px', fontWeight: '700' }} onClick={handleLogout}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    )
  }

  // ─── Desktop Redesign Render Helpers ─────────────────────────────────────────
  const getGreeting = () => {
    const hours = new Date().getHours()
    if (hours < 12) return 'Good Morning, Admin! 🌅'
    if (hours < 18) return 'Good Afternoon, Admin! ☀️'
    return 'Good Evening, Admin!'
  }

  const renderDonutChart = () => {
    const studCount = users.filter(u => u.role === 'student').length
    const facCount = users.filter(u => u.role === 'faculty').length
    const ltcCount = users.filter(u => u.role === 'ltc_member').length
    const admCount = users.filter(u => u.role === 'admin').length
    const total = studCount + facCount + ltcCount + admCount
    
    if (total === 0) return null

    const r = 50
    const C = 2 * Math.PI * r
    let accumulatedPercent = 0

    const segments = [
      { val: studCount, color: '#2563eb', label: 'Students' },
      { val: facCount, color: '#10b981', label: 'Faculty' },
      { val: ltcCount, color: '#7c3aed', label: 'LTC Members' },
      { val: admCount, color: '#f97316', label: 'Others' }
    ].filter(x => x.val > 0)

    return (
      <div className="desktop-overview-container">
        <svg width="150" height="150" viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
          <circle cx="80" cy="80" r={r} fill="transparent" stroke="#f1f5f9" strokeWidth="14" />
          {segments.map((seg, idx) => {
            const percent = seg.val / total
            const strokeDasharray = `${percent * C} ${C}`
            const strokeDashoffset = -accumulatedPercent * C
            accumulatedPercent += percent
            return (
              <circle
                key={idx}
                cx="80"
                cy="80"
                r={r}
                fill="transparent"
                stroke={seg.color}
                strokeWidth="14"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 80 80)"
              />
            )
          })}
          <text x="80" y="76" textAnchor="middle" fontSize="10" fontWeight="700" fill="#94a3b8" letterSpacing="0.5">TOTAL USERS</text>
          <text x="80" y="96" textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f172a">{total.toLocaleString()}</text>
        </svg>
        <div className="desktop-overview-legend">
          {segments.map((seg, idx) => (
            <div key={idx} className="desktop-overview-legend-item">
              <span className="desktop-overview-legend-label">
                <span className="desktop-overview-dot" style={{ backgroundColor: seg.color }} />
                <span>{seg.label}</span>
              </span>
              <span className="desktop-overview-legend-value">{seg.val.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const getRecentActivities = () => {
    if (recentActivities.length > 0) {
      return recentActivities.map(log => {
        let actText = log.action
        const mapping = {
          BATCH_CREATED: 'Batch Created',
          BATCH_UPDATED: 'Batch Updated',
          BATCH_ARCHIVED: 'Batch Archived',
          BATCH_RESTORED: 'Batch Restored',
          STUDENT_AUTO_CREATED: 'Student Registered',
          SQUAD_LEADER_UPDATED: 'Squad Leader Appointed',
          FACULTY_ASSIGNED: 'Faculty Appointed',
          FACULTY_REMOVED: 'Faculty Removed',
          BULK_UPLOAD_COMPLETED: 'Bulk Ingestion Completed'
        }
        if (mapping[log.action]) actText = mapping[log.action]
        else actText = log.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

        let timeStr = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        
        return {
          action: `${actText} by ${log.user_name || 'System'}`,
          time: timeStr,
          icon: log.action.includes('FACULTY') ? 'faculty' : (log.action.includes('BATCH') ? 'batch' : 'system')
        }
      })
    }
    
    return [
      { action: 'Dr. Rahul Karad added as new faculty', time: '2 min ago', icon: 'faculty' },
      { action: 'Batch "Immersion 48" created', time: '1 hour ago', icon: 'batch' },
      { action: 'Timetable updated for tomorrow', time: '3 hours ago', icon: 'timetable' },
      { action: 'Document "SOP Guidelines" uploaded', time: '5 hours ago', icon: 'document' }
    ]
  }

  const getScheduleIcon = (iconName, color, size = 16) => {
    switch (iconName) {
      case 'compass':
        return <Compass size={size} />;
      case 'award':
        return <Award size={size} />;
      case 'users':
        return <Users size={size} />;
      case 'activity':
        return <Activity size={size} />;
      default:
        return <Clock size={size} />;
    }
  }

  const MOCK_SCHEDULE = [
    { time: '09:00 AM', event: 'Meditation Session', location: 'Hall 1', color: '#2563eb', iconName: 'compass' },
    { time: '11:00 AM', event: 'Immersion Program', location: 'Batch 12', color: '#7c3aed', iconName: 'award' },
    { time: '02:00 PM', event: 'Faculty Meeting', location: 'Conference Room', color: '#059669', iconName: 'users' },
    { time: '04:00 PM', event: 'Review & Feedback', location: 'Admin Office', color: '#ea580c', iconName: 'activity' }
  ]

  const quickAccessActions = [
    { label: 'Faculty', tab: 'faculty', icon: <BookOpen size={16} />, color: '#ebf5ff', textColor: '#2563eb' },
    { label: 'Students', tab: 'students', icon: <GraduationCap size={16} />, color: '#f0fdf4', textColor: '#10b981' },
    { label: 'Batch Management', tab: 'batches', icon: <Layers size={16} />, color: '#fef3c7', textColor: '#d97706' },
    { label: 'LTC Members', tab: 'ltcmembers', icon: <Users size={16} />, color: '#f3e8ff', textColor: '#7c3aed' },
    { label: 'Bulk Upload', tab: 'bulk', icon: <UploadCloud size={16} />, color: '#ecfeff', textColor: '#0891b2' },
    { label: 'Reports & Logs', tab: 'reports', icon: <BarChart2 size={16} />, color: '#fff1f2', textColor: '#e11d48' },
    { label: 'Documents & SOPs', tab: 'documents', icon: <FileText size={16} />, color: '#f8fafc', textColor: '#475569' },
    { label: 'Timetable', tab: 'timetable', icon: <Clock size={16} />, color: '#f0fdfa', textColor: '#0d9488' }
  ]

  const renderDashboardHomepage = () => {
    const studCount = users.filter(u => u.role === 'student').length
    const facCount = users.filter(u => u.role === 'faculty').length
    const ltcCount = users.filter(u => u.role === 'ltc_member').length
    const batchCount = batches.length

    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              {getGreeting()}
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', marginTop: '6px' }}>
              Welcome back to LTC Admin Portal
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-outline btn-sm" style={{ padding: '8px', position: 'relative', height: '34px', background: 'white' }} title="Notifications">
              <Bell size={14} />
              <span style={{ position: 'absolute', top: '2px', right: '2px', width: '5px', height: '5px', background: '#ef4444', borderRadius: '50%' }} />
            </button>
            <button className="btn btn-outline btn-sm" style={{ height: '34px' }} onClick={refreshAllData} title="Refresh Dashboard">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="desktop-stats-grid">
          <div className="desktop-stat-card blue" onClick={() => setActiveTab('faculty')} style={{ background: "linear-gradient(135deg, rgba(37, 99, 235, 0.88) 0%, rgba(29, 78, 216, 0.92) 100%), url('/c.png') no-repeat center/cover" }}>
            <div className="desktop-stat-header">
              <span className="desktop-stat-title">Faculty</span>
              <div className="desktop-stat-icon-wrap">
                <BookOpen size={20} />
              </div>
            </div>
            <div>
              <div className="desktop-stat-value">{facCount}</div>
              <div className="desktop-stat-footer">
                <span>View Directory &rarr;</span>
              </div>
            </div>
          </div>

          <div className="desktop-stat-card purple" onClick={() => setActiveTab('students')} style={{ background: "linear-gradient(135deg, rgba(124, 58, 237, 0.88) 0%, rgba(109, 40, 217, 0.92) 100%), url('/c1.png') no-repeat center/cover" }}>
            <div className="desktop-stat-header">
              <span className="desktop-stat-title">Students</span>
              <div className="desktop-stat-icon-wrap">
                <GraduationCap size={20} />
              </div>
            </div>
            <div>
              <div className="desktop-stat-value">{studCount}</div>
              <div className="desktop-stat-footer">
                <span>View Directory &rarr;</span>
              </div>
            </div>
          </div>

          <div className="desktop-stat-card green" onClick={() => setActiveTab('batches')} style={{ background: "linear-gradient(135deg, rgba(5, 150, 105, 0.88) 0%, rgba(4, 120, 87, 0.92) 100%), url('/c2.png') no-repeat center/cover" }}>
            <div className="desktop-stat-header">
              <span className="desktop-stat-title">Batches</span>
              <div className="desktop-stat-icon-wrap">
                <Layers size={20} />
              </div>
            </div>
            <div>
              <div className="desktop-stat-value">{batchCount}</div>
              <div className="desktop-stat-footer">
                <span>Manage Batches &rarr;</span>
              </div>
            </div>
          </div>

          <div className="desktop-stat-card orange" onClick={() => setActiveTab('ltcmembers')} style={{ background: "linear-gradient(135deg, rgba(234, 88, 12, 0.88) 0%, rgba(194, 65, 12, 0.92) 100%), url('/c3.png') no-repeat center/cover" }}>
            <div className="desktop-stat-header">
              <span className="desktop-stat-title">LTC Members</span>
              <div className="desktop-stat-icon-wrap">
                <Users size={20} />
              </div>
            </div>
            <div>
              <div className="desktop-stat-value">{ltcCount}</div>
              <div className="desktop-stat-footer">
                <span>View Members &rarr;</span>
              </div>
            </div>
          </div>
        </div>

        <div className="desktop-dashboard-grid-main">
          <div className="desktop-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Today's Schedule</h3>
              <button 
                onClick={() => setActiveTab('timetable')} 
                style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
              >
                View Timetable &rarr;
              </button>
            </div>
            
            <div className="desktop-schedule-list" style={{ paddingLeft: 0 }}>
              {MOCK_SCHEDULE.map((sch, idx) => (
                <div key={idx} className="desktop-schedule-item">
                  <div className="desktop-schedule-time-col">
                    <span className="desktop-schedule-time">{sch.time.split(' ')[0]}</span>
                    <span className="desktop-schedule-ampm">{sch.time.split(' ')[1]}</span>
                  </div>
                  
                   <div className="desktop-schedule-line-col">
                    <div className="desktop-schedule-icon-wrapper" style={{ border: '2px solid #e2e8f0', color: '#64748b', backgroundColor: '#f8fafc' }}>
                      {getScheduleIcon(sch.iconName, '#64748b', 14)}
                    </div>
                    {idx < MOCK_SCHEDULE.length - 1 && <div className="desktop-schedule-line" />}
                  </div>

                  <div className="desktop-schedule-content">
                    <div className="desktop-schedule-title">{sch.event}</div>
                    <div className="desktop-schedule-location">
                      <MapPin size={12} />
                      <span>{sch.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="desktop-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>User Distribution</h3>
              <button 
                onClick={() => setActiveTab('reports')} 
                style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
              >
                View Reports &rarr;
              </button>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {renderDonutChart()}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderDesktopSidebar = () => {
    return (
      <div className="desktop-sidebar">
        <div className="desktop-sidebar-header" style={{ justifyContent: 'center' }}>
          <img src="/ltc.png" alt="LTC Logo" className="desktop-sidebar-logo" />
        </div>
        <div className="desktop-sidebar-nav">
          <button
            className={`desktop-sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="desktop-sidebar-item-content">
              <Home size={16} />
              <span>Dashboard</span>
            </span>
          </button>

          <div className="desktop-sidebar-group">
            <span className="desktop-sidebar-label">Management</span>
            <button
              className={`desktop-sidebar-item ${activeTab === 'faculty' ? 'active' : ''}`}
              onClick={() => setActiveTab('faculty')}
            >
              <span className="desktop-sidebar-item-content">
                <BookOpen size={16} />
                <span>Faculty</span>
              </span>
            </button>
            <button
              className={`desktop-sidebar-item ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              <span className="desktop-sidebar-item-content">
                <GraduationCap size={16} />
                <span>Students</span>
              </span>
            </button>
            <button
              className={`desktop-sidebar-item ${activeTab === 'batches' ? 'active' : ''}`}
              onClick={() => setActiveTab('batches')}
            >
              <span className="desktop-sidebar-item-content">
                <Layers size={16} />
                <span>Batch Management</span>
              </span>
            </button>
            <button
              className={`desktop-sidebar-item ${activeTab === 'ltcmembers' ? 'active' : ''}`}
              onClick={() => setActiveTab('ltcmembers')}
            >
              <span className="desktop-sidebar-item-content">
                <Users size={16} />
                <span>LTC Members</span>
              </span>
            </button>
          </div>

          <div className="desktop-sidebar-group">
            <span className="desktop-sidebar-label">Tools</span>
            <button
              className={`desktop-sidebar-item ${activeTab === 'timetable' ? 'active' : ''}`}
              onClick={() => setActiveTab('timetable')}
            >
              <span className="desktop-sidebar-item-content">
                <Clock size={16} />
                <span>Immersion Timetable</span>
              </span>
            </button>
            <button
              className={`desktop-sidebar-item ${activeTab === 'bulk' ? 'active' : ''}`}
              onClick={() => setActiveTab('bulk')}
            >
              <span className="desktop-sidebar-item-content">
                <UploadCloud size={16} />
                <span>Bulk Upload</span>
              </span>
            </button>
            <button
              className={`desktop-sidebar-item ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              <span className="desktop-sidebar-item-content">
                <FileText size={16} />
                <span>Documents & SOPs</span>
              </span>
            </button>
            <button
              className={`desktop-sidebar-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <span className="desktop-sidebar-item-content">
                <BarChart2 size={16} />
                <span>Reports & Logs</span>
              </span>
            </button>
          </div>
        </div>

        <div className="desktop-sidebar-footer" style={{ padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div className="sidebar-profile-card">
            <div className="sidebar-profile-avatar">AD</div>
            <div className="sidebar-profile-details">
              <div className="sidebar-profile-name">Admin</div>
              <div className="sidebar-profile-role">Super Admin</div>
            </div>
          </div>
          <button className="sidebar-action-btn reset-btn" onClick={() => setIsResetConfirmModalOpen(true)}>
            <Trash2 size={15} />
            <span>Reset Database</span>
          </button>
          <button className="sidebar-action-btn signout-btn" onClick={handleLogout}>
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    )
  }

  const renderDesktopTopbar = () => {
    return null
  }

  const renderDesktopLayout = () => {
    return (
      <div className="desktop-layout">
        <ScrollToTop />
        {renderDesktopSidebar()}
        <div className="desktop-main-container">
          {renderDesktopTopbar()}
          <div className="desktop-content" style={activeTab === 'dashboard' ? { overflowY: 'hidden', padding: '48px 40px 32px' } : {}}>
            {activeTab === 'dashboard' && renderDashboardHomepage()}
            {activeTab === 'timetable' && <TimetablePanel />}
            {activeTab === 'batches' && (
              <BatchManagementModule token={token} onBatchesChange={refreshAllData} />
            )}
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
                isDesktop={true}
                facultyDivFilter={facultyDivFilter}
                setFacultyDivFilter={setFacultyDivFilter}
                facultyDeptFilter={facultyDeptFilter}
                setFacultyDeptFilter={setFacultyDeptFilter}
                facultyTypeFilter={facultyTypeFilter}
                setFacultyTypeFilter={setFacultyTypeFilter}
                availableFacultyDivisions={availableFacultyDivisions}
                availableFacultyDepartments={availableFacultyDepartments}
                apiFetch={apiFetch}
                toast={toast}
              />
            )}
            {activeTab === 'students' && (
              <div className="desktop-card">
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
              </div>
            )}
            {activeTab === 'ltcmembers' && (
              <div className="desktop-card animate-fade-in">
                <div className="page-header" style={{ marginBottom: 20 }}>
                  <div className="page-header-left">
                    <h2 className="page-title">LTC Members</h2>
                    <p className="page-subtitle">{ltcMembers.length} members</p>
                  </div>
                  <div className="page-header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button className="btn btn-outline btn-sm" style={{ padding: '8px', position: 'relative' }} title="Notifications">
                      <Bell size={14} />
                      <span style={{ position: 'absolute', top: '2px', right: '2px', width: '5px', height: '5px', background: '#ef4444', borderRadius: '50%' }} />
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={fetchUsers}><RefreshCw size={14} /></button>
                    <button className="btn" onClick={() => setIsLtcModalOpen(true)}><Plus size={16} /> Add LTC Member</button>
                  </div>
                </div>
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
            )}
            {activeTab === 'bulk' && (
              <div className="desktop-card animate-fade-in">
                <div className="page-header" style={{ marginBottom: 20 }}>
                  <div className="page-header-left">
                    <h2 className="page-title">Bulk Upload</h2>
                    <p className="page-subtitle">Upload CSV/XLSX to add students and faculty to the master database</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 24 }}>
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Upload Users (Students / Faculty)</h3>
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
                </div>
              </div>
            )}
            {activeTab === 'documents' && (
              <div className="desktop-card">
                <DocumentsModule
                  documents={documents}
                  docForm={docForm}
                  setDocForm={setDocForm}
                  handleUploadDocument={handleUploadDocument}
                  handleDeleteDocument={handleDeleteDocument}
                  Label={Label}
                />
              </div>
            )}
            {activeTab === 'reports' && (
              <div className="desktop-card">
                <ReportsModule token={token} toast={toast} />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {isDesktop ? renderDesktopLayout() : (
        <div className="dashboard-layout mobile-layout">
          <ScrollToTop />

          {/* Overlay */}
          {isSidebarOpen && (
            <div 
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} 
              onClick={() => setIsSidebarOpen(false)} 
            />
          )}

          {/* ── Sidebar ── */}
          <div className="sidebar" style={{
            position: 'fixed',
            top: 0, left: 0, bottom: 0, zIndex: 1000, height: '100vh',
            transform: !isSidebarOpen ? 'translateX(-100%)' : 'none',
            transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
            paddingTop: 'env(safe-area-inset-top)',
            boxSizing: 'border-box'
          }}>
            <div className="sidebar-header">
              <div className="sidebar-brand-container">
                <img src="/ltc.png" alt="LTC Logo" className="sidebar-brand-logo" />
              </div>
              <button className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)} aria-label="Close Sidebar">
                <X size={14} />
              </button>
            </div>

            <nav className="sidebar-nav">
              <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', padding: '8px 12px 0', display: 'block' }}>admin</span>
              <p className="sidebar-section-label" style={{ paddingTop: '8px' }}>Management</p>
              <NavItem tab="dashboard" icon={<Home size={16} />} label="Dashboard" />
              <NavItem tab="people" icon={<Users size={16} />} label="People" />
              <NavItem tab="batches" icon={<Layers size={16} />} label="Batch Management" />

              <div className="sidebar-separator" />
              <p className="sidebar-section-label">Tools</p>
              <NavItem tab="timetable" icon={<Clock size={16} />} label="Immersion Timetable" />
              <NavItem tab="bulk" icon={<UploadCloud size={16} />} label="Bulk Upload" />
              <NavItem tab="documents" icon={<FileText size={16} />} label="Documents & SOPs" />
              <NavItem tab="reports" icon={<BarChart2 size={16} />} label="Reports & Logs" />
            </nav>

            <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 16px calc(16px + env(safe-area-inset-bottom))', borderTop: '1px solid rgba(255, 255, 255, 0.06)', background: 'transparent', width: '100%', boxSizing: 'border-box' }}>
              <div className="sidebar-profile-card">
                <div className="sidebar-profile-avatar">AD</div>
                <div className="sidebar-profile-details">
                  <div className="sidebar-profile-name">Admin</div>
                  <div className="sidebar-profile-role">Super Admin</div>
                </div>
              </div>
              <button className="sidebar-action-btn reset-btn" onClick={() => setIsResetConfirmModalOpen(true)}>
                <Trash2 size={15} />
                <span>Reset Database</span>
              </button>
              <button className="sidebar-action-btn signout-btn" onClick={handleLogout}>
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* ── Main Content ── */}
          <div className="main-content">
            {/* Mobile topbar */}
             {!isSidebarOpen && (
              <div 
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 'calc(56px + env(safe-area-inset-top))',
                  zIndex: 999,
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(12px)',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 'env(safe-area-inset-top)',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  boxSizing: 'border-box',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
                }}
              >
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="Open Sidebar"
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Menu size={16} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    style={{ 
                      padding: 0,
                      position: 'relative',
                      height: '34px',
                      width: '34px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      color: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      cursor: 'pointer'
                    }} 
                    title="Notifications"
                  >
                    <Bell size={14} />
                    <span style={{ position: 'absolute', top: '8px', right: '8px', width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%' }} />
                  </button>
                  <button 
                    style={{ 
                      height: '34px',
                      width: '34px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      color: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      cursor: 'pointer'
                    }} 
                    onClick={refreshAllData} 
                    title="Refresh Dashboard"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Content Switcher */}
            <div className="mobile-content-container" style={{ padding: 'calc(64px + env(safe-area-inset-top)) 0px calc(90px + env(safe-area-inset-bottom))' }}>
              {activeTab === 'dashboard' && renderMobileDashboard()}

              {/* ── Timetable ── */}
              {activeTab === 'timetable' && <TimetablePanel />}

              {/* ── Batch Management ── */}
              {activeTab === 'batches' && (
                <div className="mobile-batches-wrapper animate-fade-in" style={{ padding: '0 16px' }}>
                  <BatchManagementModule token={token} onBatchesChange={refreshAllData} />
                </div>
              )}

              {/* ── Master Faculty Tab ── */}
              {activeTab === 'faculty' && (
                <div className="animate-fade-in" style={{ padding: '0 16px' }}>
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
                </div>
              )}

              {/* ── Master Students Tab ── */}
              {activeTab === 'students' && (
                <div className="animate-fade-in" style={{ padding: '0 16px' }}>
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
                </div>
              )}

              {/* ── LTC Members Tab ── */}
              {activeTab === 'ltcmembers' && (
                <div className="animate-fade-in" style={{ padding: '0 16px' }}>
                  <div className="page-header">
                    <div className="page-header-left">
                      <h2 className="page-title">LTC Members</h2>
                      <p className="page-subtitle">{ltcMembers.length} members</p>
                    </div>
                    <div className="page-header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button className="btn btn-outline btn-sm" style={{ padding: '8px', position: 'relative' }} title="Notifications">
                        <Bell size={14} />
                        <span style={{ position: 'absolute', top: '2px', right: '2px', width: '5px', height: '5px', background: '#ef4444', borderRadius: '50%' }} />
                      </button>
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

              {/* ── Bulk Ingestion ── */}
              {activeTab === 'bulk' && (
                <div className="animate-fade-in" style={{ padding: '0 16px' }}>
                  <div className="page-header">
                    <div className="page-header-left">
                      <h2 className="page-title">Bulk Upload</h2>
                      <p className="page-subtitle">Upload CSV/XLSX to add students and faculty to the master database</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 24 }}>
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
                  </div>
                </div>
              )}

              {/* ── Documents Tab ── */}
              {activeTab === 'documents' && (
                <div className="animate-fade-in" style={{ padding: '0 16px' }}>
                  <DocumentsModule
                    documents={documents}
                    docForm={docForm}
                    setDocForm={setDocForm}
                    handleUploadDocument={handleUploadDocument}
                    handleDeleteDocument={handleDeleteDocument}
                    Label={Label}
                  />
                </div>
              )}

              {/* ── Reports Tab ── */}
              {activeTab === 'reports' && (
                <div className="animate-fade-in" style={{ padding: '0 16px' }}>
                  <ReportsModule token={token} toast={toast} />
                </div>
              )}

              {/* ── People Tab ── */}
              {activeTab === 'people' && renderMobilePeople()}

              {/* ── Tools Tab ── */}
              {['tools', 'mobile-tools'].includes(activeTab) && renderMobileTools()}

              {/* ── Profile Tab ── */}
              {['profile', 'mobile-profile'].includes(activeTab) && renderMobileProfile()}
            </div>
          </div>

          {/* ── Bottom Navigation ── */}
          <div className="mobile-bottom-nav">
            <button 
              className={`mobile-bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Home size={20} />
              <span>Home</span>
            </button>
            <button 
              className={`mobile-bottom-nav-item ${['people', 'faculty', 'students', 'ltcmembers'].includes(activeTab) ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('people');
                setMobilePeopleTab('faculty');
              }}
            >
              <Users size={20} />
              <span>People</span>
            </button>
            <button 
              className={`mobile-bottom-nav-item ${activeTab === 'batches' ? 'active' : ''}`}
              onClick={() => setActiveTab('batches')}
            >
              <Layers size={20} />
              <span>Batches</span>
            </button>
            <button 
              className={`mobile-bottom-nav-item ${['tools', 'mobile-tools', 'timetable', 'bulk', 'documents', 'reports'].includes(activeTab) ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('tools');
                setMobileSubTool(null);
              }}
            >
              <Grid size={20} />
              <span>Tools</span>
            </button>
            <button 
              className={`mobile-bottom-nav-item ${['profile', 'mobile-profile'].includes(activeTab) ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={20} />
              <span>Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}

      {/* Add Faculty Modal */}
      <Modal open={isFacultyModalOpen} onClose={() => { setIsFacultyModalOpen(false); setIsCustomFacultyDiv(false); setIsCustomFacultySchool(false); setIsCustomFacultyDept(false); }} title="Add Faculty Member" hideHeader={true}>
        <form onSubmit={handleAddFaculty} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Custom Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(37, 99, 235, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                flexShrink: 0
              }}>
                <UserPlus size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Add Faculty Member</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>Fill in the details to add a new faculty member.</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => { setIsFacultyModalOpen(false); setIsCustomFacultyDiv(false); setIsCustomFacultySchool(false); setIsCustomFacultyDept(false); }} 
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <FormLabel label="Full Name" required />
            <div className="modal-input-wrapper">
              <User size={18} />
              <input required placeholder="Dr. Jane Smith" value={facultyForm.name} onChange={e => setFacultyForm(f => ({ ...f, name: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <FormLabel label="Email" required />
            <div className="modal-input-wrapper">
              <Mail size={18} />
              <input required type="email" placeholder="jane@university.edu" value={facultyForm.email} onChange={e => setFacultyForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <FormLabel label="Division" />
              {isCustomFacultyDiv ? (
                <div className="modal-input-wrapper">
                  <Landmark size={18} />
                  <input required placeholder="Enter division" value={facultyForm.division} onChange={e => setFacultyForm(f => ({ ...f, division: e.target.value }))} />
                  <button type="button" onClick={() => { setIsCustomFacultyDiv(false); setFacultyForm(f => ({ ...f, division: '' })); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: '0 4px' }}>Cancel</button>
                </div>
              ) : (
                <div className="modal-input-wrapper">
                  <Landmark size={18} />
                  <select value={facultyForm.division} onChange={e => {
                    if (e.target.value === 'custom') {
                      setIsCustomFacultyDiv(true);
                      setFacultyForm(f => ({ ...f, division: '' }));
                    } else {
                      setFacultyForm(f => ({ ...f, division: e.target.value }));
                    }
                  }}>
                    <option value="">Select Division</option>
                    {availableDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                    <option value="custom">+ Add Custom Division</option>
                  </select>
                  <ChevronDown size={16} style={{ color: '#64748b', pointerEvents: 'none' }} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <FormLabel label="School" />
              {isCustomFacultySchool ? (
                <div className="modal-input-wrapper">
                  <GraduationCap size={18} />
                  <input required placeholder="Enter school" value={facultyForm.school} onChange={e => setFacultyForm(f => ({ ...f, school: e.target.value }))} />
                  <button type="button" onClick={() => { setIsCustomFacultySchool(false); setFacultyForm(f => ({ ...f, school: '' })); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: '0 4px' }}>Cancel</button>
                </div>
              ) : (
                <div className="modal-input-wrapper">
                  <GraduationCap size={18} />
                  <select value={facultyForm.school} onChange={e => {
                    if (e.target.value === 'custom') {
                      setIsCustomFacultySchool(true);
                      setFacultyForm(f => ({ ...f, school: '' }));
                    } else {
                      setFacultyForm(f => ({ ...f, school: e.target.value }));
                    }
                  }}>
                    <option value="">Select School</option>
                    {availableSchools.map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="custom">+ Add Custom School</option>
                  </select>
                  <ChevronDown size={16} style={{ color: '#64748b', pointerEvents: 'none' }} />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <FormLabel label="Department" />
            {isCustomFacultyDept ? (
              <div className="modal-input-wrapper">
                <Network size={18} />
                <input required placeholder="Enter department" value={facultyForm.department} onChange={e => setFacultyForm(f => ({ ...f, department: e.target.value }))} />
                <button type="button" onClick={() => { setIsCustomFacultyDept(false); setFacultyForm(f => ({ ...f, department: '' })); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: '0 4px' }}>Cancel</button>
              </div>
            ) : (
              <div className="modal-input-wrapper">
                <Network size={18} />
                <select value={facultyForm.department} onChange={e => {
                  if (e.target.value === 'custom') {
                    setIsCustomFacultyDept(true);
                    setFacultyForm(f => ({ ...f, department: '' }));
                  } else {
                    setFacultyForm(f => ({ ...f, department: e.target.value }));
                  }
                }}>
                  <option value="">Select Department</option>
                  {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                  <option value="custom">+ Add Custom Dept</option>
                </select>
                <ChevronDown size={16} style={{ color: '#64748b', pointerEvents: 'none' }} />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <FormLabel label="Panel" />
              <div className="modal-input-wrapper">
                <UserCheck size={18} />
                <select value={facultyForm.panel} onChange={e => setFacultyForm(f => ({ ...f, panel: e.target.value }))}>
                  <option value="">None</option>
                  {['PA','PB','PC','PD','ALL'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown size={16} style={{ color: '#64748b', pointerEvents: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <FormLabel label="Gender" />
              <div className="modal-input-wrapper">
                <User size={18} />
                <select value={facultyForm.gender} onChange={e => setFacultyForm(f => ({ ...f, gender: e.target.value }))}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <ChevronDown size={16} style={{ color: '#64748b', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '4px' }}>
            <input 
              type="checkbox" 
              id="is_primary"
              checked={facultyForm.is_primary} 
              onChange={e => setFacultyForm(f => ({ ...f, is_primary: e.target.checked }))} 
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '4px',
                border: '1.5px solid #d1d5db',
                accentColor: '#2563eb',
                cursor: 'pointer',
                marginTop: '3px'
              }} 
            />
            <label htmlFor="is_primary" style={{ cursor: 'pointer', selectText: 'none' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Primary Faculty</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Mark this member as primary faculty</div>
            </label>
          </div>

          <div className="modal-footer" style={{ 
            paddingLeft: 0, 
            paddingRight: 0, 
            paddingBottom: 0, 
            marginTop: '20px', 
            borderTop: '1px solid #f1f5f9', 
            paddingTop: '16px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={() => { setIsFacultyModalOpen(false); setIsCustomFacultyDiv(false); setIsCustomFacultySchool(false); setIsCustomFacultyDept(false); }}
              style={{
                borderRadius: '8px',
                padding: '10px 20px',
                fontWeight: '600',
                borderColor: '#e2e8f0',
                color: '#0f172a',
                background: '#ffffff'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn"
              style={{
                borderRadius: '8px',
                padding: '10px 20px',
                fontWeight: '600',
                background: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} /> Add Faculty
            </button>
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

      {/* Bulk Upload Progress Modal */}
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
                  refreshAllData()
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

      {/* Duplicate Conflict Resolution Modal */}
      <Modal open={showDuplicateModal} onClose={() => { setShowDuplicateModal(false); setDuplicateRecords([]); setPendingBulkUsers([]); }} title="Duplicate Conflict Detection" size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: 16, borderRadius: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <AlertCircle size={20} style={{ color: '#d97706', marginTop: 2, flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#b45309' }}>Duplicate Records Found</h4>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#b45309', lineHeight: 1.5 }}>
                We detected <strong>{duplicateRecords.length}</strong> record(s) in your file whose email, student PRN, or faculty ID already exist in the database. Please select how you want to handle these conflicts:
              </p>
            </div>
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
            <table className="data-table data-table-compact" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Conflict Details</th>
                  <th>Existing Database User</th>
                </tr>
              </thead>
              <tbody>
                {duplicateRecords.map((dup, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 12.5 }}>{dup.uploadRecord.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
                        {dup.uploadRecord.email && <span>{dup.uploadRecord.email}</span>}
                        {dup.uploadRecord.prn && <span> · PRN: {dup.uploadRecord.prn}</span>}
                        {dup.uploadRecord.faculty_id && <span> · ID: {dup.uploadRecord.faculty_id}</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text-2)' }}>{dup.existingRecord.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
                        {dup.existingRecord.email && <span>{dup.existingRecord.email}</span>}
                        {dup.existingRecord.prn && <span> · PRN: {dup.existingRecord.prn}</span>}
                        {dup.existingRecord.faculty_id && <span> · ID: {dup.existingRecord.faculty_id}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0, marginTop: 12, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              onClick={() => {
                setShowDuplicateModal(false)
                setDuplicateRecords([])
                setPendingBulkUsers([])
              }}
            >
              Cancel Upload
            </button>
            <button
              className="btn btn-outline"
              style={{ color: '#2563eb', borderColor: '#2563eb' }}
              onClick={() => {
                setShowDuplicateModal(false)
                executeIngestion(pendingBulkUsers, 'skip')
              }}
            >
              Skip Duplicates
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowDuplicateModal(false)
                executeIngestion(pendingBulkUsers, 'replace')
              }}
            >
              Replace & Overwrite
            </button>
          </div>
        </div>
      </Modal>

      <div id="qr-reader-file-dummy" style={{ display: 'none' }} />
      <ToastContainer toasts={toasts} />
    </>
  )
}
