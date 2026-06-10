import React from 'react'
import { Plus, Search, Trash2, RefreshCw, BookOpen } from 'lucide-react'

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
  PaginationBar
}) {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Master Faculty Database</h2>
          <p className="page-subtitle">{faculties.length} faculty members · Master Directory</p>
        </div>
        <div className="page-header-right">
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
              {facultyPg.paginated.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                      <BookOpen size={36} />
                      <p>No faculty found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                facultyPg.paginated.map(u => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
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
