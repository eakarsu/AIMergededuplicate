import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Copy, X, GitMerge, XCircle, Sparkles, Search, Zap } from 'lucide-react';
import AiResultDisplay from '../components/AiResultDisplay';
import Toast from '../components/Toast';

export default function Duplicates() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('');
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState('');
  const [detectMode, setDetectMode] = useState(false);
  const [detectResult, setDetectResult] = useState(null);
  const [products, setProducts] = useState([]);
  const [pid1, setPid1] = useState('');
  const [pid2, setPid2] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [data, prods] = await Promise.all([api.getDuplicates(filter), api.getProducts({ limit: 100 })]);
      setGroups(data);
      setProducts(prods.products);
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleSelect = async (group) => {
    try { setSelected(await api.getDuplicate(group.id)); setAiResult(null); }
    catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const handleMerge = async (primaryId) => {
    if (!confirm('Merge products into this primary? Other items will be marked as merged.')) return;
    try {
      await api.mergeDuplicates(selected.id, primaryId);
      setToast({ message: 'Products merged successfully!', type: 'success' });
      setSelected(null);
      load();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const handleDismiss = async (id) => {
    try { await api.dismissDuplicate(id); setToast({ message: 'Group dismissed', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const getAiSuggestion = async () => {
    setAiLoading('merge');
    try {
      const result = await api.getAiMergeSuggestion(selected.id);
      setAiResult(result);
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setAiLoading('');
  };

  const runDetect = async () => {
    if (!pid1 || !pid2) return;
    setAiLoading('detect');
    try {
      const result = await api.detectDuplicates(parseInt(pid1), parseInt(pid2));
      setDetectResult(result);
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setAiLoading('');
  };

  const runAutoDetect = async () => {
    setAiLoading('auto');
    try {
      const result = await api.autoDetect();
      setDetectResult({ auto: true, ...result });
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setAiLoading('');
  };

  const getConfidenceClass = (c) => c >= 85 ? 'confidence-high' : c >= 70 ? 'confidence-medium' : 'confidence-low';

  return (
    <div>
      <div className="page-header">
        <div><h2>Duplicate Detection</h2><p>{groups.length} duplicate groups found</p></div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => setDetectMode(!detectMode)}>
            <Search size={16} /> {detectMode ? 'View Groups' : 'Detect Duplicates'}
          </button>
          <button className="btn btn-primary" onClick={runAutoDetect} disabled={aiLoading === 'auto'}>
            <Zap size={16} /> {aiLoading === 'auto' ? 'Scanning...' : 'Auto-Detect'}
          </button>
        </div>
      </div>

      {detectMode && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3>AI Duplicate Detection</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'end' }}>
              <div className="form-group" style={{ margin: 0, flex: 1 }}>
                <label>Product 1</label>
                <select className="form-control" value={pid1} onChange={e => setPid1(e.target.value)}>
                  <option value="">Select product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, flex: 1 }}>
                <label>Product 2</label>
                <select className="form-control" value={pid2} onChange={e => setPid2(e.target.value)}>
                  <option value="">Select product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <button className="btn btn-primary" onClick={runDetect} disabled={aiLoading === 'detect' || !pid1 || !pid2}>
                <Sparkles size={16} /> {aiLoading === 'detect' ? 'Detecting...' : 'Compare'}
              </button>
            </div>
            {detectResult && !detectResult.auto && (
              <AiResultDisplay title="Duplicate Detection Result" data={detectResult.ai_analysis} model={detectResult.model} usage={detectResult.usage} />
            )}
            {detectResult && detectResult.auto && (
              <div>
                <p style={{ fontWeight: 600, marginBottom: 12 }}>Found {detectResult.count} potential duplicate pairs</p>
                {detectResult.potential_duplicates?.slice(0, 10).map((d, i) => (
                  <div key={i} style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>{d.product1.name}</strong> vs <strong>{d.product2.name}</strong></span>
                      <span className="badge badge-warning">{(d.similarity * 100).toFixed(0)}% similar</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      {d.product1.sku} | {d.product2.sku} | Brand: {d.product1.brand}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Groups</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Group Name</th><th>Products</th><th>Confidence</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5}><div className="loading"><div className="spinner" />Loading...</div></td></tr> :
              groups.map(g => (
                <tr key={g.id} onClick={() => handleSelect(g)}>
                  <td style={{ fontWeight: 500 }}>{g.name}</td>
                  <td>{g.products?.length || 0} items</td>
                  <td>
                    <div className="confidence-meter">
                      <div className="confidence-bar"><div className={`confidence-fill ${getConfidenceClass(g.confidence)}`} style={{ width: `${g.confidence}%` }} /></div>
                      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 40 }}>{parseFloat(g.confidence).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td><span className={`badge badge-${g.status === 'pending' ? 'warning' : g.status === 'resolved' ? 'success' : 'gray'}`}>{g.status}</span></td>
                  <td>{new Date(g.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="detail-panel" style={{ width: 600 }}>
          <div className="detail-header">
            <div><h3>{selected.name}</h3><span className={`badge badge-${selected.status === 'pending' ? 'warning' : selected.status === 'resolved' ? 'success' : 'gray'}`}>{selected.status}</span></div>
            <button className="btn btn-icon btn-secondary" onClick={() => { setSelected(null); setAiResult(null); }}><X size={18} /></button>
          </div>
          <div className="detail-body">
            <div className="detail-field"><label>Confidence</label>
              <div className="confidence-meter" style={{ maxWidth: 300 }}>
                <div className="confidence-bar"><div className={`confidence-fill ${getConfidenceClass(selected.confidence)}`} style={{ width: `${selected.confidence}%` }} /></div>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{parseFloat(selected.confidence).toFixed(1)}%</span>
              </div>
            </div>
            {selected.ai_reasoning && <div className="detail-field"><label>AI Reasoning</label><span>{selected.ai_reasoning}</span></div>}

            <h4 style={{ fontSize: 14, fontWeight: 600, margin: '20px 0 12px' }}>Products in Group</h4>
            <div className="compare-grid">
              {selected.items?.map((item, idx) => (
                <div key={item.product_id} className={`compare-card ${item.is_primary ? 'primary' : ''}`}>
                  {item.is_primary && <span className="badge badge-success" style={{ marginBottom: 8 }}>Primary</span>}
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{item.name}</h4>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    <div>SKU: <strong>{item.sku}</strong></div>
                    <div>Brand: {item.brand || '-'}</div>
                    <div>Price: <strong>${parseFloat(item.price).toFixed(2)}</strong></div>
                    <div>Stock: {item.stock_quantity}</div>
                    <div>Vendor: {item.vendor_name || '-'}</div>
                    <div>Quality: {parseFloat(item.quality_score).toFixed(1)}/5</div>
                  </div>
                  {selected.status === 'pending' && (
                    <button className="btn btn-success btn-sm" style={{ marginTop: 10, width: '100%' }} onClick={() => handleMerge(item.product_id)}>
                      <GitMerge size={14} /> Merge Into This
                    </button>
                  )}
                </div>
              ))}
            </div>

            {selected.status === 'pending' && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={getAiSuggestion} disabled={aiLoading === 'merge'}>
                  <Sparkles size={16} /> {aiLoading === 'merge' ? 'Analyzing...' : 'AI Merge Suggestion'}
                </button>
                <button className="btn btn-secondary" onClick={() => handleDismiss(selected.id)}>
                  <XCircle size={16} /> Dismiss
                </button>
              </div>
            )}

            {aiResult && (
              <div style={{ marginTop: 16 }}>
                <AiResultDisplay title="AI Merge Suggestion" data={aiResult.ai_suggestion} model={aiResult.model} usage={aiResult.usage} />
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
