import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { GitMerge, X } from 'lucide-react';

export default function MergeHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.getMergeHistory().then(data => { setHistory(data); setLoading(false); }).catch(console.error);
  }, []);

  return (
    <div>
      <div className="page-header">
        <div><h2>Merge History</h2><p>{history.length} merge operations recorded</p></div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Source ID</th><th>Target Product</th><th>Group</th><th>Merged By</th><th>Date</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5}><div className="loading"><div className="spinner" />Loading...</div></td></tr> :
              history.length === 0 ? <tr><td colSpan={5}><div className="empty-state"><GitMerge size={48} /><h4>No merge history yet</h4><p>Merge duplicate products to see history here</p></div></td></tr> :
              history.map(h => (
                <tr key={h.id} onClick={() => setSelected(h)}>
                  <td>#{h.source_product_id}</td>
                  <td style={{ fontWeight: 500 }}>{h.target_product_name || `#${h.target_product_id}`}</td>
                  <td>{h.group_name || '-'}</td>
                  <td>{h.merged_by_name || '-'}</td>
                  <td>{new Date(h.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="detail-panel">
          <div className="detail-header">
            <div><h3>Merge #{selected.id}</h3></div>
            <button className="btn btn-icon btn-secondary" onClick={() => setSelected(null)}><X size={18} /></button>
          </div>
          <div className="detail-body">
            <div className="detail-field"><label>Source Product ID</label><span>#{selected.source_product_id}</span></div>
            <div className="detail-field"><label>Target Product</label><span>{selected.target_product_name || `#${selected.target_product_id}`}</span></div>
            <div className="detail-field"><label>Duplicate Group</label><span>{selected.group_name || '-'}</span></div>
            <div className="detail-field"><label>Merged By</label><span>{selected.merged_by_name || '-'}</span></div>
            <div className="detail-field"><label>Date</label><span>{new Date(selected.created_at).toLocaleString()}</span></div>
            {selected.merge_data && (
              <div className="detail-field">
                <label>Merge Data</label>
                <div className="ai-result" style={{ marginTop: 8 }}>
                  <div className="ai-result-header" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                    <GitMerge size={18} />
                    <h4>Merge Details</h4>
                  </div>
                  <div className="ai-result-body">
                    {Object.entries(typeof selected.merge_data === 'string' ? JSON.parse(selected.merge_data) : selected.merge_data).map(([k, v]) => (
                      <div key={k} className="ai-field">
                        <div className="ai-field-label">{k.replace(/_/g, ' ')}</div>
                        <div className="ai-field-value">{typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
