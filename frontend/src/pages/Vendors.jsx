import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Users, Plus, X, Edit2, Trash2, Star, RefreshCw } from 'lucide-react';
import Toast from '../components/Toast';

function ReliabilityBar({ score }) {
  const pct = Math.min(100, Math.max(0, (parseFloat(score) / 5) * 100));
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
  const stars = Math.round(parseFloat(score));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 80, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <div style={{ display: 'flex', gap: 1 }}>
        {[1,2,3,4,5].map(i => (
          <Star key={i} size={10} fill={i <= stars ? '#f59e0b' : 'none'} color="#f59e0b" />
        ))}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color }}>{parseFloat(score).toFixed(1)}</span>
    </div>
  );
}

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [updatingScore, setUpdatingScore] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', contact_email: '', phone: '', address: '', status: 'active', reliability_score: '' });

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const data = await api.getVendors({ page: p, limit: 25 });
      setVendors(data.data || data);
      setTotal(data.total || (data.data || data).length);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSelect = async (vendor) => {
    try { setSelected(await api.getVendor(vendor.id)); }
    catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await api.updateVendor(editItem.id, form); setToast({ message: 'Vendor updated', type: 'success' }); }
      else { await api.createVendor(form); setToast({ message: 'Vendor created', type: 'success' }); }
      setShowForm(false); setEditItem(null); load(page);
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this vendor?')) return;
    try { await api.deleteVendor(id); setToast({ message: 'Vendor deleted', type: 'success' }); setSelected(null); load(page); }
    catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const updateScore = async (vendorId) => {
    setUpdatingScore(vendorId);
    try {
      const result = await api.updateVendorReliability(vendorId);
      setToast({ message: `Reliability updated: ${result.new_reliability_score.toFixed(2)}/5.00`, type: 'success' });
      load(page);
      if (selected?.id === vendorId) setSelected({ ...selected, reliability_score: result.new_reliability_score });
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setUpdatingScore(null);
  };

  const openEdit = (item) => {
    setForm({ name: item.name, code: item.code, contact_email: item.contact_email || '', phone: item.phone || '', address: item.address || '', status: item.status, reliability_score: item.reliability_score || '' });
    setEditItem(item); setShowForm(true);
  };

  const openNew = () => {
    setForm({ name: '', code: '', contact_email: '', phone: '', address: '', status: 'active', reliability_score: '' });
    setEditItem(null); setShowForm(true);
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>Vendors</h2><p>{total} vendors registered</p></div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> New Vendor</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Email</th><th>Phone</th><th>Reliability</th><th>Products</th><th>Status</th><th>Score</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8}><div className="loading"><div className="spinner" />Loading...</div></td></tr> :
              vendors.map(v => (
                <tr key={v.id} onClick={() => handleSelect(v)}>
                  <td style={{ fontFamily: 'monospace' }}>{v.code}</td>
                  <td style={{ fontWeight: 500 }}>{v.name}</td>
                  <td>{v.contact_email || '-'}</td>
                  <td>{v.phone || '-'}</td>
                  <td><ReliabilityBar score={v.reliability_score || 0} /></td>
                  <td>{v.total_products || 0}</td>
                  <td><span className={`badge badge-${v.status === 'active' ? 'success' : 'gray'}`}>{v.status}</span></td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11, padding: '2px 8px' }}
                      disabled={updatingScore === v.id}
                      onClick={(e) => { e.stopPropagation(); updateScore(v.id); }}
                    >
                      <RefreshCw size={10} /> {updatingScore === v.id ? '...' : 'Update'}
                    </button>
                  </td>
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
            <div><h3>{selected.name}</h3><span className="badge badge-info">{selected.code}</span></div>
            <button className="btn btn-icon btn-secondary" onClick={() => setSelected(null)}><X size={18} /></button>
          </div>
          <div className="detail-body">
            <div className="detail-field"><label>Contact Email</label><span>{selected.contact_email || '-'}</span></div>
            <div className="detail-field"><label>Phone</label><span>{selected.phone || '-'}</span></div>
            <div className="detail-field"><label>Address</label><span>{selected.address || '-'}</span></div>
            <div className="detail-field">
              <label>Reliability Score</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20, fontWeight: 700 }}>{parseFloat(selected.reliability_score || 0).toFixed(2)} / 5.00</span>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={updatingScore === selected.id}
                  onClick={() => updateScore(selected.id)}
                >
                  <RefreshCw size={12} /> {updatingScore === selected.id ? 'Updating...' : 'Update Score'}
                </button>
              </div>
              <div style={{ marginTop: 8 }}><ReliabilityBar score={selected.reliability_score || 0} /></div>
            </div>
            <div className="detail-field"><label>Status</label><span className={`badge badge-${selected.status === 'active' ? 'success' : 'gray'}`}>{selected.status}</span></div>
            {selected.products && selected.products.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b' }}>Products ({selected.products.length})</label>
                <div style={{ marginTop: 8, maxHeight: 300, overflow: 'auto' }}>
                  {selected.products.map(p => (
                    <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                      <strong>{p.name}</strong> <span style={{ color: '#94a3b8' }}>({p.sku})</span>
                      <span style={{ float: 'right', fontWeight: 600 }}>${parseFloat(p.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="detail-actions">
            <button className="btn btn-secondary" onClick={() => openEdit(selected)}><Edit2 size={14} /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}><Trash2 size={14} /> Delete</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{editItem ? 'Edit Vendor' : 'New Vendor'}</h3><button className="btn btn-icon btn-secondary" onClick={() => setShowForm(false)}><X size={18} /></button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Name *</label><input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                  <div className="form-group"><label>Code *</label><input className="form-control" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Email</label><input type="email" className="form-control" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} /></div>
                  <div className="form-group"><label>Phone</label><input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                </div>
                <div className="form-group"><label>Address</label><textarea className="form-control" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                <div className="form-row">
                  <div className="form-group"><label>Status</label><select className="form-control" value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
