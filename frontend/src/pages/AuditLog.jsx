import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { X } from 'lucide-react';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ entity_type: '', action: '' });

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const data = await api.getAuditLog({ ...filters, page: p, limit: 50 });
      setLogs(data.data || data);
      setTotal(data.total || (data.data || data).length);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(1); }, [filters.entity_type, filters.action]);

  const getActionColor = (action) => {
    switch(action) {
      case 'CREATE': return 'success';
      case 'UPDATE': return 'info';
      case 'DELETE': return 'danger';
      case 'MERGE': return 'purple';
      case 'DISMISS': return 'gray';
      case 'IMPORT': return 'warning';
      case 'GENERATE': return 'purple';
      default: return 'gray';
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Audit Log</h2>
          <p>Complete history of all system actions — {total} entries</p>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <select value={filters.entity_type} onChange={e => setFilters({...filters, entity_type: e.target.value})}>
          <option value="">All Entities</option>
          <option value="product">Products</option>
          <option value="vendor">Vendors</option>
          <option value="category">Categories</option>
          <option value="duplicate_group">Duplicates</option>
          <option value="duplicates">Duplicates (API)</option>
          <option value="bulk_import">Imports</option>
          <option value="ai_job">AI Jobs</option>
        </select>
        <select value={filters.action} onChange={e => setFilters({...filters, action: e.target.value})}>
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="MERGE">Merge</option>
          <option value="IMPORT">Import</option>
          <option value="GENERATE">Generate</option>
        </select>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>ID</th><th>IP</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6}><div className="loading"><div className="spinner" />Loading...</div></td></tr> :
              logs.length === 0 ? <tr><td colSpan={6}><div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No audit entries found</div></td></tr> :
              logs.map(l => (
                <tr key={l.id} onClick={() => setSelected(l)}>
                  <td style={{ fontSize: 12 }}>{new Date(l.created_at).toLocaleString()}</td>
                  <td>{l.user_name || '-'}</td>
                  <td><span className={`badge badge-${getActionColor(l.action)}`}>{l.action}</span></td>
                  <td>{l.entity_type}</td>
                  <td>#{l.entity_id}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{l.ip_address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Page {page} of {totalPages} — {total} total</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>Prev</button>
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="detail-panel">
          <div className="detail-header">
            <div><h3>Audit Entry #{selected.id}</h3></div>
            <button className="btn btn-icon btn-secondary" onClick={() => setSelected(null)}><X size={18} /></button>
          </div>
          <div className="detail-body">
            <div className="detail-field"><label>Timestamp</label><span>{new Date(selected.created_at).toLocaleString()}</span></div>
            <div className="detail-field"><label>User</label><span>{selected.user_name || '-'}</span></div>
            <div className="detail-field"><label>Action</label><span className={`badge badge-${getActionColor(selected.action)}`}>{selected.action}</span></div>
            <div className="detail-field"><label>Entity Type</label><span>{selected.entity_type}</span></div>
            <div className="detail-field"><label>Entity ID</label><span>#{selected.entity_id}</span></div>
            <div className="detail-field"><label>IP Address</label><span style={{ fontFamily: 'monospace' }}>{selected.ip_address || '-'}</span></div>
            {selected.old_data && (
              <div className="detail-field">
                <label>Previous Data</label>
                <pre style={{ background: '#fef2f2', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto', border: '1px solid #fecaca' }}>
                  {typeof selected.old_data === 'string' ? selected.old_data : JSON.stringify(selected.old_data, null, 2)}
                </pre>
              </div>
            )}
            {selected.new_data && (
              <div className="detail-field">
                <label>New Data</label>
                <pre style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto', border: '1px solid #bbf7d0' }}>
                  {typeof selected.new_data === 'string' ? selected.new_data : JSON.stringify(selected.new_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
