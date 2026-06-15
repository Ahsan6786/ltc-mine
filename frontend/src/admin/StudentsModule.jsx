import React, { useState, useMemo } from 'react'
import { Plus, Search, Trash2, RefreshCw, GraduationCap, Bell } from 'lucide-react'

export default function StudentsModule({
  users,
  students,
  studentPg,
  studentSearch,
  setStudentSearch,
  selectedSchool,
  setSelectedSchool,
  selectedDepartment,
  setSelectedDepartment,
  selectedDivision,
  setSelectedDivision,
  selectedPanel,
  setSelectedPanel,
  availableSchools,
  availableDepartments,
  availableDivisions,
  availablePanels,
  setIsStudentModalOpen,
  handleUpdatePanel,
  handleUpdateInsurance,
  handleToggleStudentBatch,
  handleViewFeedback,
  handleDeleteUser,
  fetchUsers,
  PaginationBar,
  hideTitle = false
}) {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        {!hideTitle && (
          <div className="page-header-left">
            <h2 className="page-title">Student Database</h2>
            <p className="page-subtitle">{students.length} students found · Directory</p>
          </div>
        )}
        <div className="page-header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" style={{ padding: '8px', position: 'relative' }} title="Notifications">
            <Bell size={14} />
            <span style={{ position: 'absolute', top: '2px', right: '2px', width: '5px', height: '5px', background: '#ef4444', borderRadius: '50%' }} />
          </button>
          <button className="btn btn-outline btn-sm" onClick={fetchUsers}>
            <RefreshCw size={14} />
          </button>
          <button className="btn" onClick={() => setIsStudentModalOpen(true)}>
            <Plus size={16} /> Add Student
          </button>
        </div>
      </div>

      <div className="glass-card">
        <div className="students-filters-row">
          <div className="search-wrapper">
            <Search className="search-icon" size={16} />
            <input
              className="input-field"
              placeholder="Search name, email, PRN…"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
          <select
            className="input-field filter-select"
            value={selectedSchool}
            onChange={e => {
              setSelectedSchool(e.target.value)
              setSelectedDepartment('')
              setSelectedDivision('')
            }}
          >
            <option value="">All Schools</option>
            {availableSchools.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className="input-field filter-select"
            value={selectedDepartment}
            onChange={e => {
              setSelectedDepartment(e.target.value)
              setSelectedDivision('')
            }}
          >
            <option value="">All Depts</option>
            {availableDepartments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            className="input-field filter-select panel-select"
            value={selectedPanel}
            onChange={e => setSelectedPanel(e.target.value)}
          >
            <option value="">All Panels</option>
            {availablePanels.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {studentPg.paginated.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={36} style={{ color: 'var(--text-4)', marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-3)', fontSize: '14.5px', fontWeight: '600', margin: 0 }}>No students found.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>PRN / LTC ID</th>
                  <th>Email</th>
                  <th>School / Dept</th>
                  <th>Panel</th>
                  <th>NRI</th>
                  <th>Insured</th>
                  <th>Legacy Batch</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentPg.paginated.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{u.name}</div>
                      {u.red_flag && (
                        <span className="badge badge-red" style={{ marginTop: 3 }}>🚩 Flagged</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <code style={{ fontSize: 12 }}>{u.prn || '—'}</code>
                        {u.ltc_id && (
                          <span
                            className="badge badge-blue"
                            style={{
                              fontSize: 10,
                              alignSelf: 'flex-start',
                              background: 'var(--primary-bg)',
                              color: 'var(--primary)',
                              border: '1px solid rgba(37, 99, 235, 0.2)'
                            }}
                          >
                            LTC ID: {u.ltc_id}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{u.email}</td>
                    <td style={{ fontSize: 12.5 }}>
                      <div style={{ fontWeight: 600 }}>{u.school || '—'}</div>
                      <div style={{ color: 'var(--text-4)', fontSize: 11.5 }}>{u.department}</div>
                    </td>
                    <td>
                      <select
                        value={u.panel || ''}
                        onChange={e => handleUpdatePanel(u.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1.5px solid var(--border)',
                          fontSize: 12,
                          background: 'white'
                        }}
                      >
                        <option value="">None</option>
                        {['PA', 'PB', 'PC', 'PD', 'ALL'].map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {u.nri ? (
                        <span className="badge badge-nri">NRI</span>
                      ) : (
                        <span style={{ color: 'var(--text-4)', fontSize: 12 }}>Regular</span>
                      )}
                    </td>
                    <td>
                      <select
                        value={u.insured ? 'true' : 'false'}
                        onChange={e => handleUpdateInsurance(u.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1.5px solid var(--border)',
                          fontSize: 12,
                          background: 'white'
                        }}
                      >
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </td>
                    <td>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={!!u.in_current_batch}
                          onChange={e => handleToggleStudentBatch(u.id, e.target.checked)}
                        />
                        <span style={{ color: u.in_current_batch ? 'var(--primary)' : 'var(--text-4)' }}>
                          {u.in_current_batch ? 'In Batch' : 'No'}
                        </span>
                      </label>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => handleViewFeedback(u.id, u.name)}>
                          Feedback
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                          onClick={() => handleDeleteUser(u.id, 'student')}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PaginationBar
          page={studentPg.page}
          totalPages={studentPg.totalPages}
          total={studentPg.total}
          setPage={p => studentPg.setPage(p)}
        />
      </div>
    </div>
  )
}
