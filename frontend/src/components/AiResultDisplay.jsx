import React from 'react';
import { Sparkles } from 'lucide-react';

export default function AiResultDisplay({ title, data, model, usage }) {
  if (!data) return null;

  const renderValue = (value, depth = 0) => {
    if (value === null || value === undefined) return <span style={{ color: '#94a3b8' }}>N/A</span>;
    if (typeof value === 'boolean') return <span className={`badge ${value ? 'badge-success' : 'badge-danger'}`}>{value ? 'Yes' : 'No'}</span>;
    if (typeof value === 'number') return <span style={{ fontWeight: 600, color: '#6366f1', fontSize: 16 }}>{value}</span>;
    if (typeof value === 'string') return <span>{value}</span>;
    if (Array.isArray(value)) {
      return (
        <ul style={{ margin: 0, padding: 0 }}>
          {value.map((item, i) => (
            <li key={i}>
              {typeof item === 'object' ? renderValue(item, depth + 1) : item}
            </li>
          ))}
        </ul>
      );
    }
    if (typeof value === 'object') {
      return (
        <div style={{ display: 'grid', gap: 12, marginTop: depth > 0 ? 8 : 0 }}>
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="ai-field">
              <div className="ai-field-label">{formatLabel(k)}</div>
              <div className="ai-field-value">{renderValue(v, depth + 1)}</div>
              {typeof v === 'number' && k.includes('score') && renderScoreBar(v, k)}
              {typeof v === 'number' && k.includes('confidence') && renderScoreBar(v * 100, k)}
            </div>
          ))}
        </div>
      );
    }
    return <span>{String(value)}</span>;
  };

  const renderScoreBar = (value, key) => {
    const max = key.includes('confidence') && value <= 1 ? 100 : key.includes('score') && value <= 5 ? 500 / 100 : 100;
    const pct = key.includes('score') && value <= 5 ? (value / 5) * 100 : value;
    const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
    return (
      <div className="ai-score-bar">
        <div className="ai-score-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
    );
  };

  const formatLabel = (key) => key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();

  const displayData = typeof data === 'string' ? { response: data } : data;

  return (
    <div className="ai-result">
      <div className="ai-result-header">
        <Sparkles size={18} />
        <h4>{title || 'AI Analysis Result'}</h4>
        {model && <span className="model-badge">{model}</span>}
      </div>
      <div className="ai-result-body">
        {renderValue(displayData)}
      </div>
      {usage && (
        <div className="ai-usage">
          {usage.prompt_tokens && <span>Prompt: {usage.prompt_tokens} tokens</span>}
          {usage.completion_tokens && <span>Completion: {usage.completion_tokens} tokens</span>}
          {usage.total_tokens && <span>Total: {usage.total_tokens} tokens</span>}
        </div>
      )}
    </div>
  );
}
