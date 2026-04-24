import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Sparkles, FileText, Tag, DollarSign, ShieldCheck } from 'lucide-react';
import AiResultDisplay from '../components/AiResultDisplay';
import Toast from '../components/Toast';

const tools = [
  { id: 'description', icon: FileText, title: 'Description Generator', desc: 'Generate SEO-optimized product descriptions using AI', color: '#6366f1' },
  { id: 'category', icon: Tag, title: 'Category Suggestion', desc: 'AI suggests the best category for your products', color: '#10b981' },
  { id: 'price', icon: DollarSign, title: 'Price Optimization', desc: 'Get AI-powered pricing strategy recommendations', color: '#f59e0b' },
  { id: 'quality', icon: ShieldCheck, title: 'Quality Analysis', desc: 'Analyze product data quality with AI scoring', color: '#ef4444' },
];

export default function AiTools() {
  const [activeTool, setActiveTool] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.getProducts({ limit: 100 }).then(d => setProducts(d.products)).catch(console.error);
    api.getAiJobs().then(setJobs).catch(console.error);
  }, []);

  const runTool = async () => {
    setLoading(true);
    setAiResult(null);
    try {
      let result;
      if (activeTool === 'description') result = await api.generateDescription(parseInt(selectedProduct));
      else if (activeTool === 'category') result = await api.suggestCategory(catName, catDesc);
      else if (activeTool === 'price') result = await api.optimizePrice(parseInt(selectedProduct));
      else if (activeTool === 'quality') result = await api.analyzeQuality(parseInt(selectedProduct));
      setAiResult(result);
      api.getAiJobs().then(setJobs).catch(console.error);
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>AI Tools</h2><p>Powered by OpenRouter - {process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5'}</p></div>
      </div>

      <div className="feature-grid" style={{ marginBottom: 24, marginTop: 0 }}>
        {tools.map(t => (
          <div key={t.id} className={`feature-card ${activeTool === t.id ? 'active' : ''}`}
            onClick={() => { setActiveTool(t.id); setAiResult(null); }}
            style={activeTool === t.id ? { borderColor: t.color, boxShadow: `0 0 0 2px ${t.color}20` } : {}}>
            <div className="feature-card-icon" style={{ background: `${t.color}15` }}><t.icon size={24} color={t.color} /></div>
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
            {activeTool === 'category' ? (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label>Product Name</label>
                  <input className="form-control" value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g., Wireless Bluetooth Headphones" />
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label>Description (optional)</label>
                  <input className="form-control" value={catDesc} onChange={e => setCatDesc(e.target.value)} placeholder="Brief product description" />
                </div>
                <button className="btn btn-primary" onClick={runTool} disabled={loading || !catName}>
                  <Sparkles size={16} /> {loading ? 'Processing...' : 'Analyze'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label>Select Product</label>
                  <select className="form-control" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
                    <option value="">Choose a product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                </div>
                <button className="btn btn-primary" onClick={runTool} disabled={loading || !selectedProduct}>
                  <Sparkles size={16} /> {loading ? 'Processing...' : 'Analyze'}
                </button>
              </div>
            )}

            {aiResult && (
              <AiResultDisplay
                title={tools.find(t => t.id === activeTool)?.title + ' Result'}
                data={aiResult.ai_result}
                model={aiResult.model}
                usage={aiResult.usage}
              />
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3>Recent AI Jobs</h3></div>
        <div className="table-container">
          <table>
            <thead><tr><th>Type</th><th>Status</th><th>Model</th><th>Tokens</th><th>Date</th></tr></thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id} onClick={() => {
                  if (j.output_data) setAiResult({ ai_result: j.output_data, model: j.model, usage: { total_tokens: j.tokens_used } });
                }}>
                  <td><span className="badge badge-purple">{j.job_type.replace(/_/g, ' ')}</span></td>
                  <td><span className={`badge badge-${j.status === 'completed' ? 'success' : j.status === 'failed' ? 'danger' : 'warning'}`}>{j.status}</span></td>
                  <td style={{ fontSize: 12 }}>{j.model || '-'}</td>
                  <td>{j.tokens_used || '-'}</td>
                  <td>{new Date(j.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
