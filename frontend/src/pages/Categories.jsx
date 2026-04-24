import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FolderTree, Plus, X, Edit2, Trash2, Sparkles } from 'lucide-react';
import AiResultDisplay from '../components/AiResultDisplay';
import Toast from '../components/Toast';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [catSuggestName, setCatSuggestName] = useState('');
  const [form, setForm] = useState({ name: '', slug: '', parent_id: '', description: '', status: 'active' });

  const load = async () => {
    setLoading(true);
    try { setCategories(await api.getCategories()); } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSelect = async (cat) => {
    try { setSelected(await api.getCategory(cat.id)); } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await api.updateCategory(editItem.id, form); setToast({ message: 'Category updated', type: 'success' }); }
      else { await api.createCategory(form); setToast({ message: 'Category created', type: 'success' }); }
      setShowForm(false); setEditItem(null); load();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return;
    try { await api.deleteCategory(id); setToast({ message: 'Category deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const openEdit = (item) => {
    setForm({ name: item.name, slug: item.slug, parent_id: item.parent_id || '', description: item.description || '', status: item.status });
    setEditItem(item); setShowForm(true);
  };

  const openNew = () => {
    setForm({ name: '', slug: '', parent_id: '', description: '', status: 'active' });
    setEditItem(null); setShowForm(true);
  };

  const suggestCategory = async () => {
    if (!catSuggestName) return;
    setAiLoading(true);
    try {
      const result = await api.suggestCategory(catSuggestName, '');
      setAiResult(result);
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setAiLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>Categories</h2><p>{categories.length} categories</p></div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> New Category</button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3>AI Category Suggestion</h3></div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10, marginBottom: aiResult ? 16 : 0 }}>
            <input className="form-control" style={{ maxWidth: 400 }} placeholder="Enter product name..." value={catSuggestName} onChange={e => setCatSuggestName(e.target.value)} />
            <button className="btn btn-primary" onClick={suggestCategory} disabled={aiLoading || !catSuggestName}>
              <Sparkles size={16} /> {aiLoading ? 'Analyzing...' : 'Suggest Category'}
            </button>
          </div>
          {aiResult && <AiResultDisplay title="AI Category Suggestion" data={aiResult.ai_result} model={aiResult.model} usage={aiResult.usage} />}
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Slug</th><th>Description</th><th>Products</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5}><div className="loading"><div className="spinner" />Loading...</div></td></tr> :
              categories.map(c => (
                <tr key={c.id} onClick={() => handleSelect(c)}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.slug}</td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description || '-'}</td>
                  <td>{c.product_count}</td>
                  <td><span className={`badge badge-${c.status === 'active' ? 'success' : 'gray'}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="detail-panel">
          <div className="detail-header">
            <div><h3>{selected.name}</h3></div>
            <button className="btn btn-icon btn-secondary" onClick={() => setSelected(null)}><X size={18} /></button>
          </div>
          <div className="detail-body">
            <div className="detail-field"><label>Slug</label><span>{selected.slug}</span></div>
            <div className="detail-field"><label>Description</label><span>{selected.description || '-'}</span></div>
            <div className="detail-field"><label>Product Count</label><span>{selected.product_count}</span></div>
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
            <div className="modal-header"><h3>{editItem ? 'Edit Category' : 'New Category'}</h3><button className="btn btn-icon btn-secondary" onClick={() => setShowForm(false)}><X size={18} /></button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Name *</label><input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                  <div className="form-group"><label>Slug *</label><input className="form-control" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} required /></div>
                </div>
                <div className="form-group"><label>Description</label><textarea className="form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
                <div className="form-row">
                  <div className="form-group"><label>Parent Category</label>
                    <select className="form-control" value={form.parent_id} onChange={e => setForm({...form, parent_id: e.target.value})}>
                      <option value="">None (Top Level)</option>
                      {categories.filter(c => c.id !== editItem?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Status</label>
                    <select className="form-control" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                      <option value="active">Active</option><option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
