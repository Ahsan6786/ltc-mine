import React, { useState, useEffect } from 'react'
import { BarChart2, Shield, ClipboardList, CheckCircle, RefreshCw, Search, Award } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001'

export default function ReportsModule({ token, toast }) {
  const [subTab, setSubTab] = useState('audit')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)

  const formatAction = (act) => {
    if (!act) return ''
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
    if (mapping[act]) return mapping[act]
    return act.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }

  const formatDetails = (details) => {
    if (!details) return '—'
    let obj = details
    if (typeof details === 'string') {
      try {
        obj = JSON.parse(details)
      } catch {
        return details
      }
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.entries(obj).map(([key, val]) => {
        const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
        const cleanKey = readableKey.charAt(0).toUpperCase() + readableKey.slice(1).toLowerCase()
        const readableVal = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)
        return `${cleanKey}: ${readableVal}`
      }).join(', ')
    }
    return String(details)
  }

  const fetchLogs = async (pg = 1) => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API}/api/admin/audit-logs?page=${pg}&limit=20&action=${actionFilter}&search=${encodeURIComponent(search)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      const data = await res.json()
      if (res.ok) {
        setLogs(data.logs || [])
        setTotalLogs(data.pagination?.total || 0)
        setTotalPages(data.pagination?.pages || 1)
        setPage(data.pagination?.page || 1)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (subTab === 'audit') {
      fetchLogs(1)
    }
  }, [subTab, actionFilter])

  // Debounced search trigger
  useEffect(() => {
    if (subTab === 'audit') {
      const t = setTimeout(() => fetchLogs(1), 350)
      return () => clearTimeout(t)
    }
  }, [search])

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Activity Logs & Reports</h2>
          <p className="page-subtitle">Track system activity, view student attendance, and manage course completion certificates</p>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button
          className={`tab-btn ${subTab === 'audit' ? 'active' : ''}`}
          onClick={() => setSubTab('audit')}
        >
          <Shield size={14} /> Activity Log
        </button>
        <button
          className={`tab-btn ${subTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setSubTab('attendance')}
        >
          <ClipboardList size={14} /> Attendance Summary
        </button>
        <button
          className={`tab-btn ${subTab === 'certificates' ? 'active' : ''}`}
          onClick={() => setSubTab('certificates')}
        >
          <Award size={14} /> Certificates
        </button>
      </div>

      {subTab === 'audit' && (
        <div className="glass-card animate-fade-in" style={{ padding: 24 }}>


          <div className="students-filters-row">
            <div className="search-wrapper">
              <Search className="search-icon" size={16} />
              <input
                className="input-field"
                placeholder="Search history by user, details, or items..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ marginBottom: 0 }}
              />
            </div>
            <select
              className="input-field filter-select"
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              style={{ minWidth: 180 }}
            >
              <option value="">All Actions</option>
              <option value="BATCH_CREATED">Batch Creation</option>
              <option value="BATCH_UPDATED">Batch Update</option>
              <option value="BATCH_ARCHIVED">Batch Archive</option>
              <option value="BATCH_RESTORED">Batch Restore</option>
              <option value="STUDENT_AUTO_CREATED">Student Registered</option>
              <option value="SQUAD_LEADER_UPDATED">Squad Leader Update</option>
              <option value="BULK_UPLOAD_COMPLETED">Bulk Ingestion Completed</option>
            </select>
            <button className="btn btn-outline" style={{ height: 42, padding: '0 14px', borderRadius: 50 }} onClick={() => fetchLogs(page)} title="Refresh Logs">
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Action Taken</th>
                  <th>Done By</th>
                  <th>Item Affected</th>
                  <th>Changes Made</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="loading-center" style={{ padding: '30px 0' }}>
                        <div className="spinner spinner-sm" />
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state" style={{ padding: '30px 0' }}>
                        <Shield size={36} />
                        <p>No activity logs match your filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            log.action.includes('CREATED')
                              ? 'badge-green'
                              : log.action.includes('DELETED') || log.action.includes('ARCHIVED')
                              ? 'badge-red'
                              : 'badge-blue'
                          }`}
                          style={{ fontSize: 11, fontWeight: 700 }}
                        >
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.user_name || 'System'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
                        {log.entity_type ? (
                          <span style={{ textTransform: 'capitalize' }}>
                            {log.entity_type.replace(/_/g, ' ')} (ID: {log.entity_id})
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                        {formatDetails(log.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: 16 }}>
              <button
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => fetchLogs(page - 1)}
              >
                Prev
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages} (Total: {totalLogs})
              </span>
              <button
                className="pagination-btn"
                disabled={page >= totalPages}
                onClick={() => fetchLogs(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {subTab === 'attendance' && (
        <div className="glass-card animate-fade-in" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Institutional Attendance Performance</h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
            Generate analytical logs representing overall attendance compliance. This framework is fully integrated with batch students context.
          </p>
          <div className="empty-state" style={{ padding: '60px 0' }}>
            <BarChart2 size={40} />
            <h4 style={{ margin: '12px 0 6px 0', fontSize: 15, fontWeight: 700 }}>Ready Architecture</h4>
            <p style={{ maxWidth: 360, margin: '0 auto', fontSize: 13, color: 'var(--text-4)' }}>
              Analytics summary is initialized. Attendance reports will auto-populate as sessions and records are created by primary faculty members.
            </p>
          </div>
        </div>
      )}

      {subTab === 'certificates' && (
        <div className="glass-card animate-fade-in" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Automated Certificate Issuance</h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
            Generate and verify completion certificates for students who satisfy all LTC program constraints.
          </p>
          <div
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 16,
              padding: 40,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'var(--bg)'
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(37, 99, 235, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                marginBottom: 16
              }}
            >
              <Award size={32} />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Certificate Issuance Suite</h4>
            <p style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 400, lineHeight: 1.6, marginBottom: 20 }}>
              The institutional certificate database has been created. When active batches are completed, certificates will be auto-generated for eligible students.
            </p>
            <button className="btn btn-outline" disabled>
              Launch Certificate Designer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
