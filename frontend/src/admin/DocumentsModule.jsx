import React from 'react'
import { Plus, Trash2, FileText } from 'lucide-react'

export default function DocumentsModule({
  documents,
  docForm,
  setDocForm,
  handleUploadDocument,
  handleDeleteDocument,
  Label
}) {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Documents & SOPs</h2>
          <p className="page-subtitle">Upload reference documents and guidelines for students, faculty, or LTC members</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <div className="glass-card">
          <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}>Add Document / Link</h3>
          <form onSubmit={handleUploadDocument} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <Label>Document Name</Label>
              <input
                className="input-field input-field-rect"
                placeholder="e.g. LTC Guidelines 2025"
                required
                value={docForm.name}
                onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
            </div>
            <div>
              <Label>URL / Google Drive Link</Label>
              <input
                type="url"
                className="input-field input-field-rect"
                placeholder="https://…"
                required
                value={docForm.url}
                onChange={e => setDocForm(f => ({ ...f, url: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
            </div>
            <div>
              <Label>Visible To</Label>
              <select
                className="input-field"
                value={docForm.target_role}
                onChange={e => setDocForm(f => ({ ...f, target_role: e.target.value }))}
                style={{ marginBottom: 0, borderRadius: 12 }}
              >
                <option value="all">All</option>
                <option value="student">Students Only</option>
                <option value="faculty">Faculty Only</option>
                <option value="ltc_member">LTC Members Only</option>
              </select>
            </div>
            <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>
              <Plus size={14} /> Add Document
            </button>
          </form>
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>Uploaded Documents ({documents.length})</h3>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Target</th>
                  <th>Link</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state" style={{ padding: '32px 0' }}>
                        <FileText size={36} />
                        <p>No documents uploaded.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  documents.map(d => (
                    <tr key={d.id}>
                      <td><div style={{ fontWeight: 700 }}>{d.name}</div></td>
                      <td><span className="badge badge-blue">{d.target_role}</span></td>
                      <td>
                        <a href={d.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 13 }}>
                          View ↗
                        </a>
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                          onClick={() => handleDeleteDocument(d.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
