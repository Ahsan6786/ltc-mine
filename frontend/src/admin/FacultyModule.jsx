import React, { useState, useEffect } from 'react'
import { Plus, Search, Trash2, RefreshCw, BookOpen, MoreVertical, Eye, Edit2, X, Bell } from 'lucide-react'

// Local Modal helper
function Modal({ open, onClose, title, children, size = '' }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size ? 'modal-' + size : ''}`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn-icon" onClick={onClose} style={{ border: 'none', padding: 4, background: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export default function FacultyModule({
  faculties,
  facultyPg,
  facultySearch,
  setFacultySearch,
  setIsFacultyModalOpen,
  handleUpdatePanel,
  handleViewFeedback,
  handleDeleteUser,
  fetchUsers,
  PaginationBar,
  isDesktop = false,
  facultyDivFilter = '',
  setFacultyDivFilter,
  facultyDeptFilter = '',
  setFacultyDeptFilter,
  facultyTypeFilter = '',
  setFacultyTypeFilter,
  availableFacultyDivisions = [],
  availableFacultyDepartments = [],
  apiFetch,
  toast,
  hideTitle = false
}) {
  const [activeDropdownId, setActiveDropdownId] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedFacultyForView, setSelectedFacultyForView] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedFacultyForEdit, setSelectedFacultyForEdit] = useState(null)
  const [editForm, setEditForm] = useState({ division: '', panel: '' })

  useEffect(() => {
    const closeAll = () => setActiveDropdownId(null)
    document.addEventListener('click', closeAll)
    return () => document.removeEventListener('click', closeAll)
  }, [])

  const handleEditClick = (u) => {
    setSelectedFacultyForEdit(u)
    setEditForm({ division: u.division || '', panel: u.panel || '' })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!selectedFacultyForEdit) return
    
    try {
      // 1. Update panel
      const resPanel = await apiFetch('/api/admin/update-panel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedFacultyForEdit.id, panel: editForm.panel })
      })

      // 2. Update division
      const resDiv = await apiFetch('/api/admin/update-division', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedFacultyForEdit.id, division: editForm.division })
      })

      if (resPanel?.ok && resDiv?.ok) {
        toast('Faculty details updated successfully.', 'success')
        setIsEditModalOpen(false)
        fetchUsers()
      } else {
        toast('Failed to update some faculty details.', 'error')
      }
    } catch (err) {
      toast('Error updating faculty: ' + err.message, 'error')
    }
  }

  const handleViewClick = (u) => {
    setSelectedFacultyForView(u)
    setIsViewModalOpen(true)
  }

  const getInitials = (name) => {
    if (!name) return 'F'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
    }
    return name.charAt(0).toUpperCase()
  }

  const renderOriginalView = () => {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          {!hideTitle && (
            <div className="page-header-left">
              <h2 className="page-title">Faculty Database</h2>
              <p className="page-subtitle">{faculties.length} faculty members · Directory</p>
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
            <button className="btn" onClick={() => setIsFacultyModalOpen(true)}>
              <Plus size={16} /> Add Faculty
            </button>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div className="search-wrapper" style={{ margin: 0, flex: 1, minWidth: 200 }}>
              <Search className="search-icon" size={16} />
              <input
                className="input-field"
                placeholder="Search by name, email, department…"
                value={facultySearch}
                onChange={e => setFacultySearch(e.target.value)}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          {facultyPg.paginated.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={36} style={{ color: 'var(--text-4)', marginBottom: '12px' }} />
              <p style={{ color: 'var(--text-3)', fontSize: '14.5px', fontWeight: '600', margin: 0 }}>No faculty found.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Division / School</th>
                    <th>Department</th>
                    <th>Panel</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyPg.paginated.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{u.name}</div>
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{u.email}</td>
                      <td style={{ fontSize: 12.5 }}>
                        <div style={{ fontWeight: 600 }}>{u.division || '—'}</div>
                        <div style={{ color: 'var(--text-4)', fontSize: 11.5 }}>{u.school || ''}</div>
                      </td>
                      <td style={{ fontSize: 12.5 }}>{u.department || '—'}</td>
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
                        {u.is_primary ? (
                          <span className="badge badge-blue">Primary</span>
                        ) : (
                          <span className="badge badge-gray">Secondary</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleViewFeedback(u.id, u.name)}>
                            Feedback
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                            onClick={() => handleDeleteUser(u.id, 'faculty')}
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
            page={facultyPg.page}
            totalPages={facultyPg.totalPages}
            total={facultyPg.total}
            setPage={p => facultyPg.setPage(p)}
          />
        </div>
      </div>
    )
  }

  const renderDesktopView = () => {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Faculty</h2>
            <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', marginTop: '4px' }}>
              Faculty management and directory
            </p>
          </div>
          <button className="btn" onClick={() => setIsFacultyModalOpen(true)} style={{ borderRadius: '12px' }}>
            <Plus size={16} /> Add Faculty
          </button>
        </div>

        {/* Filter bar */}
        <div className="desktop-card" style={{ padding: '20px 24px' }}>
          <div className="desktop-faculty-filters">
            <div className="desktop-topbar-search" style={{ width: '300px' }}>
              <Search className="desktop-topbar-search-icon" size={16} />
              <input
                className="input-field"
                placeholder="Search faculty name or email..."
                value={facultySearch}
                onChange={e => setFacultySearch(e.target.value)}
                style={{ marginBottom: 0, paddingLeft: '40px' }}
              />
            </div>
            
            <select
              value={facultyDivFilter}
              onChange={e => setFacultyDivFilter(e.target.value)}
            >
              <option value="">All Divisions</option>
              {availableFacultyDivisions.map(div => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>

            <select
              value={facultyDeptFilter}
              onChange={e => setFacultyDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {availableFacultyDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              value={facultyTypeFilter}
              onChange={e => setFacultyTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
            </select>

            <button 
              className="desktop-topbar-btn" 
              onClick={() => {
                setFacultyDivFilter('')
                setFacultyDeptFilter('')
                setFacultyTypeFilter('')
                setFacultySearch('')
              }}
              title="Reset Filters"
              style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Table list directory */}
          {facultyPg.paginated.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '16px' }}>
              <BookOpen size={36} style={{ color: 'var(--text-4)', marginBottom: '12px' }} />
              <p style={{ color: 'var(--text-3)', fontSize: '14.5px', fontWeight: '600', margin: 0 }}>No faculty found.</p>
            </div>
          ) : (
            <div className="table-wrapper" style={{ marginTop: '16px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Division / School</th>
                    <th>Department</th>
                    <th>Panel</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyPg.paginated.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{u.name}</div>
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{u.email}</td>
                      <td style={{ fontSize: 12.5 }}>
                        <div style={{ fontWeight: 600 }}>{u.division || '—'}</div>
                        <div style={{ color: 'var(--text-4)', fontSize: 11.5 }}>{u.school || ''}</div>
                      </td>
                      <td style={{ fontSize: 12.5 }}>{u.department || '—'}</td>
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
                        {u.is_primary ? (
                          <span className="badge badge-blue">Primary</span>
                        ) : (
                          <span className="badge badge-gray">Secondary</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleViewClick(u)} style={{ borderRadius: '8px' }}>
                            <Eye size={13} /> View
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={() => handleEditClick(u)} style={{ borderRadius: '8px' }}>
                            <Edit2 size={13} /> Edit
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={() => handleViewFeedback(u.id, u.name)} style={{ borderRadius: '8px' }}>
                            Feedback
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: 'var(--danger)', color: 'var(--danger)', borderRadius: '8px' }}
                            onClick={() => handleDeleteUser(u.id, 'faculty')}
                          >
                            <Trash2 size={12} /> Delete
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
            page={facultyPg.page}
            totalPages={facultyPg.totalPages}
            total={facultyPg.total}
            setPage={p => facultyPg.setPage(p)}
          />
        </div>

        {/* View Modal */}
        <Modal open={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Faculty Profile Details">
          {selectedFacultyForView && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div className="desktop-faculty-avatar" style={{ width: '56px', height: '56px', borderRadius: '16px', fontSize: '20px' }}>
                  {getInitials(selectedFacultyForView.name)}
                </div>
                <div>
                  <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>{selectedFacultyForView.name}</h4>
                  <span style={{ fontSize: '13.5px', color: '#64748b', fontWeight: '500' }}>{selectedFacultyForView.email}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Division</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginTop: '4px' }}>{selectedFacultyForView.division || '—'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>School</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginTop: '4px' }}>{selectedFacultyForView.school || '—'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Department</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginTop: '4px' }}>{selectedFacultyForView.department || '—'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Assigned Panel</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginTop: '4px' }}>{selectedFacultyForView.panel || 'None'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Faculty Role Type</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginTop: '4px' }}>{selectedFacultyForView.is_primary ? 'Primary Faculty' : 'Secondary Faculty'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Gender</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginTop: '4px' }}>{selectedFacultyForView.gender || '—'}</div>
                </div>
              </div>

              <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0, marginTop: '8px' }}>
                <button className="btn btn-primary" onClick={() => setIsViewModalOpen(false)}>Close details</button>
              </div>
            </div>
          )}
        </Modal>

        {/* Edit Modal */}
        <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Faculty Profile">
          {selectedFacultyForEdit && (
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div className="desktop-faculty-avatar" style={{ width: '48px', height: '48px', borderRadius: '12px', fontSize: '16px' }}>
                  {getInitials(selectedFacultyForEdit.name)}
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>{selectedFacultyForEdit.name}</h4>
                  <span style={{ fontSize: '12.5px', color: '#64748b' }}>{selectedFacultyForEdit.email}</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Division
                </label>
                <input
                  type="text"
                  className="input-field input-field-rect"
                  placeholder="e.g. Division A"
                  value={editForm.division}
                  onChange={e => setEditForm(f => ({ ...f, division: e.target.value }))}
                  style={{ marginBottom: 0 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Assigned Panel
                </label>
                <select
                  className="input-field"
                  value={editForm.panel}
                  onChange={e => setEditForm(f => ({ ...f, panel: e.target.value }))}
                  style={{ marginBottom: 0, borderRadius: '12px' }}
                >
                  <option value="">None</option>
                  {['PA', 'PB', 'PC', 'PD', 'ALL'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: '10px', fontSize: '12px', color: '#b45309', lineHeight: '1.5' }}>
                <strong>Note:</strong> Optimized mobile responsiveness: stacked panels vertically (branding first, forms second) with a softer `32px` mobile card border radius, aligned logo card and branding titles to the center (`align-items: center`, `text-align: center`) on mobile viewports for clean visual symmetry, set mobile branding panel height to `220px`, scaled logo size to `38px` on screens below 768px, stacked form buttons vertically on viewports below 480px, and eliminated all horizontal scrolling.
              </div>

              <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0, marginTop: '8px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn">Save Changes</button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    )
  }

  return isDesktop ? renderDesktopView() : renderOriginalView()
}
