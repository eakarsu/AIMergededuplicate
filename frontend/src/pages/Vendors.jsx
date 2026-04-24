import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Users, Plus, X, Edit2, Trash2, Star } from 'lucide-react';
import Toast from '../components/Toast';

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', contact_email: '', phone: '', address: '', status: 'active', reliability_score: '' });

  const load = async () => {
    setLoading(true);
    try { setVendors(await api.getVendors()); } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSelect = async (vendor) => {
    try {
      const detail = await api.getVendor(vendor.id);
      setSelected(detail);
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await api.updateVendor(editItem.id, form); setToast({ message: 'Vendor updated', type: 'success' }); }
      else { await api.createVendor(form); setToast({ message: 'Vendor created', type: 'success' }); }
      setShowForm(false); setEditItem(null); load();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this vendor?')) return;
    try { await api.deleteVendor(id); setToast({ message: 'Vendor deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ message: err.message, type: 'error' }); }
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
        <div><h2>Vendors</h2><p>{vendors.length} vendors registered</p></div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> New Vendor</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Email</th><th>Phone</th><th>Reliability</th><th>Products</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7}><div className="loading"><div className="spinner" />Loading...</div></td></tr> :
              vendors.map(v => (
                <tr key={v.id} onClick={() => handleSelect(v)}>
                  <td style={{ fontFamily: 'monospace' }}>{v.code}</td>
                  <td style={{ fontWeight: 500 }}>{v.name}</td>
                  <td>{v.contact_email || '-'}</td>
                  <td>{v.phone || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Star size={14} fill={parseFloat(v.reliability_score) >= 4 ? '#f59e0b' : 'none'} color="#f59e0b" />
                      <span style={{ fontWeight: 600 }}>{parseFloat(v.reliability_score).toFixed(1)}</span>
                    </div>
                  </td>
                  <td>{v.total_products}</td>
                  <td><span className={`badge badge-${v.status === 'active' ? 'success' : 'gray'}`}>{v.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            <div className="detail-field"><label>Reliability Score</label><span style={{ fontSize: 20, fontWeight: 700 }}>{parseFloat(selected.reliability_score).toFixed(2)} / 5.00</span></div>
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
                  <div className="form-group"><label>Reliability Score</label><input type="number" step="0.01" min="0" max="5" className="form-control" value={form.reliability_score} onChange={e => setForm({...form, reliability_score: e.target.value})} /></div>
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
