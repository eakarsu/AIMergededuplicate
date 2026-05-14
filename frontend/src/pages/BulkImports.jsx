import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { Upload, Plus, X, Trash2 } from 'lucide-react';
import Toast from '../components/Toast';

export default function BulkImports() {
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ filename: '', vendor_id: '', total_rows: '' });
  const pollRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [data, vends] = await Promise.all([api.getImports(), api.getVendors()]);
      const importList = data.data || data;
      setImports(importList);
      setVendors(vends.data || vends);

      // If any are processing or queued, start polling
      const hasActive = importList.some(i => ['processing', 'queued'].includes(i.status));
      if (hasActive && !pollRef.current) {
        pollRef.current = setInterval(async () => {
          try {
            const refreshed = await api.getImports();
            const refreshedList = refreshed.data || refreshed;
            setImports(refreshedList);
            const stillActive = refreshedList.some(i => ['processing', 'queued'].includes(i.status));
            if (!stillActive) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          } catch {}
        }, 5000);
      } else if (!hasActive && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setLoading(false);
  };

  useEffect(() => {
    load();
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const result = await api.createImport(form);
      setToast({ message: `Import queued: ${result.filename}`, type: 'success' });
      setShowForm(false);
      load();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this import record?')) return;
    try { await api.deleteImport(id); setToast({ message: 'Import deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const getStatusColor = (s) => s === 'completed' ? 'success' : s === 'processing' ? 'info' : s === 'queued' ? 'info' : s === 'failed' ? 'danger' : 'warning';

  const hasActive = imports.some(i => ['processing', 'queued'].includes(i.status));

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Bulk Imports</h2>
          <p>{imports.length} import records {hasActive && <span style={{ color: '#3b82f6', fontSize: 12, fontWeight: 600 }}> — auto-refreshing every 5s</span>}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ filename: '', vendor_id: '', total_rows: '' }); setShowForm(true); }}>
          <Plus size={16} /> New Import
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-icon green"><Upload size={22} /></div>
          <h4>Completed</h4>
          <div className="stat-value">{imports.filter(i => i.status === 'completed').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue"><Upload size={22} /></div>
          <h4>Processing / Queued</h4>
          <div className="stat-value">{imports.filter(i => ['processing','queued'].includes(i.status)).length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange"><Upload size={22} /></div>
          <h4>Pending</h4>
          <div className="stat-value">{imports.filter(i => i.status === 'pending').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon red"><Upload size={22} /></div>
          <h4>Total Duplicates Found</h4>
          <div className="stat-value">{imports.reduce((acc, i) => acc + (i.duplicates_found || 0), 0)}</div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Filename</th><th>Vendor</th><th>Total Rows</th><th>Processed</th><th>Duplicates</th><th>Errors</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8}><div className="loading"><div className="spinner" />Loading...</div></td></tr> :
              imports.map(i => (
                <tr key={i.id} onClick={() => setSelected(i)} style={['processing','queued'].includes(i.status) ? { background: '#eff6ff' } : {}}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{i.filename}</td>
                  <td>{i.vendor_name || '-'}</td>
                  <td>{i.total_rows}</td>
                  <td>{i.processed_rows || 0}</td>
                  <td><span className={i.duplicates_found > 0 ? 'badge badge-warning' : ''}>{i.duplicates_found || 0}</span></td>
                  <td><span className={i.errors > 0 ? 'badge badge-danger' : ''}>{i.errors || 0}</span></td>
                  <td>
                    <span className={`badge badge-${getStatusColor(i.status)}`}>{i.status}</span>
                    {['processing','queued'].includes(i.status) && <span style={{ marginLeft: 4, fontSize: 10, color: '#3b82f6' }}>● live</span>}
                  </td>
                  <td>{new Date(i.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="detail-panel">
          <div className="detail-header">
            <div><h3>{selected.filename}</h3></div>
            <button className="btn btn-icon btn-secondary" onClick={() => setSelected(null)}><X size={18} /></button>
          </div>
          <div className="detail-body">
            <div className="detail-field"><label>Vendor</label><span>{selected.vendor_name || '-'}</span></div>
            <div className="detail-field"><label>Status</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`badge badge-${getStatusColor(selected.status)}`}>{selected.status}</span>
                {['processing','queued'].includes(selected.status) && <span style={{ fontSize: 12, color: '#3b82f6', animation: 'pulse 1.5s infinite' }}>Refreshing automatically...</span>}
              </div>
            </div>
            <div className="detail-field"><label>Total Rows</label><span>{selected.total_rows}</span></div>
            <div className="detail-field"><label>Processed</label><span>{selected.processed_rows || 0}</span></div>
            <div className="detail-field">
              <label>Progress</label>
              <div className="ai-score-bar">
                <div className="ai-score-fill" style={{ width: `${selected.total_rows > 0 ? ((selected.processed_rows || 0) / selected.total_rows * 100) : 0}%`, background: '#10b981' }} />
              </div>
              <span style={{ fontSize: 12, color: '#64748b' }}>{selected.total_rows > 0 ? ((selected.processed_rows || 0) / selected.total_rows * 100).toFixed(0) : 0}%</span>
            </div>
            <div className="detail-field"><label>Duplicates Found</label><span style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{selected.duplicates_found || 0}</span></div>
            <div className="detail-field"><label>Errors</label><span style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{selected.errors || 0}</span></div>
            <div className="detail-field"><label>Created</label><span>{new Date(selected.created_at).toLocaleString()}</span></div>
            {selected.completed_at && <div className="detail-field"><label>Completed</label><span>{new Date(selected.completed_at).toLocaleString()}</span></div>}
          </div>
          <div className="detail-actions">
            <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}><Trash2 size={14} /> Delete</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>New Import</h3><button className="btn btn-icon btn-secondary" onClick={() => setShowForm(false)}><X size={18} /></button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group"><label>Filename *</label><input className="form-control" value={form.filename} onChange={e => setForm({...form, filename: e.target.value})} placeholder="vendor_catalog.csv" required /></div>
                <div className="form-row">
                  <div className="form-group"><label>Vendor</label>
                    <select className="form-control" value={form.vendor_id} onChange={e => setForm({...form, vendor_id: e.target.value})}>
                      <option value="">Select vendor</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Total Rows</label><input type="number" className="form-control" value={form.total_rows} onChange={e => setForm({...form, total_rows: e.target.value})} /></div>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Import will be processed asynchronously. Status will update automatically.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Import</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
