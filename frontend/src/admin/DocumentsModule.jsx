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

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, margin: '4px 0 0 0' }}>Uploaded Documents ({documents.length})</h3>
          
          {documents.length === 0 ? (
            <div className="glass-card">
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <FileText size={36} />
                <p>No documents uploaded yet.</p>
              </div>
            </div>
          ) : (
            <div className="documents-grid">
              {documents.map(d => (
                <div key={d.id} className="doc-card">
                  <div className="doc-card-header">
                    <div className="doc-icon-wrapper">
                      <FileText size={20} />
                    </div>
                    <div className="doc-card-title-block">
                      <h4 className="doc-card-title" title={d.name}>{d.name}</h4>
                      <div className="doc-card-target">
                        <span className={`badge ${
                          d.target_role === 'all' ? 'badge-blue' :
                          d.target_role === 'student' ? 'badge-green' :
                          d.target_role === 'faculty' ? 'badge-primary' : 'badge-orange'
                        }`}>
                          {d.target_role === 'all' ? 'Visible to All' :
                           d.target_role === 'student' ? 'Students Only' :
                           d.target_role === 'faculty' ? 'Faculty Only' : 'LTC Members'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="doc-card-footer">
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-outline"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Open Link ↗
                    </a>
                    
                    <button
                      className="btn-action-icon btn-del-icon"
                      onClick={() => handleDeleteDocument(d.id)}
                      title="Delete Document"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
