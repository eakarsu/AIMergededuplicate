import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Sparkles, Copy, GitMerge, TrendingUp } from 'lucide-react';
import AiResultDisplay from '../components/AiResultDisplay';
import Toast from '../components/Toast';

const tools = [
  { id: 'detect-duplicates', icon: Copy, title: 'Detect Duplicates', desc: 'Find candidate duplicates for a product and rank matches.', color: '#06b6d4' },
  { id: 'merge-rules-suggest', icon: GitMerge, title: 'Merge Rules Suggester', desc: 'Suggest field-by-field merge rules across selected product IDs.', color: '#8b5cf6' },
  { id: 'pricing-trend-analyzer', icon: TrendingUp, title: 'Pricing Trend Analyzer', desc: 'Analyze price history for a product, detect anomalies and forecast.', color: '#f97316' },
];

export default function AiAdvancedTools() {
  const [activeTool, setActiveTool] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productIds, setProductIds] = useState('');
  const [trendDays, setTrendDays] = useState('90');
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.getProducts({ limit: 100 }).then(d => setProducts(d.products || [])).catch(console.error);
  }, []);

  const runTool = async () => {
    setLoading(true);
    setAiResult(null);
    try {
      let result;
      if (activeTool === 'detect-duplicates') {
        if (!selectedProduct) throw new Error('Select a product');
        result = await api.detectDuplicatesAi(parseInt(selectedProduct));
      } else if (activeTool === 'merge-rules-suggest') {
        const ids = productIds
          .split(/[\s,]+/)
          .map(s => parseInt(s.trim()))
          .filter(n => !isNaN(n));
        if (ids.length < 2) throw new Error('Provide at least 2 product IDs');
        result = await api.suggestMergeRules(ids);
      } else if (activeTool === 'pricing-trend-analyzer') {
        if (!selectedProduct) throw new Error('Select a product');
        result = await api.pricingTrendAnalyzer(parseInt(selectedProduct), parseInt(trendDays) || 90);
      }
      setAiResult(result);
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>AI Advanced Tools</h2>
          <p>Duplicate detection and merge planning powered by AI.</p>
        </div>
      </div>

      <div className="feature-grid" style={{ marginBottom: 24, marginTop: 0 }}>
        {tools.map(t => (
          <div
            key={t.id}
            className={`feature-card ${activeTool === t.id ? 'active' : ''}`}
            onClick={() => { setActiveTool(t.id); setAiResult(null); }}
            style={activeTool === t.id ? { borderColor: t.color, boxShadow: `0 0 0 2px ${t.color}20` } : {}}
          >
            <div className="feature-card-icon" style={{ background: `${t.color}15` }}>
              <t.icon size={24} color={t.color} />
            </div>
            <h4>{t.title}</h4>
            <p>{t.desc}</p>
          </div>
        ))}
      </div>

      {activeTool && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3>{tools.find(t => t.id === activeTool)?.title}</h3>
          </div>
          <div className="card-body">
            {activeTool === 'detect-duplicates' ? (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label>Source Product</label>
                  <select className="form-control" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
                    <option value="">Choose a product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                </div>
                <button className="btn btn-primary" onClick={runTool} disabled={loading || !selectedProduct}>
                  <Sparkles size={16} /> {loading ? 'Processing...' : 'Detect Duplicates'}
                </button>
              </div>
            ) : activeTool === 'pricing-trend-analyzer' ? (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label>Source Product</label>
                  <select className="form-control" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
                    <option value="">Choose a product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0, width: 120 }}>
                  <label>Lookback days</label>
                  <input className="form-control" type="number" value={trendDays} onChange={e => setTrendDays(e.target.value)} />
                </div>
                <button className="btn btn-primary" onClick={runTool} disabled={loading || !selectedProduct}>
                  <Sparkles size={16} /> {loading ? 'Processing...' : 'Analyze Trends'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label>Product IDs (comma- or space-separated)</label>
                  <input
                    className="form-control"
                    value={productIds}
                    onChange={e => setProductIds(e.target.value)}
                    placeholder="e.g. 12, 14, 27"
                  />
                </div>
                <button className="btn btn-primary" onClick={runTool} disabled={loading || !productIds.trim()}>
                  <Sparkles size={16} /> {loading ? 'Processing...' : 'Suggest Merge Rules'}
                </button>
              </div>
            )}

            {aiResult && (
              <AiResultDisplay
                title={tools.find(t => t.id === activeTool)?.title + ' Result'}
                data={aiResult.analysis || aiResult.ai_result || aiResult.result || aiResult}
                model={aiResult.model}
                usage={aiResult.usage}
              />
            )}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
