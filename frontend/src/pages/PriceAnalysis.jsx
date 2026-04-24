import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DollarSign, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import AiResultDisplay from '../components/AiResultDisplay';
import Toast from '../components/Toast';

export default function PriceAnalysis() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.getProducts({ limit: 100 }).then(d => setProducts(d.products)).catch(console.error);
  }, []);

  const handleSelect = async (product) => {
    setSelected(product);
    setAiResult(null);
    try {
      const history = await api.getPriceHistory(product.id);
      setPriceHistory(history);
    } catch (err) { console.error(err); }
  };

  const optimizePrice = async () => {
    setAiLoading(true);
    try {
      const result = await api.optimizePrice(selected.id);
      setAiResult(result);
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setAiLoading(false);
  };

  const margin = (p) => p.cost ? (((p.price - p.cost) / p.price) * 100).toFixed(1) : '-';

  return (
    <div>
      <div className="page-header">
        <div><h2>Price Analysis</h2><p>Track pricing trends and AI-powered optimization</p></div>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-icon green"><DollarSign size={22} /></div>
          <h4>Avg Price</h4>
          <div className="stat-value">${products.length > 0 ? (products.reduce((a, p) => a + parseFloat(p.price), 0) / products.length).toFixed(2) : '-'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue"><TrendingUp size={22} /></div>
          <h4>Highest Price</h4>
          <div className="stat-value">${products.length > 0 ? Math.max(...products.map(p => parseFloat(p.price))).toFixed(2) : '-'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange"><TrendingDown size={22} /></div>
          <h4>Lowest Price</h4>
          <div className="stat-value">${products.length > 0 ? Math.min(...products.map(p => parseFloat(p.price))).toFixed(2) : '-'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><h3>Products by Price</h3></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Product</th><th>Price</th><th>Cost</th><th>Margin</th></tr></thead>
              <tbody>
                {[...products].sort((a, b) => parseFloat(b.price) - parseFloat(a.price)).map(p => (
                  <tr key={p.id} onClick={() => handleSelect(p)} style={selected?.id === p.id ? { background: '#f0f0ff' } : {}}>
                    <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                    <td style={{ fontWeight: 600 }}>${parseFloat(p.price).toFixed(2)}</td>
                    <td>{p.cost ? `$${parseFloat(p.cost).toFixed(2)}` : '-'}</td>
                    <td><span className={`badge badge-${parseFloat(margin(p)) > 30 ? 'success' : parseFloat(margin(p)) > 15 ? 'warning' : 'danger'}`}>{margin(p)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          {selected ? (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <h3>{selected.name}</h3>
                  <button className="btn btn-primary btn-sm" onClick={optimizePrice} disabled={aiLoading}>
                    <Sparkles size={14} /> {aiLoading ? 'Analyzing...' : 'AI Optimize'}
                  </button>
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="detail-field"><label>Current Price</label><span style={{ fontSize: 24, fontWeight: 700 }}>${parseFloat(selected.price).toFixed(2)}</span></div>
                    <div className="detail-field"><label>Cost</label><span style={{ fontSize: 24, fontWeight: 700 }}>${selected.cost ? parseFloat(selected.cost).toFixed(2) : '-'}</span></div>
                    <div className="detail-field"><label>Margin</label><span style={{ fontSize: 18, fontWeight: 600, color: parseFloat(margin(selected)) > 30 ? '#10b981' : '#f59e0b' }}>{margin(selected)}%</span></div>
                    <div className="detail-field"><label>Brand</label><span>{selected.brand}</span></div>
                  </div>
                </div>
              </div>

              {priceHistory.length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-header"><h3>Price History</h3></div>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>Old Price</th><th>New Price</th><th>Change</th><th>By</th><th>Date</th></tr></thead>
                      <tbody>
                        {priceHistory.map(h => {
                          const diff = parseFloat(h.new_price) - parseFloat(h.old_price);
                          return (
                            <tr key={h.id}>
                              <td>${parseFloat(h.old_price).toFixed(2)}</td>
                              <td style={{ fontWeight: 600 }}>${parseFloat(h.new_price).toFixed(2)}</td>
                              <td>
                                <span style={{ color: diff > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                  {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                                </span>
                              </td>
                              <td>{h.changed_by}</td>
                              <td>{new Date(h.created_at).toLocaleDateString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {aiResult && <AiResultDisplay title="AI Price Optimization" data={aiResult.ai_result} model={aiResult.model} usage={aiResult.usage} />}
            </>
          ) : (
            <div className="card">
              <div className="card-body">
                <div className="empty-state">
                  <DollarSign size={48} />
                  <h4>Select a product</h4>
                  <p>Click on a product to view price history and AI optimization</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
