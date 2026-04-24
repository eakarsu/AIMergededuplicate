import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Package, Search, Plus, X, Edit2, Trash2, Sparkles } from 'lucide-react';
import AiResultDisplay from '../components/AiResultDisplay';
import Toast from '../components/Toast';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState('');
  const [form, setForm] = useState({ sku: '', name: '', description: '', brand: '', category_id: '', vendor_id: '', price: '', cost: '', stock_quantity: '', weight: '', dimensions: '', barcode: '', status: 'active' });

  const load = async () => {
    setLoading(true);
    try {
      const [data, cats, vends] = await Promise.all([api.getProducts({ search }), api.getCategories(), api.getVendors()]);
      setProducts(data.products);
      setTotal(data.total);
      setCategories(cats);
      setVendors(vends);
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [search]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await api.updateProduct(editItem.id, form);
        setToast({ message: 'Product updated', type: 'success' });
      } else {
        await api.createProduct(form);
        setToast({ message: 'Product created', type: 'success' });
      }
      setShowForm(false);
      setEditItem(null);
      load();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.deleteProduct(id);
      setToast({ message: 'Product deleted', type: 'success' });
      setSelected(null);
      load();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const openEdit = (item) => {
    setForm({ sku: item.sku, name: item.name, description: item.description || '', brand: item.brand || '', category_id: item.category_id || '', vendor_id: item.vendor_id || '', price: item.price || '', cost: item.cost || '', stock_quantity: item.stock_quantity || '', weight: item.weight || '', dimensions: item.dimensions || '', barcode: item.barcode || '', status: item.status });
    setEditItem(item);
    setShowForm(true);
  };

  const openNew = () => {
    setForm({ sku: '', name: '', description: '', brand: '', category_id: '', vendor_id: '', price: '', cost: '', stock_quantity: '', weight: '', dimensions: '', barcode: '', status: 'active' });
    setEditItem(null);
    setShowForm(true);
  };

  const runAi = async (type, productId) => {
    setAiLoading(type);
    try {
      let result;
      if (type === 'description') result = await api.generateDescription(productId);
      else if (type === 'quality') result = await api.analyzeQuality(productId);
      else if (type === 'price') result = await api.optimizePrice(productId);
      setAiResult({ type, ...result });
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setAiLoading('');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Products</h2>
          <p>{total} products in catalog</p>
        </div>
        <div className="btn-group">
          <div className="search-bar">
            <Search size={18} />
            <input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> New Product</button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>SKU</th><th>Name</th><th>Brand</th><th>Category</th><th>Vendor</th><th>Price</th><th>Stock</th><th>Quality</th><th>Status</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><div className="loading"><div className="spinner" />Loading...</div></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={9}><div className="empty-state"><h4>No products found</h4></div></td></tr>
              ) : products.map((p) => (
                <tr key={p.id} onClick={() => setSelected(p)}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.sku}</td>
                  <td style={{ fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                  <td>{p.brand}</td>
                  <td>{p.category_name || '-'}</td>
                  <td>{p.vendor_name || '-'}</td>
                  <td style={{ fontWeight: 600 }}>${parseFloat(p.price).toFixed(2)}</td>
                  <td>{p.stock_quantity}</td>
                  <td>
                    <div className="quality-score">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`quality-dot ${i <= Math.round(parseFloat(p.quality_score)) ? 'filled' : 'empty'}`} />
                      ))}
                    </div>
                  </td>
                  <td><span className={`badge badge-${p.status === 'active' ? 'success' : p.status === 'merged' ? 'purple' : 'gray'}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="detail-panel">
          <div className="detail-header">
            <div>
              <h3>{selected.name}</h3>
              <span className={`badge badge-${selected.status === 'active' ? 'success' : 'gray'}`}>{selected.status}</span>
            </div>
            <button className="btn btn-icon btn-secondary" onClick={() => { setSelected(null); setAiResult(null); }}><X size={18} /></button>
          </div>
          <div className="detail-body">
            <div className="detail-field"><label>SKU</label><span>{selected.sku}</span></div>
            <div className="detail-field"><label>Brand</label><span>{selected.brand || '-'}</span></div>
            <div className="detail-field"><label>Description</label><span>{selected.description || '-'}</span></div>
            <div className="detail-field"><label>Category</label><span>{selected.category_name || '-'}</span></div>
            <div className="detail-field"><label>Vendor</label><span>{selected.vendor_name || '-'}</span></div>
            <div className="detail-field"><label>Price</label><span style={{ fontSize: 18, fontWeight: 700 }}>${parseFloat(selected.price).toFixed(2)}</span></div>
            <div className="detail-field"><label>Cost</label><span>${selected.cost ? parseFloat(selected.cost).toFixed(2) : '-'}</span></div>
            <div className="detail-field"><label>Stock</label><span>{selected.stock_quantity} units</span></div>
            <div className="detail-field"><label>Weight</label><span>{selected.weight ? `${selected.weight} lbs` : '-'}</span></div>
            <div className="detail-field"><label>Barcode</label><span style={{ fontFamily: 'monospace' }}>{selected.barcode || '-'}</span></div>
            <div className="detail-field"><label>Quality Score</label><span>{parseFloat(selected.quality_score).toFixed(2)} / 5.00</span></div>

            <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" disabled={aiLoading === 'description'} onClick={() => runAi('description', selected.id)}>
                <Sparkles size={14} /> {aiLoading === 'description' ? 'Generating...' : 'AI Description'}
              </button>
              <button className="btn btn-primary btn-sm" disabled={aiLoading === 'quality'} onClick={() => runAi('quality', selected.id)}>
                <Sparkles size={14} /> {aiLoading === 'quality' ? 'Analyzing...' : 'AI Quality'}
              </button>
              <button className="btn btn-primary btn-sm" disabled={aiLoading === 'price'} onClick={() => runAi('price', selected.id)}>
                <Sparkles size={14} /> {aiLoading === 'price' ? 'Optimizing...' : 'AI Price'}
              </button>
            </div>

            {aiResult && (
              <div style={{ marginTop: 16 }}>
                <AiResultDisplay
                  title={aiResult.type === 'description' ? 'AI Generated Description' : aiResult.type === 'quality' ? 'AI Quality Analysis' : 'AI Price Optimization'}
                  data={aiResult.ai_result}
                  model={aiResult.model}
                  usage={aiResult.usage}
                />
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
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? 'Edit Product' : 'New Product'}</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>SKU *</label><input className="form-control" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required /></div>
                  <div className="form-group"><label>Name *</label><input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                </div>
                <div className="form-group"><label>Description</label><textarea className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="form-row">
                  <div className="form-group"><label>Brand</label><input className="form-control" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
                  <div className="form-group"><label>Barcode</label><input className="form-control" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Category</label>
                    <select className="form-control" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                      <option value="">Select category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Vendor</label>
                    <select className="form-control" value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}>
                      <option value="">Select vendor</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Price</label><input type="number" step="0.01" className="form-control" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                  <div className="form-group"><label>Cost</label><input type="number" step="0.01" className="form-control" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Stock Quantity</label><input type="number" className="form-control" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} /></div>
                  <div className="form-group"><label>Weight (lbs)</label><input type="number" step="0.01" className="form-control" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Dimensions</label><input className="form-control" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} placeholder="LxWxH" /></div>
                  <div className="form-group"><label>Status</label>
                    <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
