import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function QualityReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getQualityReports().then(data => { setReports(data); setLoading(false); }).catch(console.error);
  }, []);

  const latestReports = {};
  reports.forEach(r => {
    if (!latestReports[r.report_type] || new Date(r.created_at) > new Date(latestReports[r.report_type].created_at)) {
      latestReports[r.report_type] = r;
    }
  });

  const getIcon = (type) => {
    switch(type) {
      case 'completeness': return CheckCircle;
      case 'consistency': return AlertTriangle;
      case 'accuracy': return ShieldCheck;
      case 'duplicates': return XCircle;
      default: return ShieldCheck;
    }
  };

  const getColor = (score) => score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <div className="page-header">
        <div><h2>Data Quality Reports</h2><p>Monitor your catalog data health</p></div>
      </div>

      <div className="dashboard-grid">
        {Object.entries(latestReports).map(([type, report]) => {
          const Icon = getIcon(type);
          const color = getColor(parseFloat(report.score));
          return (
            <div key={type} className="stat-card">
              <div className="stat-card-icon" style={{ background: `${color}15`, color }}><Icon size={22} /></div>
              <h4>{type.charAt(0).toUpperCase() + type.slice(1)}</h4>
              <div className="stat-value" style={{ color }}>{parseFloat(report.score).toFixed(1)}%</div>
              <div className="ai-score-bar" style={{ marginTop: 8 }}>
                <div className="ai-score-fill" style={{ width: `${report.score}%`, background: color }} />
              </div>
              <div className="stat-detail">{report.issues_found} issues in {report.total_products} products</div>
            </div>
          );
        })}
      </div>

      {Object.entries(latestReports).map(([type, report]) => {
        const details = report.details || {};
        return (
          <div key={type} className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h3>{type.charAt(0).toUpperCase() + type.slice(1)} Report</h3>
              <span style={{ fontSize: 12, color: '#64748b' }}>{new Date(report.created_at).toLocaleString()}</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {Object.entries(details).map(([key, value]) => (
                  <div key={key} style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', marginBottom: 4 }}>
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: value > 0 ? '#ef4444' : '#10b981' }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <div className="card">
        <div className="card-header"><h3>Report History</h3></div>
        <div className="table-container">
          <table>
            <thead><tr><th>Type</th><th>Score</th><th>Products</th><th>Issues</th><th>Date</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5}><div className="loading"><div className="spinner" />Loading...</div></td></tr> :
              reports.map(r => (
                <tr key={r.id}>
                  <td><span className="badge badge-purple">{r.report_type}</span></td>
                  <td>
                    <span style={{ fontWeight: 600, color: getColor(parseFloat(r.score)) }}>{parseFloat(r.score).toFixed(1)}%</span>
                  </td>
                  <td>{r.total_products}</td>
                  <td>{r.issues_found}</td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
